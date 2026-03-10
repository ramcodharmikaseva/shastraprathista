const mongoose = require('mongoose');
require('dotenv').config();

async function clearIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get the collection
    const collection = mongoose.connection.collection('orders');
    
    // Get all indexes
    const indexes = await collection.indexes();
    console.log('📊 Current indexes:');
    indexes.forEach(index => {
      console.log(`   - ${index.name}:`, index.key);
    });
    
    // Drop all indexes except _id_
    for (const index of indexes) {
      if (index.name !== '_id_') {
        await collection.dropIndex(index.name);
        console.log(`🗑️  Dropped index: ${index.name}`);
      }
    }
    
    console.log('✅ All duplicate indexes cleared');
    console.log('🔄 Restart your server to recreate proper indexes');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing indexes:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

clearIndexes();