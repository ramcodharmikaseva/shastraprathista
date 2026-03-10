const mongoose = require('mongoose');
const dotenv = require('dotenv');
const MusicStudent = require('./models/MusicStudent');

dotenv.config();

const sampleStudents = [
    {
        studentId: "MS24001",
        name: "Priya S.",
        email: "priya@example.com",
        phone: "9876543210",
        className: "Carnatic Vocal",
        instructor: "Vidwan R. Srikrishnan",
        monthlyFee: 3000,
        dateOfBirth: new Date('2005-03-15'),
        gender: "female",
        status: "active",
        address: {
            street: "12 Gandhi Street",
            city: "Chennai",
            state: "Tamil Nadu",
            pincode: "600001"
        },
        guardianName: "Mr. S. Kumar",
        guardianPhone: "9876543211",
        batchTiming: "Monday, Wednesday, Friday 4-5 PM",
        notes: "Beginner student, shows good potential"
    },
    {
        studentId: "MS24002",
        name: "Karthik R.",
        email: "karthik@example.com",
        phone: "9876543212",
        className: "Veena",
        instructor: "Lalitha Mageswari",
        monthlyFee: 4000,
        dateOfBirth: new Date('2003-07-22'),
        gender: "male",
        status: "active",
        address: {
            street: "45 Music Avenue",
            city: "Bangalore",
            state: "Karnataka",
            pincode: "560001"
        },
        guardianName: "Mrs. R. Devi",
        guardianPhone: "9876543213",
        batchTiming: "Tuesday, Thursday 5-6 PM",
        notes: "Intermediate level, dedicated student"
    },
    {
        studentId: "MS24003",
        name: "Arjun M.",
        email: "arjun@example.com",
        phone: "9876543214",
        className: "Mridangam",
        instructor: "M. Gopalakrishnan",
        monthlyFee: 3500,
        dateOfBirth: new Date('2006-11-08'),
        gender: "male",
        status: "active",
        address: {
            street: "78 Rhythm Road",
            city: "Hyderabad",
            state: "Telangana",
            pincode: "500001"
        },
        guardianName: "Mr. M. Rao",
        guardianPhone: "9876543215",
        batchTiming: "Monday, Wednesday 6-7 PM",
        notes: "Rhythmically talented"
    },
    {
        studentId: "MS24004",
        name: "Anjali P.",
        email: "anjali@example.com",
        phone: "9876543216",
        className: "Violin",
        instructor: "Vidwan R. Srikrishnan",
        monthlyFee: 3500,
        dateOfBirth: new Date('2004-05-30'),
        gender: "female",
        status: "on_leave",
        address: {
            street: "23 Melody Lane",
            city: "Chennai",
            state: "Tamil Nadu",
            pincode: "600028"
        },
        guardianName: "Mrs. P. Sharma",
        guardianPhone: "9876543217",
        batchTiming: "Saturday 10-11 AM",
        notes: "On medical leave until next month"
    },
    {
        studentId: "MS24005",
        name: "Suresh K.",
        email: "suresh@example.com",
        phone: "9876543218",
        className: "Flute",
        instructor: "Other",
        monthlyFee: 3000,
        dateOfBirth: new Date('2007-01-12'),
        gender: "male",
        status: "active",
        address: {
            street: "34 Wind Street",
            city: "Coimbatore",
            state: "Tamil Nadu",
            pincode: "641001"
        },
        guardianName: "Mr. K. Raj",
        guardianPhone: "9876543219",
        batchTiming: "Friday 4-5 PM",
        notes: "Beginner, needs extra practice"
    },
    {
        studentId: "TEST001",
        name: "Test Student",
        email: "test@example.com",
        phone: "9999999999",
        className: "Carnatic Vocal",
        instructor: "Vidwan R. Srikrishnan",
        monthlyFee: 3000,
        gender: "male",
        status: "active",
        address: {
            street: "Test Street",
            city: "Test City",
            state: "Test State",
            pincode: "123456"
        },
        guardianName: "Test Guardian",
        guardianPhone: "8888888888"
    }
];

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await MusicStudent.deleteMany({});
        console.log('🗑️ Cleared existing music students');

        // Insert sample students
        await MusicStudent.insertMany(sampleStudents);
        console.log(`✅ Inserted ${sampleStudents.length} sample music students`);

        // Display created students
        const students = await MusicStudent.find().sort({ studentId: 1 });
        console.log('\n📋 Created Students:');
        students.forEach(student => {
            console.log(`${student.studentId}: ${student.name.padEnd(20)} - ${student.className.padEnd(15)} - ₹${student.monthlyFee}`);
        });

        console.log('\n🎵 Student IDs for testing:');
        console.log('• MS24001 - Priya S. (Carnatic Vocal)');
        console.log('• MS24002 - Karthik R. (Veena)');
        console.log('• MS24003 - Arjun M. (Mridangam)');
        console.log('• TEST001 - Test Student (Carnatic Vocal)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();