// backend/scripts/setupRoles.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const path = require('path');

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function setupRoles() {
  try {
    console.log('🔧 Setting up admin roles...');
    
    // Check if MONGO_URI is set (it's MONGO_URI not MONGODB_URI in your .env)
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI is not set in environment variables');
      console.log('📁 Your .env has:', Object.keys(process.env).filter(k => k.includes('MONGO')));
      process.exit(1);
    }
    
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // 1. Update existing admin accounts to super_admin
    const superAdmins = [
      { email: 'ananthen116@gmail.com' },
      { email: 'shastraprathista@gmail.com' }
    ];
    
    for (const admin of superAdmins) {
      const user = await User.findOne({ email: admin.email });
      
      if (user) {
        user.role = 'super_admin';
        user.permissions = [
          { resource: '*', actions: ['*'] }
        ];
        await user.save();
        console.log(`✅ Updated ${admin.email} to super_admin`);
      } else {
        console.log(`⚠️ User not found: ${admin.email}`);
      }
    }
    
    // 2. Create demo music admin
    const musicAdminEmail = 'musicadmin@example.com';
    let musicAdmin = await User.findOne({ email: musicAdminEmail });
    
    if (!musicAdmin) {
      const hashedPassword = await bcrypt.hash('music123', 10);
      musicAdmin = new User({
        name: 'Music School Admin',
        email: musicAdminEmail,
        phone: '9876543210',
        password: hashedPassword,
        role: 'music_admin',
        permissions: [
          { resource: 'music', actions: ['read', 'create', 'update', 'manage_students'] },
          { resource: 'students', actions: ['read', 'create', 'update'] },
          { resource: 'courses', actions: ['read', 'create', 'update'] }
        ]
      });
      await musicAdmin.save();
      console.log(`✅ Created music admin: ${musicAdminEmail} / music123`);
    } else {
      musicAdmin.role = 'music_admin';
      musicAdmin.permissions = [
        { resource: 'music', actions: ['read', 'create', 'update', 'manage_students'] },
        { resource: 'students', actions: ['read', 'create', 'update'] },
        { resource: 'courses', actions: ['read', 'create', 'update'] }
      ];
      await musicAdmin.save();
      console.log(`✅ Updated existing user to music admin: ${musicAdminEmail}`);
    }
    
    // 3. Create demo hall admin
    const hallAdminEmail = 'halladmin@example.com';
    let hallAdmin = await User.findOne({ email: hallAdminEmail });
    
    if (!hallAdmin) {
      const hashedPassword = await bcrypt.hash('hall123', 10);
      hallAdmin = new User({
        name: 'Hall Booking Admin',
        email: hallAdminEmail,
        phone: '9876543211',
        password: hashedPassword,
        role: 'hall_admin',
        permissions: [
          { resource: 'hall', actions: ['read', 'create', 'update', 'manage_bookings'] },
          { resource: 'bookings', actions: ['read', 'create', 'update', 'approve'] },
          { resource: 'events', actions: ['read', 'create', 'update'] }
        ]
      });
      await hallAdmin.save();
      console.log(`✅ Created hall admin: ${hallAdminEmail} / hall123`);
    } else {
      hallAdmin.role = 'hall_admin';
      hallAdmin.permissions = [
        { resource: 'hall', actions: ['read', 'create', 'update', 'manage_bookings'] },
        { resource: 'bookings', actions: ['read', 'create', 'update', 'approve'] },
        { resource: 'events', actions: ['read', 'create', 'update'] }
      ];
      await hallAdmin.save();
      console.log(`✅ Updated existing user to hall admin: ${hallAdminEmail}`);
    }
    
    console.log('\n🎯 Role setup completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('----------------------');
    console.log('Super Admin 1: ananthen116@gmail.com (use your existing password)');
    console.log('Super Admin 2: shastraprathista@gmail.com (use your existing password)');
    console.log('Music Admin: musicadmin@example.com / music123');
    console.log('Hall Admin: halladmin@example.com / hall123');
    console.log('\n⚠️  Note: Update passwords for demo accounts in production!');
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up roles:', error.message);
    process.exit(1);
  }
}

setupRoles();