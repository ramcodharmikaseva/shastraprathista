const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Book = require('../models/Book');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// ✅ ADD EMAIL SERVICE IMPORT - REPLACE THE EXISTING ONE
const { 
  sendOrderConfirmationEmail, 
  sendOrderShippedEmail, 
  sendOrderDeliveredEmail, 
  sendAdminOrderNotification,
  generateTrackingNumber 
} = require('../utils/orderEmailService');

// ✅ FIXED: Proper book search without ObjectId casting issues
async function updateInventoryOnServer(orderItems) {
    try {
        const inventoryUpdates = [];
        console.log('📦 Starting inventory update for', orderItems.length, 'items');
        
        for (const item of orderItems) {
            try {
                console.log('Processing item:', item.title, 'ID:', item.id, 'Qty:', item.quantity);
                
                // ✅ FIXED: Only search by string fields, not _id
                const book = await Book.findOne({ 
                    $or: [
                        { id: item.id },  // Search by custom id field
                        { title: item.title } // Fallback to title
                    ]
                });
                
                if (!book) {
                    console.warn(`❌ Book not found in inventory: "${item.title}" (ID: ${item.id})`);
                    inventoryUpdates.push({
                        bookTitle: item.title,
                        status: 'NOT_FOUND',
                        error: 'Book not found in inventory'
                    });
                    continue;
                }
                
                // ✅ Validate we have required fields with fallbacks
                const quantity = item.quantity || 1;
                const currentStock = book.stock || 0;
                const newStock = Math.max(0, currentStock - quantity);
                
                // Update the book inventory using _id (MongoDB ObjectId)
                await Book.findByIdAndUpdate(book._id, {
                    stock: newStock,
                    lastUpdated: new Date(),
                    $inc: { sold: quantity } // Track total sales
                });
                
                console.log(`✅ Updated inventory: ${book.title}, Stock: ${currentStock} → ${newStock}`);
                
                inventoryUpdates.push({
                    bookId: book.id,
                    title: book.title,
                    quantity: quantity,
                    stockBefore: currentStock,
                    stockAfter: newStock,
                    status: 'UPDATED'
                });
                
            } catch (itemError) {
                console.error(`❌ Error processing book "${item.title}":`, itemError.message);
                inventoryUpdates.push({
                    bookTitle: item.title,
                    status: 'ERROR',
                    error: itemError.message
                });
                continue;
            }
        }
        
        console.log('📦 Inventory update completed. Processed:', inventoryUpdates.length, 'items');
        return inventoryUpdates;
        
    } catch (error) {
        console.error('❌ Inventory update failed:', error);
        throw error;
    }
}

// ✅ ADD AUTH MIDDLEWARE
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

