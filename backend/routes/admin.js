const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole, requireAdminPageAccess } = require('../middleware/requireRole'); // ✅ Import both
const Order = require('../models/Order');
const User = require('../models/User');
const Book = require('../models/Book');

// ✅ FIX THIS IMPORT - Add sendOrderDeliveredEmail
const { sendOrderShippedEmail, sendOrderDeliveredEmail } = require('../utils/orderEmailService');

// Apply auth middleware to all admin routes
router.use(authMiddleware);

// ✅ FIXED: Debug middleware to check user object BEFORE role check
router.use((req, res, next) => {
  console.log('🔐 Admin Route - User object:', {
    id: req.user?._id,
    email: req.user?.email,
    role: req.user?.role,
    exists: !!req.user
  });
  next();
});

// ✅ FIXED: Apply role-based access control - Using array
router.use(requireRole(['super_admin', 'admin']));

// Update the test-email endpoint in routes/admin.js
router.post('/test-email', async (req, res) => {
  try {
    console.log('📧 Testing email configuration...');
    
    // Test with YOUR PERSONAL email instead
    const testOrder = {
      orderId: 'TEST123',
      customerEmail: 'your-personal-email@gmail.com', // ← CHANGE THIS TO YOUR PERSONAL EMAIL
      customerName: 'Test Customer',
      shippingAddress: {
        fullName: 'Test User',
        addressLine1: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      },
      items: [
        {
          title: 'Test Book',
          author: 'Test Author',
          quantity: 1,
          price: 100
        }
      ],
      totals: {
        total: 100,
        subtotal: 100,
        shipping: 0,
        discount: 0
      }
    };

    console.log('📧 Sending test email to:', testOrder.customerEmail);
    
    const emailResult = await sendOrderShippedEmail(testOrder, 'TESTTRACK123');
    
    if (emailResult.success) {
      console.log('✅ Test email sent successfully!');
      res.json({
        success: true,
        message: 'Test email sent successfully! Check your inbox and spam folder.',
        trackingNumber: emailResult.trackingNumber,
        sentTo: testOrder.customerEmail
      });
    } else {
      console.log('❌ Test email failed:', emailResult.error);
      res.status(500).json({
        success: false,
        message: 'Test email failed: ' + (emailResult.error || 'Unknown error')
      });
    }
    
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Test email error: ' + error.message
    });
  }
});

// ✅ ADD THIS TEST ENDPOINT FOR DELIVERED EMAILS:
router.post('/test-delivered-email', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    console.log('📧 Testing delivered email for order ID:', orderId);
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('📧 Found order:', {
      orderId: order.orderId,
      customerEmail: order.customerEmail,
      status: order.status
    });
    
    const emailResult = await sendOrderDeliveredEmail(order);
    
    if (emailResult) {
      console.log('✅ Delivered email sent successfully to:', order.customerEmail);
      res.json({
        success: true,
        message: 'Delivered test email sent successfully!',
        sentTo: order.customerEmail
      });
    } else {
      console.log('❌ Failed to send delivered email');
      res.status(500).json({
        success: false,
        message: 'Failed to send delivered test email'
      });
    }
    
  } catch (error) {
    console.error('❌ Test delivered email error:', error);
    res.status(500).json({
      success: false,
      message: 'Test delivered email error: ' + error.message
    });
  }
});

