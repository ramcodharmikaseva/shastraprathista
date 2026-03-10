const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); // ✅ ADD THIS IMPORT
const User = require('../models/User');
const Order = require('../models/Order');

// Apply auth middleware to all profile routes
router.use(authMiddleware);

// Debug route to check addresses
router.get('/debug-addresses', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      userId: req.user.id,
      addressesCount: user.addressBook ? user.addressBook.length : 0,
      addresses: user.addressBook || [],
      userData: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        addressBookExists: !!user.addressBook,
        addressesFieldExists: !!user.addresses // This will be false
      }
    });
  } catch (err) {
    console.error('Debug addresses error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Debug error', 
      error: err.message 
    });
  }
});

// Get authenticated user's profile
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('GET Profile - User ID from token:', req.user.id);
    
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      console.log('User not found for ID:', req.user.id);
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Also get user's recent orders
    const orders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10);

    console.log('User found:', user.email);
    
    res.json({
      success: true,
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addressBook || [], // ✅ FIXED: Use addressBook
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      recentOrders: orders
    });
  } catch (err) {
    console.error('❌ Failed to fetch profile:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch profile' 
    });
  }
});

// Get user profile by email (admin use or public profile)
router.get('/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email })
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Check if requester is same user
    if (req.user.id !== user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const orders = await Order.find({ userId: user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        addresses: user.addressBook || [], // ✅ FIXED: Use addressBook
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      orders: orders
    });
  } catch (err) {
    console.error('❌ Failed to fetch profile by email:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch profile' 
    });
  }
});

// Update authenticated user's profile
router.put('/', async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    console.log('PUT Profile - User ID:', req.user.id, 'Data:', { name, phone });
    
    // Validate input
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    // Validate phone format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number starting with 6-9'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        name: name.trim(),
        phone: phone.trim(),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: '✅ Profile updated successfully!',
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        addresses: user.addressBook || [], // ✅ FIXED: Use addressBook
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    console.error('❌ Failed to update profile:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to update profile' 
    });
  }
});

// Add address to address book
router.post('/addresses', async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      city,
      district,
      state,
      pincode,
      country = 'India',
      type = 'both', // ✅ FIXED: Use 'both' instead of 'home' to match your schema
      isDefault = false
    } = req.body;

    console.log('POST Address - User ID:', req.user.id, 'Address data:', req.body);

    // Validate required fields
    if (!name || !phone || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'All address fields are required'
      });
    }

    // Validate phone
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      });
    }

    // Validate pincode
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit pincode'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Initialize addressBook array if it doesn't exist
    if (!user.addressBook) {
      user.addressBook = [];
    }

    // If setting as default, remove default from all other addresses
    if (isDefault) {
      user.addressBook.forEach(addr => {
        addr.isDefault = false;
      });
    }

    // Create new address object that matches your schema
    const newAddress = {
      type: type, // 'billing', 'shipping', or 'both'
      fullName: name.trim(),
      addressLine1: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      country: country.trim(),
      phone: phone.trim(),
      isDefault: isDefault || user.addressBook.length === 0
    };

    // Add district to addressLine2 if provided
    if (district) {
      newAddress.addressLine2 = district.trim();
    }

    user.addressBook.push(newAddress);
    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password');

    res.json({
      success: true,
      message: '✅ Address added successfully!',
      profile: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        addresses: updatedUser.addressBook || [] // ✅ FIXED: Use addressBook
      }
    });
  } catch (err) {
    console.error('❌ Failed to add address:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to add address' 
    });
  }
});

// Update address - UPDATED FOR addressBook
router.put('/addresses/:addressIndex', async (req, res) => {
  try {
    const addressIndex = parseInt(req.params.addressIndex);
    const {
      name,
      phone,
      address,
      city,
      district,
      state,
      pincode,
      country,
      type,
      isDefault
    } = req.body;

    if (isNaN(addressIndex) || addressIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address index'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (!user.addressBook || addressIndex >= user.addressBook.length) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Validate phone if provided
    if (phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit phone number'
        });
      }
    }

    // Validate pincode if provided
    if (pincode) {
      const pincodeRegex = /^\d{6}$/;
      if (!pincodeRegex.test(pincode)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 6-digit pincode'
        });
      }
    }

    // If setting as default, remove default from all other addresses
    if (isDefault) {
      user.addressBook.forEach(addr => {
        addr.isDefault = false;
      });
    }

    // Update the address - using addressBook schema
    user.addressBook[addressIndex] = {
      ...user.addressBook[addressIndex],
      type: type || user.addressBook[addressIndex].type,
      fullName: name ? name.trim() : user.addressBook[addressIndex].fullName,
      phone: phone ? phone.trim() : user.addressBook[addressIndex].phone,
      addressLine1: address ? address.trim() : user.addressBook[addressIndex].addressLine1,
      addressLine2: district ? district.trim() : user.addressBook[addressIndex].addressLine2,
      city: city ? city.trim() : user.addressBook[addressIndex].city,
      state: state ? state.trim() : user.addressBook[addressIndex].state,
      pincode: pincode ? pincode.trim() : user.addressBook[addressIndex].pincode,
      country: country ? country.trim() : user.addressBook[addressIndex].country,
      isDefault: isDefault !== undefined ? isDefault : user.addressBook[addressIndex].isDefault
    };

    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password');

    res.json({
      success: true,
      message: '✅ Address updated successfully!',
      profile: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        addresses: updatedUser.addressBook || []
      }
    });
  } catch (err) {
    console.error('❌ Failed to update address:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to update address' 
    });
  }
});

