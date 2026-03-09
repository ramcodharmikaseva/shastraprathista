const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// ✅ OTP IMPORTS (ONCE ONLY - KEEP THESE)
const OTP = require('../models/OTP');
const { generateOTP, storeOTP, verifyOTP } = require('../utils/otpUtils');
const { sendOTPEmail } = require('../utils/emailService');

// ===============================
// ✅ SIGNUP ROUTE
// ===============================
router.post('/signup', async (req, res) => {
  try {
    console.log('Signup request body:', req.body);
    
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required: name, email, password, phone' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email format' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }

    const existingUser = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already registered' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone.trim(),
      role: role || 'user'
    });

    await user.save();

    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,  // ✅ Add email
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: { 
        id: user._id,
        name: user.name, 
        email: user.email, 
        phone: user.phone,
        role: user.role 
      }
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration', 
      error: err.message 
    });
  }
});

// ===============================
// ✅ LOGIN ROUTE
// ===============================
router.post('/login', async (req, res) => {
  try {
    console.log('Login request body:', req.body);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if password exists
    if (!user.password) {
      return res.status(401).json({ 
        success: false,
        message: 'This account has no password set. Please use password reset.' 
      });
    }

    const isMatch = await bcrypt.compare(password.trim(), user.password);

    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,  // ✅ Add email
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { 
        id: user._id,
        name: user.name, 
        email: user.email,
        phone: user.phone,
        role: user.role 
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login', 
      error: err.message 
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
// ✅ OTP ROUTES (UPDATED FOR TESTING)
// ===============================

// Send OTP for signup
router.post('/send-signup-otp', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('📧 Send signup OTP request:', { email });

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate and store OTP
    const otp = generateOTP();
    await storeOTP(email, null, otp, 'signup');

    console.log(`✅ OTP generated for ${email}: ${otp}`);
    
    // ✅ ACTUALLY SEND EMAIL (remove the test response)
    const emailSent = await sendOTPEmail(email, otp, 'signup');
    
    if (emailSent) {
      // ✅ Success - email sent
      res.json({
        success: true,
        message: 'OTP sent to your email successfully!'
        // Don't include OTP in production response
      });
    } else {
      // ❌ Email failed
      console.error(`❌ Email failed for ${email}`);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.',
        note: 'Check server logs for details'
      });
    }

  } catch (error) {
    console.error('❌ Send signup OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending OTP: ' + error.message
    });
  }
});

// Verify signup OTP and create user
router.post('/verify-signup-otp', async (req, res) => {
  try {
    const { name, email, phone, password, otp } = req.body;

    console.log('✅ Verify signup OTP request:', { 
      name: name?.substring(0, 10) + '...', 
      email, 
      phone, 
      otp 
    });

    // Validation
    if (!name || !email || !phone || !password || !otp) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Verify OTP
    const verification = await verifyOTP(email, null, otp, 'signup');
    
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
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
        email: user.email,  // ✅ Add email
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
    console.error('❌ Verify signup OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account: ' + error.message
    });
  }
});

// Send login OTP
router.post('/send-login-otp', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('📧 Send login OTP request:', { email });

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    const otp = generateOTP();
    await storeOTP(user.email, null, otp, 'login');

    console.log(`✅ Login OTP generated for ${user.email}: ${otp}`);
    
    // ✅ ACTUALLY SEND EMAIL
    const emailSent = await sendOTPEmail(user.email, otp, 'login');
    
    if (emailSent) {
      res.json({
        success: true,
        message: 'Login OTP sent to your email successfully!'
        // No OTP in response
      });
    } else {
      console.error(`❌ Failed to send email to ${user.email}`);
      res.status(500).json({
        success: false,
        message: 'Failed to send login OTP email. Please try again.'
      });
    }
    
  } catch (error) {
    console.error('❌ Send login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending login OTP: ' + error.message
    });
  }
});

// Verify login OTP
router.post('/verify-login-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('Verify login OTP request:', { email, otp });

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify OTP using email only
    const verification = await verifyOTP(user.email, null, otp, 'login');
    
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,  // ✅ Add email
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

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
    console.error('Verify login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login: ' + error.message
    });
  }
});

// ✅ FIXED: Send forgot password OTP (actually sends email)
router.post('/forgot-password-otp', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('Forgot password OTP request:', { email });

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    const otp = generateOTP();
    await storeOTP(user.email, null, otp, 'forgot-password');

    console.log(`✅ Password reset OTP generated for ${user.email}: ${otp}`);
    
    // ✅ ACTUALLY SEND EMAIL
    const emailSent = await sendOTPEmail(user.email, otp, 'forgot-password');
    
    if (emailSent) {
      res.json({
        success: true,
        message: 'Password reset OTP sent to your email successfully!'
      });
    } else {
      console.error(`❌ Failed to send password reset email to ${user.email}`);
      res.status(500).json({
        success: false,
        message: 'Failed to send password reset OTP. Please try again.'
      });
    }
    
  } catch (error) {
    console.error('Send forgot password OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending password reset OTP: ' + error.message
    });
  }
});