// ✅ UPDATED: Shipping endpoint with comprehensive error handling
router.patch('/orders/:id/ship', async (req, res) => {
  try {
    const { id } = req.params;
    const { trackingNumber, courierName, notes } = req.body;

    console.log('🚚 Shipping request received:', { 
      id, 
      trackingNumber, 
      courierName,
      hasEmailService: !!sendOrderShippedEmail // Check if service is available
    });

    // Validate required fields
    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message: 'Tracking number is required'
      });
    }

    // Find and update order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('📦 Found order:', {
      orderId: order.orderId,
      customerEmail: order.customerEmail,
      status: order.status
    });

    // Update order with shipping info
    order.status = 'shipped';
    order.trackingNumber = trackingNumber;
    order.courierName = courierName;
    order.shippedAt = new Date();
    
    // Add to status history
    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: 'shipped',
      updatedAt: new Date(),
      updatedBy: req.user.id,
      updatedByRole: 'admin',
      notes: notes || `Shipped via ${courierName}. Tracking: ${trackingNumber}`
    });

    await order.save();

    console.log(`✅ Order ${id} marked as shipped with tracking: ${trackingNumber}`);

    // ✅ SEND SHIPPING EMAIL TO CUSTOMER
    let emailSent = false;
    let emailError = null;

    if (sendOrderShippedEmail && order.customerEmail) {
      try {
        console.log(`📧 Attempting to send shipping email to: ${order.customerEmail}`);
        
        const emailResult = await sendOrderShippedEmail(order, trackingNumber);
        
        if (emailResult && emailResult.success) {
          emailSent = true;
          console.log(`✅ Shipping email sent successfully to ${order.customerEmail}`);
        } else {
          emailError = emailResult?.error || 'Email service returned failure';
          console.log('⚠️ Shipping email failed:', emailError);
        }
      } catch (emailError) {
        emailError = emailError.message;
        console.error('❌ Error sending shipping email:', emailError);
        // Don't fail the whole request if email fails
      }
    } else {
      console.log('⚠️ Email service not available or no customer email');
    }

    res.json({
      success: true,
      message: 'Order marked as shipped successfully' + (emailSent ? ' and email sent' : ' (email not sent)'),
      order: order,
      trackingNumber: trackingNumber,
      emailSent: emailSent,
      emailError: emailError
    });

  } catch (error) {
    console.error('❌ Shipping error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shipping status: ' + error.message
    });
  }
});

// ✅ REPLACE THIS ENDPOINT with the updated version:
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, trackingNumber, courierName, notes } = req.body;

    console.log('🔄 Admin updating order:', { id, status, paymentStatus, trackingNumber });

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Store previous status for email triggers
    const previousStatus = order.status;

    // Track changes for history
    const changes = [];
    
    // Update status if provided
    if (status && status !== order.status) {
      order.status = status;
      changes.push(`status: ${previousStatus} → ${status}`);
    }

    // Update payment status if provided
    if (paymentStatus && paymentStatus !== order.paymentStatus) {
      order.paymentStatus = paymentStatus;
      changes.push(`payment: ${order.paymentStatus} → ${paymentStatus}`);
    }

    // Update tracking info if provided
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
      changes.push(`tracking: ${trackingNumber}`);
    }

    if (courierName) {
      order.courierName = courierName;
      changes.push(`courier: ${courierName}`);
    }

    // If marking as shipped, set shipped date
    if (status === 'shipped' && !order.shippedAt) {
      order.shippedAt = new Date();
    }

    // If marking as delivered, set delivered date
    if (status === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    order.updatedAt = new Date();

    // Add to status history if there were changes
    if (changes.length > 0) {
      if (!order.statusHistory) {
        order.statusHistory = [];
      }

      order.statusHistory.push({
        status: status || order.status,
        previousStatus: previousStatus,
        updatedAt: new Date(),
        updatedBy: req.user.id,
        updatedByRole: 'admin',
        notes: notes || `Admin updated: ${changes.join(', ')}`
      });
    }

    await order.save();

    console.log(`✅ Admin updated order ${id}: ${changes.join(', ')}`);

    // ✅ AUTO-EMAIL TRIGGERS - ADD THIS SECTION
    let emailSent = false;
    let emailType = '';

    try {
      // Trigger shipped email
      if (status === 'shipped' && previousStatus !== 'shipped') {
        console.log(`📧 Auto-triggering shipped email for order ${id}`);
        const emailResult = await sendOrderShippedEmail(order, order.trackingNumber);
        if (emailResult && emailResult.success) {
          emailSent = true;
          emailType = 'shipped';
          console.log(`✅ Shipped email sent to ${order.customerEmail}`);
        }
      }
      
      // Trigger delivered email
      else if (status === 'delivered' && previousStatus !== 'delivered') {
        console.log(`📧 Auto-triggering delivered email for order ${id}`);
        const emailResult = await sendOrderDeliveredEmail(order);
        if (emailResult) {
          emailSent = true;
          emailType = 'delivered';
          console.log(`✅ Delivered email sent to ${order.customerEmail}`);
        }
      }
    } catch (emailError) {
      console.error('❌ Error sending auto-email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: `Order updated successfully: ${changes.join(', ')}` + 
               (emailSent ? ` (${emailType} email sent)` : ''),
      order: order,
      emailSent: emailSent,
      emailType: emailType
    });

  } catch (error) {
    console.error('❌ Failed to update order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order: ' + error.message
    });
  }
});