// Add to your orders.js temporarily to check books
router.get('/debug-books', async (req, res) => {
    try {
        const books = await Book.find({}).select('id title price originalPrice stock').limit(20);
        
        console.log('=== DATABASE BOOKS DEBUG ===');
        books.forEach(book => {
            console.log(`📚 ${book.id}: "${book.title}" - Stock: ${book.stock}`);
        });
        
        res.json({
            success: true,
            totalBooks: await Book.countDocuments(),
            books: books
        });
    } catch (error) {
        console.error('Debug books error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ FIXED: Checkout endpoint - handles both logged-in and guest users WITH EMAILS
router.post('/checkout', async (req, res) => {
  try {
    // ✅ ADD DEBUG LOGGING HERE - at the very beginning
    console.log('=== CHECKOUT DEBUG ===');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    
    if (req.body.orderData && req.body.orderData.items) {
        console.log('Order items:', req.body.orderData.items.map(item => ({
            id: item.id,
            title: item.title,
            price: item.price,
            originalPrice: item.originalPrice,
            quantity: item.quantity,
            hasId: !!item.id,
            hasOriginalPrice: !!item.originalPrice
        })));
    } else {
        console.log('❌ No orderData.items found in request');
    }

    const { userEmail, userId, orderData } = req.body;
    
    console.log('📦 Checkout request received:', {
      userEmail,
      userId: userId || 'guest',
      orderId: orderData.orderId,
      customerName: orderData.customerName,
      itemsCount: orderData.items?.length || 0
    });

    // ✅ FIXED: Handle both logged-in users and guests
    let user = null;
    
    // Try to find user by ID first (for logged-in users)
    if (userId) {
      user = await User.findById(userId);
      console.log('🔍 User found by ID:', user ? user.email : 'Not found');
    }
    
    // If user not found by ID, try by email (for guest checkout or existing users)
    if (!user && userEmail) {
      user = await User.findOne({ email: userEmail });
      console.log('🔍 User found by email:', user ? user.email : 'Not found');
    }
    
    // ✅ FIXED: Create user if doesn't exist (for guest checkout)
    if (!user && userEmail) {
      console.log('👤 Creating new user for checkout...');
      user = new User({
        name: orderData.customerName,
        email: userEmail,
        phone: orderData.customerPhone || '', // Phone is optional
        // Password is optional in your model
        defaultBillingAddress: orderData.billingAddress,
        defaultShippingAddress: orderData.shippingAddress,
        role: 'user'
      });
      await user.save();
      console.log('✅ New user created during checkout:', user.email);
    }

    // ✅ FIXED: Generate order ID if not provided
    const orderId = orderData.orderId || `ORD${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

    // ✅ FIXED: Validate and prepare order data
    const orderItems = (orderData.items || []).map(item => ({
      id: item.id || item.bookId || `book_${Date.now()}_${Math.random()}`,
      title: item.title || 'Unknown Book',
      author: item.author || 'Unknown Author',
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
      originalPrice: Number(item.originalPrice) || Number(item.price) || 0,
      discount: Number(item.discount) || 0,
      image: item.image || '',
      weight: Number(item.weight) || 500,
      itemTotal: (Number(item.price) || 0) * (Number(item.quantity) || 1)
    }));

    // ✅ FIXED: Calculate totals WITHOUT tax
    const subtotal = orderData.totals?.subtotal || orderData.subtotal || orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = orderData.totals?.shipping || orderData.shipping || 0;
    const discount = orderData.totals?.discount || orderData.discount || 0;
    const tax = 0; // ✅ NO TAX
    const total = orderData.totals?.total || orderData.total || (subtotal + shipping - discount); // ✅ Remove tax from total

    // ✅ FIXED: Create order with proper structure
    const order = new Order({
      userId: user ? user._id : null, // Allow null for guest users
      orderId: orderId,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      billingAddress: orderData.billingAddress || {},
      shippingAddress: orderData.shippingAddress || orderData.billingAddress || {},
      items: orderItems,
      totals: {
        subtotal: subtotal,
        shipping: shipping,
        discount: discount,
        tax: tax, // ✅ Zero tax
        total: total
      },
      paymentMethod: orderData.paymentMethod || 'bank',
      paymentStatus: orderData.paymentStatus || 'pending',
      status: orderData.status || 'pending',
      statusHistory: orderData.statusHistory || [{
        status: 'pending',
        updatedAt: new Date(),
        notes: 'Order created'
      }],
      shippingRegion: orderData.shippingRegion,
      discountCode: orderData.discountCode,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('💾 Saving order to database...');
    await order.save();
    console.log('✅ Order created successfully:', order.orderId);

    // ✅ SEND ORDER CONFIRMATION EMAIL TO CUSTOMER
    try {
        console.log('📧 Sending order confirmation email...');
        await sendOrderConfirmationEmail(order);
        console.log('✅ Order confirmation email sent successfully');
    } catch (emailError) {
        console.error('❌ Failed to send order confirmation email:', emailError);
        // Don't fail the entire order if email fails
    }

    // ✅ SEND ADMIN NOTIFICATION EMAIL
    try {
        console.log('📧 Sending admin notification email...');
        await sendAdminOrderNotification(order);
        console.log('✅ Admin notification email sent successfully');
    } catch (adminEmailError) {
        console.error('❌ Failed to send admin notification email:', adminEmailError);
        // Don't fail the entire order if email fails
    }

    // ✅ Add order to user's order history if user exists
    if (user) {
      user.orders = user.orders || [];
      user.orders.push(order._id);
      
      // Update user's default addresses if not set
      if (!user.defaultBillingAddress && orderData.billingAddress) {
        user.defaultBillingAddress = orderData.billingAddress;
      }
      if (!user.defaultShippingAddress && orderData.shippingAddress) {
        user.defaultShippingAddress = orderData.shippingAddress;
      }
      
      await user.save();
      console.log('✅ Order added to user history');
    }

    // ✅ UPDATED: Use the new inventory management function
    console.log('📦 Updating inventory using server function...');
    let inventoryUpdates = [];
    try {
      inventoryUpdates = await updateInventoryOnServer(orderItems);
      console.log('✅ Server inventory update completed:', inventoryUpdates.length, 'items processed');
    } catch (inventoryError) {
      console.error('❌ Server inventory update failed:', inventoryError);
      // Don't fail the entire order if inventory update fails
      // Fallback to basic inventory update
      console.log('🔄 Using fallback inventory update...');
      for (const item of orderItems) {
        try {
          const updatedBook = await Book.findOneAndUpdate(
            { title: item.title },
            { 
              $inc: { 
                stock: -item.quantity,
                sold: item.quantity 
              } 
            },
            { new: true }
          );

          if (updatedBook) {
            inventoryUpdates.push({
              bookId: updatedBook._id,
              title: updatedBook.title,
              newStock: updatedBook.stock,
              quantityChanged: -item.quantity
            });
            console.log(`📚 Inventory updated: ${item.title} -> ${updatedBook.stock} remaining`);
          } else {
            console.log(`⚠️ Book not found in inventory: ${item.title}`);
          }
        } catch (fallbackError) {
          console.error(`❌ Fallback inventory update failed for ${item.title}:`, fallbackError.message);
        }
      }
    }

    console.log('✅ Checkout process completed successfully');

    res.status(201).json({ 
      success: true,
      message: '✅ Order saved successfully!', 
      orderId: order.orderId,
      order: {
        _id: order._id,
        orderId: order.orderId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        totals: order.totals,
        status: order.status,
        createdAt: order.createdAt
      },
      inventoryUpdates: inventoryUpdates,
      userProfile: user ? {
        name: user.name,
        email: user.email,
        phone: user.phone
      } : null
    });
    
  } catch (err) {
    console.error('❌ Failed to process checkout:', err);
    
    // More detailed error information
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(error => ({
        field: error.path,
        message: error.message
      }));
      
      console.error('📋 Validation errors:', validationErrors);
      
      return res.status(400).json({ 
        success: false,
        error: 'Order validation failed',
        validationErrors: validationErrors,
        details: err.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to process checkout',
      details: err.message 
    });
  }
});

// ✅ Update order status - WITH EMAIL NOTIFICATIONS
router.put('/:id/status', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, notes } = req.body;
    
    // ✅ PREVENT CONFLICT WITH RESERVED ROUTES
    const reservedRoutes = ['test', 'debug-books', 'fix-orders-tax', 'recent', 'checkout', 'verify-amounts'];
    if (reservedRoutes.includes(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID'
      });
    }
    
    let order;
    
    if (/^[0-9a-fA-F]{24}$/.test(orderId)) {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ orderId: orderId });
    }
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    const oldStatus = order.status;
    
    // Add to status history
    order.statusHistory.push({
      status: status,
      updatedAt: new Date(),
      notes: notes || `Status changed to ${status}`
    });
    
    order.status = status;
    order.updatedAt = new Date();
    
    await order.save();

    // ✅ ADD EMAIL NOTIFICATIONS BASED ON STATUS CHANGE
    try {
      if (status === 'shipped' && oldStatus !== 'shipped') {
        const trackingNumber = generateTrackingNumber();
        console.log(`📧 Sending shipped email with tracking: ${trackingNumber}`);
        const emailResult = await sendOrderShippedEmail(order, trackingNumber);
        
        // Update order with tracking number if email was successful
        if (emailResult.success) {
          order.statusHistory.push({
            status: 'shipped',
            updatedAt: new Date(),
            notes: `Tracking number: ${emailResult.trackingNumber}`
          });
          await order.save();
        }
      } else if (status === 'delivered' && oldStatus !== 'delivered') {
        console.log('📧 Sending delivered email');
        await sendOrderDeliveredEmail(order);
      } else if (status === 'confirmed' && oldStatus !== 'confirmed') {
        console.log('📧 Sending confirmation email');
        await sendOrderConfirmationEmail(order);
      }
    } catch (emailError) {
      console.error('❌ Failed to send status email:', emailError);
      // Don't fail the status update if email fails
    }
    
    res.json({
      success: true,
      message: `✅ Order status updated to ${status}`,
      order: {
        orderId: order.orderId,
        status: order.status,
        statusHistory: order.statusHistory
      }
    });
    
  } catch (err) {
    console.error('❌ Failed to update order status:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update order status' 
    });
  }
});

// ✅ Verify order amounts before payment (NO TAX)
router.post('/verify-amounts', async (req, res) => {
  try {
    const { items, shippingCost = 0, discount = 0 } = req.body;
    
    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    // ✅ NO TAX
    const tax = 0;
    
    // Calculate final total WITHOUT tax
    const total = subtotal + shippingCost - discount;
    
    // Verify all calculations are valid
    const verification = {
      subtotal: Math.round(subtotal * 100) / 100,
      shipping: Math.round(shippingCost * 100) / 100,
      tax: 0, // ✅ Zero tax
      discount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100,
      isValid: subtotal >= 0 && total >= 0
    };

    res.json({
      success: true,
      verification: verification,
      message: verification.isValid ? 
        '✅ Amounts verified successfully!' : 
        '❌ Invalid amount calculations'
    });
    
  } catch (err) {
    console.error('❌ Amount verification failed:', err);
    res.status(500).json({ 
      success: false,
      error: 'Amount verification failed',
      details: err.message 
    });
  }
});

// ✅ Create a new order with enhanced structure (NO TAX)
router.post('/', async (req, res) => {
  try {
    const orderData = req.body;
    
    // Generate order ID if not provided
    if (!orderData.orderId) {
      orderData.orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
    }
    
    // ✅ FIXED: Calculate totals WITHOUT tax
    if (!orderData.totals) {
      const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const shipping = orderData.shipping?.shippingCost || 0;
      const tax = 0; // ✅ NO TAX
      const total = subtotal + shipping; // ✅ Remove tax from total
      
      orderData.totals = {
        subtotal: subtotal,
        shipping: shipping,
        tax: tax, // ✅ Zero tax
        discount: 0,
        total: total
      };
    }

    // ✅ FIXED: Add status history if missing
    if (!orderData.statusHistory) {
      orderData.statusHistory = [{
        status: 'pending',
        updatedAt: new Date(),
        notes: 'Order created'
      }];
    }
    
    // ✅ Ensure addresses have proper structure
    if (orderData.billingAddress && typeof orderData.billingAddress === 'object') {
      orderData.billingAddress = {
        fullName: orderData.billingAddress.fullName || orderData.customerName,
        addressLine1: orderData.billingAddress.addressLine1 || orderData.billingAddress.address,
        addressLine2: orderData.billingAddress.addressLine2 || '',
        city: orderData.billingAddress.city,
        district: orderData.billingAddress.district || '',
        state: orderData.billingAddress.state,
        pincode: orderData.billingAddress.pincode,
        country: orderData.billingAddress.country || 'India',
        landmark: orderData.billingAddress.landmark || ''
      };
    }
    
    if (orderData.shippingAddress && typeof orderData.shippingAddress === 'object') {
      orderData.shippingAddress = {
        fullName: orderData.shippingAddress.fullName || orderData.customerName,
        addressLine1: orderData.shippingAddress.addressLine1 || orderData.shippingAddress.address,
        addressLine2: orderData.shippingAddress.addressLine2 || '',
        city: orderData.shippingAddress.city,
        district: orderData.shippingAddress.district || '',
        state: orderData.shippingAddress.state,
        pincode: orderData.shippingAddress.pincode,
        country: orderData.shippingAddress.country || 'India',
        landmark: orderData.shippingAddress.landmark || '',
        phone: orderData.shippingAddress.phone || orderData.customerPhone
      };
    }
    
    // ✅ Add payment status (ensure it exists)
    if (!orderData.paymentStatus) {
      orderData.paymentStatus = orderData.payment_status || 'pending';
    }
    
    const order = new Order(orderData);
    await order.save();

    // ✅ ADD ORDER CONFIRMATION EMAIL
    try {
        console.log('📧 Sending order confirmation email...');
        await sendOrderConfirmationEmail(order);
        console.log('✅ Order confirmation email sent successfully');
    } catch (emailError) {
        console.error('❌ Failed to send order confirmation email:', emailError);
        // Don't fail the entire order if email fails
    }

    // ✅ SEND ADMIN NOTIFICATION
    try {
        console.log('📧 Sending admin notification email...');
        await sendAdminOrderNotification(order);
        console.log('✅ Admin notification email sent successfully');
    } catch (adminEmailError) {
        console.error('❌ Failed to send admin notification email:', adminEmailError);
        // Don't fail the entire order if email fails
    }

    // ✅ UPDATED: Use the new inventory management function
    console.log('📦 Updating inventory using server function...');
    let inventoryUpdates = [];
    try {
      inventoryUpdates = await updateInventoryOnServer(orderData.items);
      console.log('✅ Server inventory update completed:', inventoryUpdates.length, 'items processed');
    } catch (inventoryError) {
      console.error('❌ Server inventory update failed:', inventoryError);
      // Fallback to basic inventory update
      console.log('🔄 Using fallback inventory update...');
      for (const item of orderData.items) {
        try {
          const updatedBook = await Book.findOneAndUpdate(
            { title: item.title },
            { 
              $inc: { 
                stock: -item.quantity,
                sold: item.quantity 
              } 
            },
            { new: true }
          );

          if (updatedBook) {
            inventoryUpdates.push({
              bookId: updatedBook._id,
              title: updatedBook.title,
              newStock: updatedBook.stock,
              quantityChanged: -item.quantity
            });
          }
        } catch (fallbackError) {
          console.error(`❌ Fallback inventory update failed for ${item.title}:`, fallbackError.message);
        }
      }
    }

    res.status(201).json({ 
      success: true,
      message: '✅ Order saved successfully!', 
      orderId: order._id,
      order: order,
      inventoryUpdates: inventoryUpdates
    });
    
  } catch (err) {
    console.error('❌ Failed to save order:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to save order',
      details: err.message 
    });
  }
});

// ✅ Get all orders (with optional filters, NO forced limit)
router.get('/', async (req, res) => {
  try {
    const { status, customerEmail, startDate, endDate, page, limit } = req.query;

    let filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (customerEmail) {
      filter.customerEmail = new RegExp(customerEmail, 'i');
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    let query = Order.find(filter).sort({ createdAt: -1 });

    // ✅ Apply pagination ONLY if page & limit are provided
    if (page && limit) {
      const p = parseInt(page);
      const l = parseInt(limit);
      query = query.skip((p - 1) * l).limit(l);
    }

    const orders = await query;
    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      orders,
      totalOrders: total
    });

  } catch (err) {
    console.error('❌ Failed to fetch orders:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// ✅ Get recent orders for dashboard
router.get('/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('orderId customerName customerEmail totals status createdAt');
    
    res.json({
      success: true,
      orders,
      total: orders.length
    });
    
  } catch (err) {
    console.error('❌ Failed to fetch recent orders:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch recent orders' 
    });
  }
});

// ✅ Get single order by ID - WITH BETTER OBJECTID HANDLING
router.get('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // ✅ PREVENT CONFLICT WITH RESERVED ROUTES
    const reservedRoutes = ['test', 'debug-books', 'fix-orders-tax', 'recent', 'checkout', 'verify-amounts'];
    if (reservedRoutes.includes(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID'
      });
    }
    
    let order;
    
    // ✅ CHECK IF IT'S A VALID MONGODB OBJECTID (24 hex characters)
    if (/^[0-9a-fA-F]{24}$/.test(orderId)) {
      order = await Order.findById(orderId);
    } else {
      // Search by custom orderId field
      order = await Order.findOne({ orderId: orderId });
    }
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }
    
    res.json({
      success: true,
      order
    });
    
  } catch (err) {
    console.error('❌ Failed to fetch order:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch order' 
    });
  }
});

// ✅ Update payment status
router.put('/:id/payment', async (req, res) => {
  try {
    const { paymentStatus, transactionId, paymentDate, paymentGateway } = req.body;
    
    const order = await Order.findOne({ 
      $or: [
        { _id: req.params.id },
        { orderId: req.params.id }
      ]
    });
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }
    
    order.paymentStatus = paymentStatus;
    
    if (transactionId || paymentDate || paymentGateway) {
      order.paymentDetails = {
        transactionId: transactionId || order.paymentDetails?.transactionId,
        paymentDate: paymentDate ? new Date(paymentDate) : order.paymentDetails?.paymentDate,
        paymentGateway: paymentGateway || order.paymentDetails?.paymentGateway
      };
    }
    
    order.updatedAt = new Date();
    
    await order.save();
    
    res.json({
      success: true,
      message: `✅ Payment status updated to ${paymentStatus}`,
      order: {
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        paymentDetails: order.paymentDetails
      }
    });
    
  } catch (err) {
    console.error('❌ Failed to update payment status:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update payment status' 
    });
  }
});

// ✅ FIXED: Remove discount subtraction
router.get('/fix-orders-tax', async (req, res) => {
  try {
    const orders = await Order.find({});
    let fixedCount = 0;
    
    for (const order of orders) {
      // ✅ CORRECT: Don't subtract discount (it's already applied in item prices)
      const newTotal = order.totals.subtotal + order.totals.shipping;
      
      if (order.totals.tax > 0 || order.totals.total !== newTotal) {
        await Order.updateOne(
          { _id: order._id },
          { 
            $set: { 
              'totals.tax': 0,
              'totals.total': newTotal
            } 
          }
        );
        console.log(`✅ Fixed: ${order.orderId} - ${order.totals.total} → ${newTotal}`);
        fixedCount++;
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} orders - removed tax`);
    res.json({ success: true, fixed: fixedCount, total: orders.length });
  } catch (error) {
    console.error('Error fixing orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Mark order as shipped and send email (DEDICATED ROUTE)
router.patch('/:orderId/ship', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status
    order.status = 'shipped';
    order.statusHistory.push({
      status: 'shipped',
      updatedAt: new Date(),
      notes: `Order shipped with tracking: ${trackingNumber}`
    });

    await order.save();

    // ✅ SEND SHIPPED EMAIL
    const emailResult = await sendOrderShippedEmail(order, trackingNumber);
    
    res.json({
      success: true,
      message: 'Order marked as shipped',
      order: order,
      emailSent: emailResult.success,
      trackingNumber: emailResult.trackingNumber
    });

  } catch (error) {
    console.error('❌ Ship order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
});

// ✅ Mark order as delivered and send email (DEDICATED ROUTE)
router.patch('/:orderId/deliver', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status
    order.status = 'delivered';
    order.statusHistory.push({
      status: 'delivered',
      updatedAt: new Date(),
      notes: 'Order delivered successfully'
    });

    await order.save();

    // ✅ SEND DELIVERED EMAIL
    const emailSent = await sendOrderDeliveredEmail(order);
    
    res.json({
      success: true,
      message: 'Order marked as delivered',
      order: order,
      emailSent: emailSent
    });

  } catch (error) {
    console.error('❌ Deliver order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
});

// ✅ Get orders by customer ID or email
router.get('/customer/:customerId', async (req, res) => {
  try {
    const customerId = req.params.customerId;
    console.log('🔍 Fetching orders for customer:', customerId);
    
    let query = {};
    
    // Check if it's a valid MongoDB ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(customerId)) {
      // Search by user ID (for logged-in users)
      query.userId = customerId;
    } else {
      // Search by customer email (for guest orders)
      query.customerEmail = customerId;
    }
    
    console.log('📊 Query for orders:', query);
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .select('-__v') // Exclude version key
      .lean(); // Return plain JavaScript objects
    
    console.log(`✅ Found ${orders.length} orders for customer: ${customerId}`);
    
    // If no orders found with that ID, try searching by email
    if (orders.length === 0 && /^[0-9a-fA-F]{24}$/.test(customerId)) {
      // Get user email first
      const user = await User.findById(customerId).select('email');
      if (user && user.email) {
        console.log(`🔍 Trying email search: ${user.email}`);
        const emailOrders = await Order.find({ customerEmail: user.email })
          .sort({ createdAt: -1 })
          .select('-__v')
          .lean();
        
        console.log(`✅ Found ${emailOrders.length} orders by email: ${user.email}`);
        
        return res.json({
          success: true,
          customerId: customerId,
          customerEmail: user.email,
          orders: emailOrders,
          count: emailOrders.length,
          message: emailOrders.length > 0 ? 
            `Found ${emailOrders.length} orders for this customer` :
            'No orders found for this customer'
        });
      }
    }
    
    res.json({
      success: true,
      customerId: customerId,
      orders: orders,
      count: orders.length,
      message: orders.length > 0 ? 
        `Found ${orders.length} orders for this customer` :
        'No orders found for this customer'
    });
    
  } catch (error) {
    console.error('❌ Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer orders',
      message: error.message
    });
  }
});

// ✅ Get customer details with orders summary
router.get('/customer/:customerId/details', async (req, res) => {
  try {
    const customerId = req.params.customerId;
    
    // Try to find user
    const user = await User.findById(customerId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    // Get customer orders
    const orders = await Order.find({
      $or: [
        { userId: customerId },
        { customerEmail: user.email }
      ]
    }).sort({ createdAt: -1 });
    
    // Calculate stats
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => {
      return sum + (order.totals?.total || order.total || 0);
    }, 0);
    const avgOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const firstOrder = orders.length > 0 ? orders[orders.length - 1].createdAt : null;
    
    // Get recent orders (last 5)
    const recentOrders = orders.slice(0, 5);
    
    res.json({
      success: true,
      customer: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt
      },
      stats: {
        totalOrders: totalOrders,
        totalSpent: totalSpent,
        avgOrder: avgOrder,
        customerSince: firstOrder,
        orderStatuses: {
          pending: orders.filter(o => o.status === 'pending').length,
          confirmed: orders.filter(o => o.status === 'confirmed').length,
          shipped: orders.filter(o => o.status === 'shipped').length,
          delivered: orders.filter(o => o.status === 'delivered').length,
          cancelled: orders.filter(o => o.status === 'cancelled').length
        }
      },
      recentOrders: recentOrders,
      allOrders: orders // Include all orders if needed
    });
    
  } catch (error) {
    console.error('❌ Error fetching customer details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer details',
      error: error.message
    });
  }
});

module.exports = router;