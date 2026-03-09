const mongoose = require('mongoose');
const dotenv = require('dotenv');
const MusicStudent = require('./models/MusicStudent');

dotenv.config();

async function seedSimple() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await MusicStudent.deleteMany({});
        console.log('🗑️ Cleared existing music students');

        // Create just one test student
        const testStudent = new MusicStudent({
            name: "Test Student",
            email: "test@example.com",
            phone: "9999999999",
            className: "Carnatic Vocal",
            instructor: "Vidwan R. Srikrishnan",
            monthlyFee: 250
        });

        await testStudent.save();
        console.log(`✅ Created test student: ${testStudent.name} (ID: ${testStudent.studentId})`);
        console.log(`📧 Email: test@example.com`);
        console.log(`📱 Phone: 9999999999`);
        console.log(`💰 Monthly Fee: ₹${testStudent.monthlyFee}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

seedSimple();