// ✅ ADDED: Get order status (GET /api/admin/orders/:id/status)
router.get('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).select('status paymentStatus trackingNumber courierName shippedAt');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      status: order.status,
      paymentStatus: order.paymentStatus,
      trackingNumber: order.trackingNumber,
      courierName: order.courierName,
      shippedAt: order.shippedAt
    });

  } catch (error) {
    console.error('❌ Failed to fetch order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order status'
    });
  }
});

// ✅ ADDED: Quick ship endpoint (POST /api/admin/orders/:id/quick-ship)
router.post('/orders/:id/quick-ship', async (req, res) => {
  try {
    const { id } = req.params;
    const { trackingNumber, courierName = 'india_post' } = req.body;

    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message: 'Tracking number is required'
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order
    order.status = 'shipped';
    order.trackingNumber = trackingNumber;
    order.courierName = courierName;
    order.shippedAt = new Date();

    // Add to status history
    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: 'shipped',
      updatedAt: new Date(),
      updatedBy: req.user.id,
      updatedByRole: 'admin',
      notes: `Quick shipped via ${courierName}. Tracking: ${trackingNumber}`
    });

    await order.save();

    console.log(`🚀 Quick shipped order ${id} with tracking: ${trackingNumber}`);

    res.json({
      success: true,
      message: 'Order shipped successfully',
      trackingNumber: trackingNumber,
      order: order
    });

  } catch (error) {
    console.error('❌ Quick ship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ship order'
    });
  }
});

// ✅ Get all orders (admin only) - FIXED
router.get('/orders', async (req, res) => {
  try {
    const { page, limit, status, customer } = req.query;

    console.log('GET Admin Orders - User:', req.user.email);

    const query = {};

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by customer (ID or email or name)
    if (customer) {
      if (/^[0-9a-fA-F]{24}$/.test(customer)) {
        query.$or = [
          { userId: customer },
          { customerId: customer }
        ];
      } else {
        query.$or = [
          { customerEmail: { $regex: customer, $options: 'i' } },
          { customerName: { $regex: customer, $options: 'i' } }
        ];
      }
    }

    let ordersQuery = Order.find(query).sort({ createdAt: -1 });

    let orders;
    let totalOrders = await Order.countDocuments(query);

    // ✅ Apply pagination ONLY if page & limit are provided
    if (page && limit) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      orders = await ordersQuery
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);
    } else {
      // ✅ Return ALL orders
      orders = await ordersQuery;
    }

    res.json({
      success: true,
      orders,
      totalOrders,
      currentPage: page ? parseInt(page) : 1,
      totalPages: limit ? Math.ceil(totalOrders / limit) : 1
    });

  } catch (err) {
    console.error('❌ Failed to fetch admin orders:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// Test debug endpoint
router.get('/test-debug', (req, res) => {
  res.json({
    success: true,
    message: 'Admin route is working!',
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Get order details (admin only)
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    res.json({
      success: true,
      order: order
    });
  } catch (err) {
    console.error('❌ Failed to fetch admin order details:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch order details' 
    });
  }
});

// Get all customers (admin only)
router.get('/customers', async (req, res) => {
  try {
    const customers = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    // Get order counts for each customer
    const customersWithOrders = await Promise.all(
      customers.map(async (customer) => {
        const orderCount = await Order.countDocuments({ userId: customer._id });
        return {
          ...customer.toObject(),
          ordersCount: orderCount
        };
      })
    );

    res.json({
      success: true,
      customers: customersWithOrders
    });
  } catch (err) {
    console.error('❌ Failed to fetch customers:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch customers' 
    });
  }
});

// Get dashboard statistics (admin only)
router.get('/dashboard', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments();
    
    const revenueResult = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totals.total' } } }
    ]);
    
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Recent orders (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: oneWeekAgo }
    });

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalCustomers,
        totalRevenue,
        recentOrders,
        ordersByStatus
      }
    });
  } catch (err) {
    console.error('❌ Failed to fetch dashboard stats:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch dashboard statistics' 
    });
  }
});

