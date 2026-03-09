const mongoose = require('mongoose');
require('dotenv').config();

// ✅ Use a more flexible schema for migration
const OrderSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Order = mongoose.model('Order', OrderSchema);

async function migrateOrders() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for migration');

    // Use strict: false to get all documents regardless of schema
    const orders = await Order.find({});
    console.log(`📦 Found ${orders.length} orders to migrate`);

    let updatedCount = 0;

    for (const order of orders) {
      let needsUpdate = false;

      // ✅ Generate orderId if missing
      if (!order.orderId) {
        order.orderId = `MIG${order._id.toString().substr(-6)}${Date.now().toString().substr(-4)}`.toUpperCase();
        needsUpdate = true;
        console.log(`   Generated orderId: ${order.orderId}`);
      }

      // ✅ Normalize status values
      const oldStatus = order.status;
      if (order.status === 'Pending') {
        order.status = 'pending';
        needsUpdate = true;
      } else if (order.status === 'Processing') {
        order.status = 'processing';
        needsUpdate = true;
      } else if (order.status === 'Shipped') {
        order.status = 'shipped';
        needsUpdate = true;
      } else if (order.status === 'Delivered') {
        order.status = 'delivered';
        needsUpdate = true;
      } else if (!order.status) {
        order.status = 'pending';
        needsUpdate = true;
      }

      if (oldStatus !== order.status) {
        console.log(`   Normalized status: ${oldStatus} → ${order.status}`);
      }

      // ✅ Ensure totals exists
      if (!order.totals && order.items) {
        const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        order.totals = {
          subtotal: subtotal,
          shipping: 0,
          tax: 0,
          discount: 0,
          total: subtotal
        };
        needsUpdate = true;
        console.log(`   Added totals: ₹${subtotal}`);
      }

      // ✅ Ensure statusHistory exists
      if (!order.statusHistory || order.statusHistory.length === 0) {
        order.statusHistory = [{
          status: order.status || 'pending',
          updatedAt: order.createdAt || new Date(),
          notes: 'Migrated from old schema'
        }];
        needsUpdate = true;
      }

      // ✅ Update itemTotal for each item
      if (order.items) {
        order.items.forEach(item => {
          if (!item.itemTotal) {
            item.itemTotal = (item.price * item.quantity) - (item.discount || 0);
            needsUpdate = true;
          }
        });
      }

      if (needsUpdate) {
        // Use updateOne to avoid validation issues
        await Order.updateOne(
          { _id: order._id },
          { 
            $set: {
              orderId: order.orderId,
              status: order.status,
              totals: order.totals,
              statusHistory: order.statusHistory,
              items: order.items,
              updatedAt: new Date()
            }
          }
        );
        updatedCount++;
        console.log(`✅ Updated order: ${order.orderId}`);
      } else {
        console.log(`➡️  No changes needed: ${order.orderId || order._id}`);
      }
    }

    console.log(`\n🎉 Migration complete! Updated ${updatedCount} out of ${orders.length} orders`);
    
    // Summary
    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📊 Order Status Summary:');
    statusCounts.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} orders`);
    });
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateOrders();