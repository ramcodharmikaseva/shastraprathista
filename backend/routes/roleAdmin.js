const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const { requireRole } = require('../middleware/requireRole'); // ✅ Destructure here

// Apply auth middleware to all routes
router.use(authMiddleware);

// ✅ Now this will work:
router.get('/users', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    // Filter by role - only show non-admin users to regular admin
    if (req.user.role === 'admin') {
      query.role = { $in: ['user', 'music_admin', 'hall_admin'] };
    }
    
    // Additional filtering by role query
    if (role && role !== 'all') {
      query.role = role;
    }
    
    // Search by name, email, or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('❌ Failed to fetch users:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch users' 
    });
  }
});

// GET admin dashboard statistics
router.get('/dashboard-stats', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const stats = {};
    const userRole = req.user.role;
    
    // Common stats for all admins
    stats.totalUsers = await User.countDocuments({ role: 'user' });
    
    // Role-specific stats
    if (userRole === 'super_admin' || userRole === 'music_admin') {
      const MusicStudent = require('../models/MusicStudent');
      stats.musicStudents = await MusicStudent.countDocuments();
      stats.activeMusicStudents = await MusicStudent.countDocuments({ status: 'active' });
    }
    
    if (userRole === 'super_admin' || userRole === 'hall_admin') {
      const HallBooking = require('../models/HallBooking');
      stats.hallBookings = await HallBooking.countDocuments();
      stats.upcomingBookings = await HallBooking.countDocuments({ 
        bookingDate: { $gte: new Date() } 
      });
    }
    
    if (userRole === 'super_admin') {
      const Book = require('../models/Book');
      const Order = require('../models/Order');
      
      stats.totalBooks = await Book.countDocuments();
      stats.totalOrders = await Order.countDocuments();
      stats.recentOrders = await Order.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      
      // Revenue calculation
      const revenueData = await Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      stats.totalRevenue = revenueData[0]?.total || 0;
    }
    
    res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('❌ Failed to fetch dashboard stats:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch dashboard statistics' 
    });
  }
});

// UPDATE user role (super_admin only)
router.put('/users/:id/role', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, permissions } = req.body;
    
    // Validate role
    const validRoles = ['user', 'music_admin', 'hall_admin', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }
    
    // Prevent changing your own role
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }
    
    const updateData = { role };
    
    // Add permissions if provided
    if (permissions) {
      updateData.permissions = permissions;
    }
    
    const user = await User.findByIdAndUpdate(
      id,
      updateData,
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
      message: `✅ User role updated to ${role}`,
      user
    });
  } catch (err) {
    console.error('❌ Failed to update user role:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to update user role' 
    });
  }
});

// CREATE new admin user (super_admin only)
router.post('/admins', requireRole('super_admin'), async (req, res) => {
  try {
    const { name, email, phone, role, permissions } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Validate role
    const validRoles = ['admin', 'music_admin', 'hall_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role for admin creation. Must be one of: ${validRoles.join(', ')}`
      });
    }
    
    // Generate temporary password
    const bcrypt = require('bcryptjs');
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    // Create admin user
    const newAdmin = new User({
      name,
      email,
      phone,
      role,
      password: hashedPassword,
      permissions: permissions || [
        { 
          resource: role === 'music_admin' ? 'music' : (role === 'hall_admin' ? 'hall' : '*'),
          actions: ['read', 'create', 'update'] 
        }
      ]
    });
    
    await newAdmin.save();
    
    // Remove password from response
    const adminResponse = newAdmin.toObject();
    delete adminResponse.password;
    
    // TODO: Send email with temporary password
    // await sendAdminInvitationEmail(email, tempPassword);
    
    res.status(201).json({
      success: true,
      message: '✅ Admin user created successfully',
      admin: adminResponse,
      tempPassword: tempPassword // Only for demo - remove in production
    });
  } catch (err) {
    console.error('❌ Failed to create admin:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to create admin user' 
    });
  }
});

// DELETE/Deactivate admin user (super_admin only)
router.delete('/admins/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      id,
      { role: 'user', permissions: [] }, // Demote to regular user
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      message: '✅ Admin user deactivated successfully',
      user
    });
  } catch (err) {
    console.error('❌ Failed to deactivate admin:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to deactivate admin user' 
    });
  }
});

// GET admin permissions template
router.get('/permissions/templates', requireRole('super_admin'), async (req, res) => {
  const permissionTemplates = {
    admin: [
      {
        resource: 'users',
        actions: ['read']
      },
      {
        resource: 'dashboard',
        actions: ['read']
      }
    ],
    music_admin: [
      {
        resource: 'music',
        actions: ['read', 'create', 'update', 'manage_students']
      },
      {
        resource: 'students',
        actions: ['read', 'create', 'update']
      },
      {
        resource: 'courses',
        actions: ['read', 'create', 'update']
      }
    ],
    hall_admin: [
      {
        resource: 'hall',
        actions: ['read', 'create', 'update', 'manage_bookings']
      },
      {
        resource: 'bookings',
        actions: ['read', 'create', 'update', 'approve']
      },
      {
        resource: 'events',
        actions: ['read', 'create', 'update']
      }
    ],
    super_admin: [
      {
        resource: '*',
        actions: ['*']
      }
    ]
  };
  
  res.json({
    success: true,
    templates: permissionTemplates
  });
});

// ✅ Add this test endpoint
router.get('/test-access', requireRole(['super_admin', 'admin']), (req, res) => {
  res.json({
    success: true,
    message: '✅ Role-based access is working!',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    },
    access: 'You have access to admin dashboard'
  });
});

// ==================== USER DETAILS ENDPOINTS ====================