// Admin Dashboard Stats Endpoint (for the frontend admin dashboard)
router.get('/dashboard/stats', async (req, res) => {
  try {
    console.log('📊 Fetching dashboard stats...');
    
    // Get counts from database
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'user' });
    const totalBooks = await Book.countDocuments();
    
    // Calculate total revenue
    const revenueResult = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totals.total' }
        }
      }
    ]);
    
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    
    // Get recent orders count (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: oneWeekAgo }
    });
    
    // Get pending orders
    const pendingOrders = await Order.countDocuments({
      status: { $in: ['pending', 'confirmed', 'processing'] }
    });

    const stats = {
      totalOrders,
      totalCustomers,
      totalBooks,
      totalRevenue,
      recentOrders,
      pendingOrders,
      completedOrders: await Order.countDocuments({ status: 'delivered' })
    };

    console.log('✅ Dashboard stats calculated:', stats);
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

// ✅ ADD THIS BOOKS ENDPOINT TO YOUR ADMIN ROUTES
// Get all books (admin only)
router.get('/books', async (req, res) => {
  try {
    console.log('📚 Fetching books for admin...');
    
    const { page = 1, limit = 100, category, search } = req.query;
    
    // Build query
    const query = {};
    if (category && category !== 'all') {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const books = await Book.find(query).sort({ id: 1 })
      .select('title author category price originalPrice stock description isbn language pages weight dimensions images createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalBooks = await Book.countDocuments(query);

    console.log(`✅ Found ${books.length} books for admin`);

    res.json({
      success: true,
      books: books,
      totalBooks: totalBooks,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalBooks / limit)
    });

  } catch (error) {
    console.error('❌ Failed to fetch admin books:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch books',
      error: error.message
    });
  }
});

// ✅ ADD BOOK STATISTICS ENDPOINT
router.get('/books/stats', async (req, res) => {
  try {
    console.log('📊 Fetching book statistics...');
    
    // Get total books count
    const totalBooks = await Book.countDocuments();
    
    // Get books by category
    const booksByCategory = await Book.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get low stock books (less than 10)
    const lowStockBooks = await Book.countDocuments({ stock: { $lt: 10 } });
    
    // Get out of stock books
    const outOfStockBooks = await Book.countDocuments({ stock: 0 });

    // Get recent additions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBooks = await Book.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const stats = {
      totalBooks,
      booksByCategory,
      lowStockBooks,
      outOfStockBooks,
      recentBooks
    };

    console.log('✅ Book statistics calculated:', stats);
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('❌ Error fetching book statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book statistics'
    });
  }
});

// ✅ ADD BOOK SALES ANALYTICS ENDPOINT
router.get('/books/analytics/sales', async (req, res) => {
  try {
    const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y
    
    console.log('📈 Fetching book sales analytics for period:', period);
    
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get book sales from orders in the specified period
    const bookSales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: 'cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.id',
          title: { $first: '$items.title' },
          category: { $first: '$items.category' },
          author: { $first: '$items.author' },
          unitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          ordersCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 50 }
    ]);

    // Calculate totals
    const totalRevenue = bookSales.reduce((sum, book) => sum + book.totalRevenue, 0);
    const totalUnits = bookSales.reduce((sum, book) => sum + book.unitsSold, 0);

    console.log(`✅ Book sales analytics: ${bookSales.length} books sold in period`);

    res.json({
      success: true,
      period: period,
      startDate: startDate,
      endDate: endDate,
      bookSales: bookSales,
      summary: {
        totalBooks: bookSales.length,
        totalUnitsSold: totalUnits,
        totalRevenue: totalRevenue,
        averageOrderValue: totalUnits > 0 ? totalRevenue / totalUnits : 0
      }
    });

  } catch (error) {
    console.error('❌ Error fetching book sales analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book sales analytics'
    });
  }
});

