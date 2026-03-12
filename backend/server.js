const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet'); // ✅ ADD THIS IMPORT
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

// Apply authMiddleware to ALL routes that need authentication
// Don't use app.use(authMiddleware) globally - apply to specific routes

dotenv.config();

const app = express();

// ✅ TEMPORARY: Allow all origins (for testing only)
app.use(cors({
  origin: true,
  credentials: true
}));

// ✅ Body parsing middleware (CRITICAL)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ Serve book images
app.use('/images', express.static(path.join(__dirname, 'public/images')));


// ✅ HELMET SECURITY MIDDLEWARE ONLY - REMOVE THE CUSTOM CSP MIDDLEWARE
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ✅ Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request Body:', JSON.stringify(req.body).substring(0, 200) + '...');
  }
  next();
});

// Add this at the VERY TOP of backend/server.js
console.log('🚀 STARTUP PHASE 1: Server.js loaded');
console.log('Current Directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('PORT env:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Add error handlers for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
});


// ✅ IMPORT MODELS FROM SEPARATE FILES
const User = require('./models/User');
const Order = require('./models/Order');
const Book = require('./models/Book');
const MusicStudent = require('./models/MusicStudent'); // ← ADD THIS

// ===============================
// ✅ SIMPLE TEST ROUTES (Add to server.js)
// ===============================

// Test if routes are working
app.get('/api/test-simple', (req, res) => {
  console.log('✅ Simple test route called');
  res.json({
    success: true,
    message: 'Simple test route is working!',
    timestamp: new Date().toISOString(),
    note: 'This means the server is responding correctly'
  });
});

// In server.js, add this temporary test route before other routes
app.get('/api/inventory/test', (req, res) => {
  res.json({
    success: true,
    message: 'Inventory test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// ✅ Import routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const bookRoutes = require('./routes/books');
const customerRoutes = require('./routes/customers');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');
const musicRoutes = require('./routes/music'); // Public music routes
const musicAdminRoutes = require('./routes/musicAdmin'); // ADD THIS - Music admin portal routes
const hallAdminRoutes = require('./routes/hallAdmin');
const inventoryRoutes = require('./routes/inventoryRoutes');
const roleAdminRoutes = require('./routes/roleAdmin');
const fs = require('fs');

// ✅ Import auth middleware
const authMiddleware = require('./middleware/authMiddleware');

// ========== PUBLIC ROUTES ==========
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/music', musicRoutes);

// ========== PROTECTED ROUTES ==========
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);

// ========== ADMIN PORTALS ==========
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/music-admin', authMiddleware, musicAdminRoutes);
app.use('/api/halls', hallAdminRoutes);
app.use('/api/role-admin', authMiddleware, roleAdminRoutes);
app.use('/api/inventory', inventoryRoutes);

// File uploads (public access to uploaded files)
app.use('/uploads', express.static('uploads'));

// Also serve files from public directory
app.use('/public', express.static('public'));

// Add this to your main server.js
app.use('/receipts', express.static(path.join(__dirname, 'receipts')));

// ✅ OPTIONAL: Cart endpoints for cross-device sync
app.get('/api/cart', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log(`📥 GET /api/cart for user: ${userId}`);
        
        if (!global.userCarts) {
            global.userCarts = {};
        }
        
        const userCart = global.userCarts[userId] || { items: [] };
        
        console.log(`📤 Sending ${userCart.items.length} items to frontend for user ${userId}`);
        
        res.json({
            items: userCart.items,
            message: 'Cart retrieved successfully',
            userId: userId
        });
        
    } catch (error) {
        console.error('❌ Error fetching cart:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

app.post('/api/cart', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { items } = req.body;
        
        console.log(`💾 POST /api/cart for user ${userId}:`, items.length, 'items');
        
        if (!global.userCarts) {
            global.userCarts = {};
        }
        
        global.userCarts[userId] = { items: items };
        
        console.log(`📋 Stored ${items.length} items for user ${userId} (cross-device sync)`);
        
        res.json({ 
            message: 'Cart saved successfully for cross-device sync',
            itemsCount: items.length,
            userId: userId
        });
        
    } catch (error) {
        console.error('❌ Error saving cart:', error);
        res.status(500).json({ error: 'Failed to save cart' });
    }
});

// ✅ UPDATED: MongoDB connection without deprecated options
mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log('✅ MongoDB Connected Successfully');
  console.error('Full error:', err);
})
.catch(err => {
  // Don't exit immediately - let's see if this is the problem
  // process.exit(1); // Comment this out temporarily
});

// ✅ Admin Token Verification Endpoint (optional, for frontend to check token)
app.get('/api/admin/verify', authMiddleware, (req, res) => {
    res.json({
        success: true,
        user: req.user,
        message: 'Token is valid'
    });
});

// ✅ Root route
app.get('/', (req, res) => {
  res.json({ 
    message: '📦 Backend server running successfully 🚀',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/auth/signup',
      '/api/auth/login',
      '/api/auth/reset-password',
      '/api/orders (CRITICAL - Checkout)',
      '/api/books',
      '/api/profile'
    ],
    note: 'Cart management handled via localStorage for better performance'
  });
});