// Delete address - UPDATED FOR addressBook
router.delete('/addresses/:addressIndex', async (req, res) => {
  try {
    const addressIndex = parseInt(req.params.addressIndex);

    if (isNaN(addressIndex) || addressIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address index'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (!user.addressBook || addressIndex >= user.addressBook.length) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    const wasDefault = user.addressBook[addressIndex].isDefault;

    // Remove the address
    user.addressBook.splice(addressIndex, 1);

    // If we deleted the default address and there are other addresses, set a new default
    if (wasDefault && user.addressBook.length > 0) {
      user.addressBook[0].isDefault = true;
    }

    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password');

    res.json({
      success: true,
      message: '✅ Address deleted successfully!',
      profile: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        addresses: updatedUser.addressBook || []
      }
    });
  } catch (err) {
    console.error('❌ Failed to delete address:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete address' 
    });
  }
});

// Set default address - UPDATED FOR addressBook
router.patch('/addresses/:addressIndex/default', async (req, res) => {
  try {
    const addressIndex = parseInt(req.params.addressIndex);

    if (isNaN(addressIndex) || addressIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address index'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (!user.addressBook || addressIndex >= user.addressBook.length) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Remove default from all addresses
    user.addressBook.forEach(addr => {
      addr.isDefault = false;
    });

    // Set the specified address as default
    user.addressBook[addressIndex].isDefault = true;

    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password');

    res.json({
      success: true,
      message: '✅ Default address updated successfully!',
      profile: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        addresses: updatedUser.addressBook || []
      }
    });
  } catch (err) {
    console.error('❌ Failed to set default address:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to set default address' 
    });
  }
});

// Get authenticated user's orders
router.get('/orders/history', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    console.log('GET Orders - User ID:', req.user.id);
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Build query
    const query = { userId: req.user.id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalOrders = await Order.countDocuments(query);

    res.json({
      success: true,
      orders: orders,
      totalOrders: totalOrders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / limit)
    });
  } catch (err) {
    console.error('❌ Failed to fetch user orders:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch user orders' 
    });
  }
});

// Get specific order details - FIXED
// ✅ Get single order for customer by orderId
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    let order;

    // If Mongo ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(orderId)) {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ orderId: orderId });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (err) {
    console.error('❌ Error fetching customer order:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

// Cancel order - FIXED: Search by orderId instead of _id
router.patch('/orders/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log('🔄 CANCEL ORDER REQUEST:', {
      orderId: orderId,
      userId: req.user.id,
      userRole: req.user.role
    });

    // ✅ FIX: Search by orderId field instead of _id
    const order = await Order.findOne({ 
      orderId: orderId, 
      userId: req.user.id 
    });

    console.log('🔍 ORDER FOUND:', order ? 'YES' : 'NO');
    
    if (!order) {
      console.log('❌ Order not found or user mismatch');
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    console.log('📊 CURRENT ORDER STATUS:', order.status);

    // Check if order can be cancelled
    if (!['pending', 'confirmed', 'processing'].includes(order.status)) {
      console.log('❌ Order cannot be cancelled - current status:', order.status);
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in its current state (${order.status})`
      });
    }

    console.log('✅ Order can be cancelled - proceeding...');

    // Update order status
    order.status = 'cancelled';
    order.updatedAt = new Date();
    
    // Add to status history
    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: 'cancelled',
      previousStatus: order.status,
      updatedAt: new Date(),
      updatedBy: req.user.id,
      updatedByRole: req.user.role,
      notes: `Order cancelled by user`
    });

    await order.save();

    console.log('✅ ORDER CANCELLED SUCCESSFULLY');

    res.json({
      success: true,
      message: '✅ Order cancelled successfully!',
      order: order
    });

  } catch (err) {
    console.error('❌ FAILED TO CANCEL ORDER:', err);
    console.error('❌ ERROR STACK:', err.stack);
    res.status(500).json({ 
      success: false,
      message: 'Failed to cancel order',
      error: err.message 
    });
  }
});

// Update order status (for both users and admin) - FIXED
router.put('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const { id: userId, role } = req.user;

    console.log('PUT Order Status - Order ID:', orderId, 'Status:', status, 'User Role:', role);

    // ✅ FIX: Search by orderId instead of _id
    const order = await Order.findOne({ 
      orderId: orderId
    });
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Check permissions
    // Allow if: user is admin OR user owns the order
    const isOrderOwner = order.userId.toString() === userId;
    const isAdmin = role === 'admin';

    if (!isAdmin && !isOrderOwner) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    // Validate status transition
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // For users, only allow cancellation
    if (!isAdmin && status !== 'cancelled') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can update order status beyond cancellation'
      });
    }

    // For users cancelling, check if order can be cancelled
    if (!isAdmin && status === 'cancelled') {
      const cancellableStatuses = ['pending', 'confirmed', 'processing'];
      if (!cancellableStatuses.includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: `Order cannot be cancelled in its current state (${order.status})`
        });
      }
    }

    // Update order status
    const previousStatus = order.status;
    order.status = status;
    order.updatedAt = new Date();

    // Add to status history
    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: status,
      previousStatus: previousStatus,
      updatedAt: new Date(),
      updatedBy: userId,
      updatedByRole: role,
      notes: `Status changed from ${previousStatus} to ${status} by ${role}`
    });

    await order.save();

    console.log(`✅ Order ${orderId} status updated from ${previousStatus} to ${status} by ${role}`);

    res.json({
      success: true,
      message: `✅ Order status updated to ${status}`,
      order: order
    });

  } catch (err) {
    console.error('❌ Failed to update order status:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update order status' 
    });
  }
});

module.exports = router;