// Reset password with OTP
router.post('/reset-password-otp', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    console.log('Reset password with OTP request:', { email, otp });

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP and new password are required'
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

    // Verify OTP using email only
    const verification = await verifyOTP(user.email, null, otp, 'forgot-password');
    
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully!'
    });
  } catch (error) {
    console.error('Reset password OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password: ' + error.message
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

router.post('/debug-verify-otp', async (req, res) => {
  try {
    const { email, otp, type = 'login' } = req.body;
    
    console.log('🔍 [DEBUG] OTP verification for:', { email, otp, type });
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }
    
    // Clean the inputs
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();
    
    console.log('🔍 [DEBUG] Cleaned:', { cleanEmail, cleanOtp, type });
    
    // Check what's in the OTP database EXACTLY
    const otpRecord = await OTP.findOne({
      email: cleanEmail,
      type: type,
      otp: cleanOtp
    });
    
    console.log('🔍 [DEBUG] OTP record found:', otpRecord ? 'YES' : 'NO');
    
    if (otpRecord) {
      console.log('🔍 [DEBUG] OTP details:', {
        _id: otpRecord._id,
        email: otpRecord.email,
        otp: otpRecord.otp,
        type: otpRecord.type,
        expiresAt: otpRecord.expiresAt,
        createdAt: otpRecord.createdAt,
        now: new Date(),
        isExpired: new Date() > otpRecord.expiresAt,
        secondsRemaining: Math.floor((otpRecord.expiresAt - new Date()) / 1000)
      });
    } else {
      // Show ALL OTPs in database for debugging
      const allOtps = await OTP.find({});
      console.log('🔍 [DEBUG] ALL OTPs in database:', allOtps);
    }
    
    // Also show OTPs for this specific email
    const otpsForEmail = await OTP.find({ 
      email: cleanEmail,
      type: type 
    });
    
    res.json({
      success: true,
      otpRecordExists: !!otpRecord,
      otpDetails: otpRecord ? {
        email: otpRecord.email,
        otp: otpRecord.otp,
        type: otpRecord.type,
        expiresAt: otpRecord.expiresAt,
        isExpired: new Date() > otpRecord.expiresAt,
        createdAt: otpRecord.createdAt
      } : null,
      otpsForEmail: otpsForEmail,
      queryUsed: {
        email: cleanEmail,
        type: type,
        otp: cleanOtp
      }
    });
    
  } catch (error) {
    console.error('❌ [DEBUG] OTP error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// Test OTP system
router.get('/test-otp-system', async (req, res) => {
  try {
    console.log('🔍 Testing OTP system...');
    
    // Test if OTP functions are available
    const testOTP = generateOTP();
    
    // Test database connection
    const otpCount = await OTP.countDocuments();
    
    res.json({
      success: true,
      message: 'OTP System Test',
      otpGenerated: testOTP,
      otpCount: otpCount,
      mongoConnected: true,
      otpFunctionsAvailable: {
        generateOTP: typeof generateOTP === 'function',
        storeOTP: typeof storeOTP === 'function',
        verifyOTP: typeof verifyOTP === 'function'
      }
    });
  } catch (error) {
    console.error('OTP system test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Debug email configuration
const nodemailer = require('nodemailer'); // Add this import

router.get('/debug-email', async (req, res) => {
  try {
    console.log('🔍 Debugging email configuration...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
    console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'Set' : 'Not set');
    
    // Test the transporter
    const testTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    // Verify connection
    await testTransporter.verify();
    
    res.json({
      success: true,
      message: 'Email configuration is correct',
      email: process.env.EMAIL_USER,
      password_set: !!process.env.EMAIL_PASSWORD
    });
    
  } catch (error) {
    console.error('❌ Email debug error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Email configuration error: ' + error.message,
      note: 'Make sure EMAIL_PASSWORD is a valid Gmail App Password'
    });
  }
});

// Debug login OTP
router.post('/debug-login-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('🔍 Debug login OTP for:', email);
    
    if (!email) {
      return res.json({
        success: false,
        message: 'Email required'
      });
    }
    
    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (user) {
      console.log('User details:', {
        id: user._id,
        email: user.email,
        name: user.name
      });
      
      // Test OTP generation
      const otp = generateOTP();
      console.log('OTP would be:', otp);
      
      // Test email sending
      console.log('Testing email to:', user.email);
      const emailSent = await sendOTPEmail(user.email, '123456', 'login-test');
      console.log('Email sent:', emailSent ? 'Yes' : 'No');
    }
    
    res.json({
      success: true,
      user_exists: !!user,
      user_email: user ? user.email : null,
      test_complete: true
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;