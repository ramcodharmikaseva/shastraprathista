// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authMiddleware(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ 
        success: false,
        message: 'No token provided, access denied' 
      });
    }

    // DEBUG: Check token structure
    console.log('🔍 Token received:', token.substring(0, 50) + '...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // DEBUG: Check what's in the decoded token
    console.log('🔍 Decoded token payload:', {
      id: decoded.id,
      userId: decoded.userId,
      _id: decoded._id,
      email: decoded.email,
      role: decoded.role, // Check if role exists in token
      hasRole: !!decoded.role
    });
    
    // ✅ FIXED: Try multiple possible ID fields
    const userId = decoded.id || decoded.userId || decoded._id;
    
    if (!userId) {
      console.error('❌ No user ID found in token:', decoded);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token structure' 
      });
    }
    
    // ✅ CRITICAL FIX: Always fetch user from database
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.error('❌ User not found for ID:', userId);
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // ✅ FIXED: Ensure consistent user object
    req.user = {
      id: user._id.toString(),
      _id: user._id,
      email: user.email,
      role: user.role, // This comes from database, not token
      // Add any other user fields you need
      ...user.toObject()
    };
    
    console.log(`✅ Auth Middleware - User authenticated: ${user.email}, Role: ${user.role}, ID: ${user._id}`);
    
    // ✅ DEBUG: Log the exact user object structure
    console.log('🔍 req.user structure:', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      hasRole: !!req.user.role
    });
    
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.name, error.message);
    
    // Better error handling
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN' 
      });
    }
    
    res.status(401).json({ 
      success: false,
      message: 'Authentication failed' 
    });
  }
}

module.exports = authMiddleware;