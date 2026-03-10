const express = require('express');
const router = express.Router();
const User = require('../models/User'); // make sure this file exists in models/

// ✅ Get all customers
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password'); // exclude passwords
    res.json(users);
  } catch (err) {
    console.error('❌ Failed to fetch customers:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// ✅ Get single customer by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Customer not found' });
    res.json(user);
  } catch (err) {
    console.error('❌ Error fetching customer:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ DEBUG: Get all customers with IDs - ADD THIS
router.get('/debug/all-customers', async (req, res) => {
  try {
    const customers = await User.find().select('_id name email phone role createdAt').limit(20);
    
    console.log('=== CUSTOMERS DEBUG ===');
    customers.forEach(customer => {
      console.log(`👤 ${customer._id}: ${customer.name} - ${customer.email}`);
    });
    
    res.json({
      success: true,
      total: await User.countDocuments(),
      customers: customers
    });
  } catch (error) {
    console.error('Debug customers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
