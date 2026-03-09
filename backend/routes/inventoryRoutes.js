// backend/routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/auth'); // Simple auth middleware

// Public routes - no auth required
router.get('/status', inventoryController.checkInventoryBatch); // 👈 ADD THIS
router.get('/status/:bookId', inventoryController.checkInventory);
router.get('/low-stock', inventoryController.getLowStock);

// Protected routes - require auth
router.post('/reserve', auth, inventoryController.reserveStock);
router.post('/release', auth, inventoryController.releaseStock);
router.post('/update-after-purchase', auth, inventoryController.updateStockAfterPurchase);
router.post('/bulk-update', auth, inventoryController.bulkUpdateStock);

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Inventory test endpoint working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
