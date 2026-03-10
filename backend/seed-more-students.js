const mongoose = require('mongoose');
const dotenv = require('dotenv');
const MusicStudent = require('./models/MusicStudent');

dotenv.config();

const moreStudents = [
    {
        name: "Meena R.",
        email: "meena@example.com",
        phone: "9876543220",
        className: "Carnatic Vocal",
        instructor: "Vidwan R. Srikrishnan",
        monthlyFee: 250,
        gender: "female",
        status: "active",
        paymentStatus: "paid",
        lastPaymentDate: new Date(),
        nextPaymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
        name: "Ravi K.",
        email: "ravi@example.com",
        phone: "9876543221",
        className: "Veena",
        instructor: "Lalitha Mageswari",
        monthlyFee: 280,
        gender: "male",
        status: "active",
        paymentStatus: "pending"
    },
    {
        name: "Sita R.",
        email: "sita@example.com",
        phone: "9876543222",
        className: "Mridangam",
        instructor: "M. Gopalakrishnan",
        monthlyFee: 300,
        gender: "female",
        status: "active",
        paymentStatus: "paid",
        lastPaymentDate: new Date(),
        nextPaymentDue: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
    }
];

async function addMoreStudents() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Don't clear existing data, just add more
        const createdStudents = [];
        
        for (const studentData of moreStudents) {
            const student = new MusicStudent(studentData);
            await student.save();
            createdStudents.push(student);
            console.log(`✅ Added: ${student.name} (${student.studentId})`);
        }

        console.log(`\n🎵 Added ${createdStudents.length} more students`);
        console.log('='.repeat(60));
        
        const allStudents = await MusicStudent.find().sort({ createdAt: -1 });
        console.log(`📊 Total students in database: ${allStudents.length}`);
        
        console.log('\n🔑 Test IDs for portal:');
        allStudents.slice(0, 5).forEach(student => {
            console.log(`• ${student.studentId} - ${student.name} (${student.className})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addMoreStudents();