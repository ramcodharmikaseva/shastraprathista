const mongoose = require('mongoose');
const dotenv = require('dotenv');
const MusicStudent = require('./models/MusicStudent');

dotenv.config();

const sampleStudents = [
    {
        name: "Priya S.",
        email: "priya@example.com",
        phone: "9876543210",
        className: "Carnatic Vocal",
        instructor: "Vidwan R. Srikrishnan",
        monthlyFee: 250,
        address: {
            street: "12 Gandhi Street",
            city: "Chennai",
            state: "Tamil Nadu",
            pincode: "600001"
        },
        guardianName: "Mr. S. Kumar",
        guardianPhone: "9876543211",
        status: "active"
    },
    {
        name: "Karthik R.",
        email: "karthik@example.com",
        phone: "9876543212",
        className: "Veena",
        instructor: "Lalitha Mageswari",
        monthlyFee: 280,
        address: {
            street: "45 Music Avenue",
            city: "Bangalore",
            state: "Karnataka",
            pincode: "560001"
        },
        guardianName: "Mrs. R. Devi",
        guardianPhone: "9876543213",
        status: "active"
    },
    {
        name: "Arjun M.",
        email: "arjun@example.com",
        phone: "9876543214",
        className: "Mridangam",
        instructor: "M. Gopalakrishnan",
        monthlyFee: 300,
        address: {
            street: "78 Rhythm Road",
            city: "Hyderabad",
            state: "Telangana",
            pincode: "500001"
        },
        guardianName: "Mr. M. Rao",
        guardianPhone: "9876543215",
        status: "active"
    },
    {
        // Give this one an explicit ID so we have a known test ID
        studentId: "TEST001",
        name: "Test Student",
        email: "test@example.com",
        phone: "9999999999",
        className: "Carnatic Vocal",
        instructor: "Vidwan R. Srikrishnan",
        monthlyFee: 250,
        address: {
            street: "Test Address",
            city: "Test City",
            state: "Test State",
            pincode: "123456"
        },
        guardianName: "Test Guardian",
        guardianPhone: "8888888888",
        status: "active"
    }
];

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await MusicStudent.deleteMany({});
        console.log('🗑️ Cleared existing music students');

        // Create students one by one to trigger pre-save hooks
        const createdStudents = [];
        for (const studentData of sampleStudents) {
            const student = new MusicStudent(studentData);
            await student.save();
            createdStudents.push(student);
            console.log(`✅ Created: ${student.name} (${student.studentId})`);
        }

        console.log(`\n🎵 Successfully created ${createdStudents.length} students`);
        console.log('='.repeat(60));
        createdStudents.forEach(student => {
            console.log(`${student.studentId}: ${student.name} - ${student.className} - ₹${student.monthlyFee}`);
        });
        console.log('='.repeat(60));

        console.log('\n📋 Test Student IDs for portal:');
        console.log('• TEST001 (explicit test ID)');
        console.log('• Or use email: test@example.com');
        console.log('• Or use phone: 9999999999');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

seedDatabase();