// ===============================
// ✅ BOOK MANAGEMENT ENDPOINTS
// ===============================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/books/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'book-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, JPG, PNG, WEBP)!'));
    }
  }
});

// ✅ Add new book
router.post('/books/add', upload.array('images', 5), async (req, res) => {
  try {
    console.log('📚 Adding new book...');
    
    const bookData = req.body;
    const uploadedFiles = req.files || [];
    
    // Generate book ID if not provided
    if (!bookData.id) {
      const lastBook = await Book.findOne().sort({ createdAt: -1 });
      let nextNumber = 36; // Start from your current last number
      if (lastBook && lastBook.id) {
        const match = lastBook.id.match(/slrspt-book-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      bookData.id = `slrspt-book-${nextNumber.toString().padStart(3, '0')}`;
      console.log(`🔢 Generated book ID: ${bookData.id}`);
    }
    
    // Process uploaded images
    if (uploadedFiles.length > 0) {
      bookData.images = uploadedFiles.map(file => 
        `/uploads/books/${file.filename}`
      );
      console.log(`📷 Uploaded ${uploadedFiles.length} images`);
    } else {
      // Default image if none uploaded
      bookData.images = ['image/no-book.png'];
    }
    
    // Convert string values to proper types
    bookData.price = parseFloat(bookData.price) || 0;
    bookData.originalPrice = parseFloat(bookData.originalPrice) || bookData.price;
    bookData.discount = parseFloat(bookData.discount) || 0;
    bookData.stock = parseInt(bookData.stock) || 0;
    bookData.weight = parseInt(bookData.weight) || 500;
    
    // Calculate discounted price
    if (bookData.discount > 0 && bookData.discount <= 100) {
      bookData.discountedPrice = Math.round(
        bookData.price - (bookData.price * bookData.discount / 100)
      );
    } else {
      bookData.discountedPrice = bookData.price;
    }
    
    // Set status based on stock
    bookData.inStock = bookData.stock > 0;
    bookData.status = bookData.inStock ? 'active' : 'out_of_stock';
    
    // Add specs object if not provided
    if (!bookData.specs) {
      bookData.specs = {
        publisher: bookData.publisher || '',
        language: bookData.language || 'Sanskrit and Tamil',
        pages: parseInt(bookData.pages) || 0,
        size: bookData.size || '5.4x8.3 inches',
        isbn: bookData.isbn || ''
      };
    }
    
    // Remove individual fields that are now in specs
    delete bookData.publisher;
    delete bookData.language;
    delete bookData.pages;
    delete bookData.size;
    delete bookData.isbn;
    
    // Set creation date
    bookData.createdAt = new Date();
    
    console.log('📦 Book data to save:', {
      id: bookData.id,
      title: bookData.title,
      stock: bookData.stock,
      price: bookData.price,
      images: bookData.images.length
    });
    
    // Save to database
    const book = new Book(bookData);
    await book.save();
    
    console.log(`✅ Book added successfully: ${book.title} (ID: ${book.id})`);
    
    res.json({
      success: true,
      message: 'Book added successfully',
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        price: book.price,
        stock: book.stock,
        images: book.images,
        status: book.status
      }
    });
    
  } catch (error) {
    console.error('❌ Error adding book:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add book',
      error: error.message,
      details: error.errors || error
    });
  }
});

