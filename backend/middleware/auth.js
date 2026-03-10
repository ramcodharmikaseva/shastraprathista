// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Simple auth middleware for inventory routes (optional authentication)
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // For public inventory checks, allow access without token
      console.log('📦 Inventory route - no token, allowing public access');
      req.user = null;
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId || decoded._id;
    
    if (!userId) {
      req.user = null;
      return next();
    }
    
    // ✅ FIXED: Fetch user from database to ensure consistent structure
    const user = await User.findById(userId).select('-password');
    
    if (user) {
      req.user = user;
      console.log('✅ Inventory auth - User:', user.email, 'Role:', user.role);
    } else {
      req.user = null;
      console.log('⚠️ Inventory auth - User not found in DB');
    }
    
    next();
  } catch (error) {
    console.log('⚠️ Inventory auth error:', error.message);
    req.user = null;
    next(); // Continue for public routes
  }
};

module.exports = auth;