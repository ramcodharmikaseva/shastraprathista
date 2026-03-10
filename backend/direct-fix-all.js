// direct-fix-all.js - Fix ALL orders in the database
const mongoose = require('mongoose');
require('dotenv').config();

async function fixAllOrders() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const Order = require('./models/Order');
    
    // Get ALL orders
    const orders = await Order.find({});
    console.log(`📦 Found ${orders.length} orders to check...`);
    
    let fixedCount = 0;
    let correctCount = 0;
    
    for (const order of orders) {
      // Calculate what the total SHOULD be
      const correctTotal = order.totals.subtotal + order.totals.shipping;
      
      // Check if the stored total is wrong
      if (order.totals.total !== correctTotal) {
        console.log(`🔄 Fixing: ${order.orderId} - ${order.totals.total} → ${correctTotal}`);
        
        // Update the order
        order.totals.total = correctTotal;
        order.totals.tax = 0;
        order.updatedAt = new Date();
        
        await order.save();
        fixedCount++;
      } else {
        correctCount++;
      }
    }
    
    console.log('\n🎉 FINISHED!');
    console.log(`✅ Fixed: ${fixedCount} orders`);
    console.log(`✅ Already correct: ${correctCount} orders`);
    console.log(`📊 Total processed: ${orders.length} orders`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAllOrders();