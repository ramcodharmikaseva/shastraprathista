const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// ===============================
// ✅ SIGNUP ROUTE
// ===============================
// ✅ DIRECT SIGNUP (NO OTP)
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    console.log('📝 Signup request:', { name, email, phone });

    // Validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, email, password, phone'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase().trim() }, 
        { phone: phone.trim() }
      ] 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone.trim(),
      role: 'user'
    });

    await user.save();

    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log(`✅ User created: ${user.email}`);

    res.json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account: ' + error.message
    });
  }
});

// ===============================
// ✅ LOGIN ROUTE
// ===============================
// ✅ DIRECT LOGIN WITH EMAIL AND PASSWORD (NO OTP)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('📝 Login request:', { email });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log(`✅ Login successful: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login: ' + error.message
    });
  }
});

// ===============================
// ✅ DEBUG: GET ALL USERS
// ===============================
router.get('/debug-all-users', async (req, res) => {
  try {
    const users = await User.find({}).select('name email phone role password createdAt');
    
    const usersWithPasswordInfo = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      passwordPrefix: user.password ? user.password.substring(0, 25) + '...' : 'NO PASSWORD',
      createdAt: user.createdAt
    }));

    res.json({
      success: true,
      totalUsers: users.length,
      users: usersWithPasswordInfo
    });

  } catch (err) {
    console.error('Debug all users error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching users', 
      error: err.message 
    });
  }
});

// ===============================
// ✅ DEBUG: CHECK SPECIFIC USER
// ===============================
router.post('/debug-user', async (req, res) => {
  try {
    console.log('Debug user request body:', req.body);
    
    if (!req.body) {
      return res.status(400).json({ 
        success: false,
        message: 'Request body is missing' 
      });
    }

    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required in request body' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found in database' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        hasPassword: !!user.password,
        passwordHashPrefix: user.password ? user.password.substring(0, 20) + '...' : 'No password',
        createdAt: user.createdAt
      }
    });

  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Debug error', 
      error: err.message 
    });
  }
});

// ===============================
// ✅ PASSWORD RESET (FIXED - handles missing fields)
// ===============================
router.post('/reset-password', async (req, res) => {
  try {
    console.log('Reset password request body:', req.body);
    
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // ✅ FIX: Handle missing required fields for existing users
    if (!user.phone) {
      user.phone = "7904873811"; // Use a default phone number
    }
    
    if (!user.role) {
      user.role = "user"; // Set default role
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    // ✅ Save without validation for existing users
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during password reset', 
      error: err.message 
    });
  }
});

// ===============================
// ✅ CHANGE PASSWORD (Protected Route) - NOW WORKS
// ===============================
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'New password must be at least 6 characters long' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        success: false,
        message: 'Current password is incorrect' 
      });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during password change', 
      error: err.message 
    });
  }
});

// In your routes/auth.js, add this debug endpoint
router.post('/debug-check-user', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('🔍 Debug checking user:', email);
    
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.json({
        success: false,
        message: 'User not found in database',
        exists: false
      });
    }
    
    res.json({
      success: true,
      exists: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        hasPassword: !!user.password,
        passwordHash: user.password ? 'Hashed (exists)' : 'No password'
      }
    });
    
  } catch (err) {
    console.error('Debug check error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// ✅ GET USER PROFILE
// ===============================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ===============================
// ✅ CHECK USER ROLE (Protected Route) - UPDATED
// ===============================
router.get('/check-role', authMiddleware, async (req, res) => {
  try {
    // Get fresh user data from database
    const user = await User.findById(req.user.id).select('email role');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isAdmin: user.role === 'admin' || user.role === 'super_admin'
      }
    });
  } catch (err) {
    console.error('Check role error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error checking user role' 
    });
  }
});

// ===============================
// ✅ DEBUG/TEST ENDPOINTS
// ===============================

// Test if API is working
router.get('/test-connection', (req, res) => {
  console.log('🔍 Test connection endpoint called');
  res.json({
    success: true,
    message: 'API is working correctly!',
    timestamp: new Date().toISOString(),
    user: req.user || 'No user logged in',
    endpoints: {
      signup: 'POST /api/auth/signup',
      login: 'POST /api/auth/login',
      sendSignupOTP: 'POST /api/auth/send-signup-otp',
      sendLoginOTP: 'POST /api/auth/send-login-otp',
      verifySignupOTP: 'POST /api/auth/verify-signup-otp',
      verifyLoginOTP: 'POST /api/auth/verify-login-otp'
    }
  });
});

module.exports = router;