// ✅ Update book
router.put('/books/:id', upload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const uploadedFiles = req.files || [];
    
    console.log(`📝 Updating book: ${id}`);
    
    // Find existing book
    const existingBook = await Book.findOne({ id: id });
    if (!existingBook) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    // Process uploaded images
    if (uploadedFiles.length > 0) {
      updateData.images = uploadedFiles.map(file => 
        `/uploads/books/${file.filename}`
      );
    }
    
    // Convert numeric fields
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.originalPrice) updateData.originalPrice = parseFloat(updateData.originalPrice);
    if (updateData.discount) updateData.discount = parseFloat(updateData.discount);
    if (updateData.stock) updateData.stock = parseInt(updateData.stock);
    if (updateData.weight) updateData.weight = parseInt(updateData.weight);
    
    // Recalculate discounted price if price or discount changed
    if (updateData.price || updateData.discount) {
      const price = updateData.price || existingBook.price;
      const discount = updateData.discount || existingBook.discount;
      if (discount > 0 && discount <= 100) {
        updateData.discountedPrice = Math.round(price - (price * discount / 100));
      } else {
        updateData.discountedPrice = price;
      }
    }
    
    // Update stock status
    if (updateData.stock !== undefined) {
      updateData.inStock = updateData.stock > 0;
      updateData.status = updateData.inStock ? 'active' : 'out_of_stock';
    }
    
    // Update specs if provided
    if (updateData.specs) {
      updateData.specs = {
        ...existingBook.specs,
        ...updateData.specs
      };
    }
    
    updateData.updatedAt = new Date();
    
    const updatedBook = await Book.findOneAndUpdate(
      { id: id },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    console.log(`✅ Book updated: ${updatedBook.title}`);
    
    res.json({
      success: true,
      message: 'Book updated successfully',
      book: updatedBook
    });
    
  } catch (error) {
    console.error('❌ Error updating book:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update book',
      error: error.message
    });
  }
});

// ✅ Delete/archive book
router.delete('/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Archiving book: ${id}`);
    
    // Soft delete - mark as archived
    const book = await Book.findOneAndUpdate(
      { id: id },
      { 
        $set: { 
          status: 'archived',
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    console.log(`✅ Book archived: ${book.title}`);
    
    res.json({
      success: true,
      message: 'Book archived successfully',
      book: {
        id: book.id,
        title: book.title,
        status: book.status
      }
    });
    
  } catch (error) {
    console.error('❌ Error archiving book:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive book',
      error: error.message
    });
  }
});

// ✅ Get single book details (for edit)
router.get('/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📖 Fetching book details: ${id}`);
    
    const book = await Book.findOne({ id: id });
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    res.json({
      success: true,
      book: book
    });
    
  } catch (error) {
    console.error('❌ Error fetching book:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book',
      error: error.message
    });
  }
});

// ✅ Get books with advanced filtering
router.get('/books/filtered', async (req, res) => {
  try {
    const { 
      search = '',
      category = '',
      status = '',
      minStock = 0,
      maxStock = 9999,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    console.log('🔍 Filtering books:', { search, category, status, minStock, maxStock });
    
    // Build query
    const query = {};
    
    // Search in title, author, description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'specs.publisher': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Stock range filter
    if (minStock || maxStock) {
      query.stock = {};
      if (minStock) query.stock.$gte = parseInt(minStock);
      if (maxStock) query.stock.$lte = parseInt(maxStock);
    }
    
    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    const books = await Book.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const totalBooks = await Book.countDocuments(query);
    
    // Get stock statistics
    const stockStats = await Book.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$stock' },
          avgStock: { $avg: '$stock' },
          minStock: { $min: '$stock' },
          maxStock: { $max: '$stock' },
          outOfStock: {
            $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] }
          },
          lowStock: {
            $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', 10] }] }, 1, 0] }
          }
        }
      }
    ]);
    
    console.log(`✅ Found ${books.length} books (total: ${totalBooks})`);
    
    res.json({
      success: true,
      books: books,
      totalBooks: totalBooks,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalBooks / limit),
      filters: { search, category, status, minStock, maxStock },
      stockStats: stockStats[0] || {
        totalStock: 0,
        avgStock: 0,
        minStock: 0,
        maxStock: 0,
        outOfStock: 0,
        lowStock: 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error filtering books:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to filter books',
      error: error.message
    });
  }
});

module.exports = router;