// ✅ Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    cartSystem: 'localStorage-based (optimal for e-commerce)',
    inventory: 'Server-side inventory management enabled'
  });
});

// Add this near your other routes
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    message: 'Shastraprathista is running'
  });
});

// ✅ Route to list all available endpoints
app.get('/api', (req, res) => {
  res.json({
    message: 'Available API Endpoints',
    critical: {
      'POST /api/orders': 'Create order from cart (Checkout)',
      'GET /api/orders': 'Get user order history',
      'POST /api/auth/login': 'User authentication'
    },
    inventory: {
      'POST /api/orders/checkout': 'Automatically updates inventory',
      'Book Model': 'Server-side inventory tracking'
    },
    optional: {
      'GET /api/cart': 'Get user cart (cross-device sync)',
      'POST /api/cart': 'Save user cart (cross-device sync)'
    },
    informational: {
      'GET /api/books': 'Get all books',
      'GET /api/profile': 'Get user profile'
    },
    note: 'Cart management primarily handled via browser localStorage for optimal performance'
  });
});

app.get('/api/fix-tax-now', async (req, res) => {
  try {
    console.log('🔄 Fixing orders tax via Postman...');
    
    const orders = await Order.find({});
    let fixedCount = 0;
    
    for (const order of orders) {
      const correctTotal = order.totals.subtotal + order.totals.shipping - (order.totals.discount || 0);
      
      await Order.updateOne(
        { _id: order._id },
        { 
          $set: { 
            'totals.tax': 0,
            'totals.total': correctTotal
          } 
        }
      );
      fixedCount++;
    }
    
    console.log(`✅ Fixed ${fixedCount} orders`);
    res.json({ 
      success: true, 
      fixed: fixedCount,
      message: `Removed tax from ${fixedCount} orders. All totals updated correctly.`
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Global Error Handler:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Serve book images
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Add to server.js
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// ✅ Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Add this line

// ✅ TEMPORARY DEBUG ROUTE - Check image files
app.get('/debug/images/:bookId', async (req, res) => {
    const { bookId } = req.params;
    const imagesPath = path.join(__dirname, 'public/images', bookId);
    
    try {
        // Check if directory exists
        const fs = require('fs');
        if (!fs.existsSync(imagesPath)) {
            return res.json({
                success: false,
                error: 'Directory not found',
                path: imagesPath,
                publicContents: fs.existsSync(path.join(__dirname, 'public')) 
                    ? fs.readdirSync(path.join(__dirname, 'public')) 
                    : 'public folder not found'
            });
        }
        
        // List all files in the directory
        const files = fs.readdirSync(imagesPath);
        const fileDetails = files.map(file => {
            const filePath = path.join(imagesPath, file);
            const stats = fs.statSync(filePath);
            return {
                filename: file,
                size: stats.size,
                exists: true,
                url: `/images/${bookId}/${file}`
            };
        });
        
        res.json({
            success: true,
            bookId: bookId,
            path: imagesPath,
            files: fileDetails,
            count: fileDetails.length
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            path: imagesPath
        });
    }
});

// ✅ Serve frontend HTML files directly
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/music-admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/music-admin.html'));
});

app.get('/hall-admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/hall-admin.html'));
});

app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/profile.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ✅ Catch-all route for frontend files (should be LAST before error handlers)
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Try to serve HTML files
  const filePath = path.join(__dirname, '../frontend', req.path);
  const indexPath = path.join(__dirname, '../frontend/index.html');
  
  // Check if file exists
  if (fs.existsSync(filePath) && !req.path.endsWith('.html')) {
    return res.sendFile(filePath);
  }
  
  // If it's an HTML file or doesn't exist, serve index.html for SPA routing
  res.sendFile(indexPath);
});

// ✅ 404 handler for API routes (AFTER the static routes)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  
  // Display network IP addresses for local network access
  if (HOST === '0.0.0.0') {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    console.log('\n🌐 Network Access URLs:');
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`📍 http://${net.address}:${PORT}`);
        }
      }
    }
  }
  
  console.log(`🔍 API Docs: http://localhost:${PORT}/api`);
  console.log(`❤️ Health: http://localhost:${PORT}/health`);
  console.log(`🛒 Cart System: localStorage-based (optimal for e-commerce)`);
  console.log(`📦 Inventory: Server-side inventory management enabled`);
  console.log(`📚 Actual Books: Loaded from book-data.js`);
  console.log(`💳 Critical: Order endpoints ready for checkout`);
});