// ✅ Get specific user details (for customer details page)
router.get('/users/:id/details', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const currentAdmin = req.user;
    
    console.log('📥 Request for user details:', userId, 'by admin:', currentAdmin.email);
    
    // Find user
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('✅ User found:', user.email, 'Role:', user.role);
    
    // Check if current admin can view this user
    if (currentAdmin.role === 'admin') {
      // Regular admin cannot view super_admin users
      if (user.role === 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied to view super admin details'
        });
      }
    }
    
    // Format response
    const response = {
      success: true,
      user: {
        id: user._id,
        name: user.name || 'User',
        email: user.email,
        phone: user.phone || '',
        role: user.role || 'user',
        status: user.status || 'active',
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        permissions: user.permissions || []
      },
      permissions: {
        canChangeRole: currentAdmin.role === 'super_admin' || 
                      (currentAdmin.role === 'admin' && user.role !== 'super_admin')
      }
    };
    
    console.log('📤 Sending user details response');
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error fetching user details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details',
      error: error.message
    });
  }
});

// ✅ Update user role (for customer details page)
router.put('/users/:id/role-management', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const { role, reason, changedBy } = req.body;
    const currentAdmin = req.user;
    
    console.log('🔄 Role update request:', {
      userId,
      requestedRole: role,
      reason,
      changedBy,
      admin: currentAdmin.email
    });
    
    // Validate role
    const validRoles = ['user', 'music-admin', 'hall-admin', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const oldRole = user.role || 'user';
    console.log(`🔄 Current role: ${oldRole}, Requested role: ${role}`);
    
    // Check permissions based on current admin role
    if (currentAdmin.role === 'admin') {
      // Regular admin can only assign user, music-admin, hall-admin roles
      const adminAllowedRoles = ['user', 'music-admin', 'hall-admin'];
      
      if (!adminAllowedRoles.includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Admin can only assign user, music-admin, or hall-admin roles'
        });
      }
      
      // Admin cannot change other admins
      if (['admin', 'super_admin'].includes(oldRole)) {
        return res.status(403).json({
          success: false,
          message: 'Admin cannot change role of other administrators'
        });
      }
    }
    
    // Super admin checks
    if (currentAdmin.role === 'super_admin') {
      // Super admin cannot change their own role via this endpoint
      if (userId === currentAdmin.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change your own role. Use profile settings instead.'
        });
      }
      
      // Additional check: prevent demoting the last super admin
      if (oldRole === 'super_admin' && role !== 'super_admin') {
        const superAdminCount = await User.countDocuments({ role: 'super_admin' });
        if (superAdminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot demote the only remaining super admin'
          });
        }
      }
    }
    
    // Update role
    user.role = role;
    user.updatedAt = new Date();
    
    // Add to role history (optional)
    if (!user.roleHistory) user.roleHistory = [];
    user.roleHistory.push({
      oldRole,
      newRole: role,
      reason: reason || 'Role updated via admin panel',
      changedBy: changedBy || currentAdmin.email,
      changedById: currentAdmin.id,
      timestamp: new Date()
    });
    
    // Keep only last 10 entries
    if (user.roleHistory.length > 10) {
      user.roleHistory = user.roleHistory.slice(-10);
    }
    
    await user.save();
    console.log(`✅ Role updated: ${oldRole} → ${role}`);
    
    // Return updated user (without password)
    const updatedUser = await User.findById(userId).select('-password');
    
    res.json({
      success: true,
      message: `Role updated from ${oldRole} to ${role}`,
      user: updatedUser,
      changeLog: {
        oldRole,
        newRole: role,
        reason,
        changedBy: changedBy || currentAdmin.email,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message
    });
  }
});

// ✅ Get role change history for a user
router.get('/users/:id/role-history', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId).select('roleHistory name email role');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const history = user.roleHistory || [];
    
    // Format history for frontend
    const formattedHistory = history.map(entry => ({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      oldRole: entry.oldRole,
      newRole: entry.newRole,
      reason: entry.reason || 'No reason provided',
      changedBy: entry.changedBy,
      changedById: entry.changedById,
      timestamp: entry.timestamp
    }));
    
    // Sort by date (newest first)
    formattedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      success: true,
      total: formattedHistory.length,
      history: formattedHistory,
      userInfo: {
        id: user._id,
        name: user.name,
        email: user.email,
        currentRole: user.role
      }
    });
    
  } catch (error) {
    console.error('Error fetching role history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role history'
    });
  }
});

// ✅ Search users by email/name (for role management)
router.get('/search/users', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { query, role } = req.query;
    
    let searchQuery = {};
    
    // Role-based filtering
    const currentAdmin = req.user;
    if (currentAdmin.role === 'admin') {
      // Regular admin can only see non-admin users
      searchQuery.role = { $in: ['user', 'music_admin', 'hall_admin'] };
    }
    
    // Additional role filter
    if (role && role !== 'all') {
      searchQuery.role = role;
    }
    
    // Search query
    if (query) {
      searchQuery.$or = [
        { email: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ];
    }
    
    const users = await User.find(searchQuery)
      .select('_id name email phone role createdAt lastLogin')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      success: true,
      users
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

// ✅ Get user statistics by role
router.get('/stats/role-distribution', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const currentAdmin = req.user;
    
    let roleQuery = {};
    if (currentAdmin.role === 'admin') {
      // Regular admin can only see stats for non-admin roles
      roleQuery.role = { $in: ['user', 'music_admin', 'hall_admin'] };
    }
    
    const roleStats = await User.aggregate([
      { $match: roleQuery },
      { $group: { 
        _id: '$role', 
        count: { $sum: 1 },
        lastMonth: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        }
      }},
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      stats: roleStats,
      totalUsers: roleStats.reduce((sum, stat) => sum + stat.count, 0)
    });
    
  } catch (error) {
    console.error('Error fetching role stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role statistics'
    });
  }
});

module.exports = router;