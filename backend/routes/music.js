const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const PDFDocument = require('pdfkit');
const MusicStudent = require('../models/MusicStudent');
const Payment = require('../models/Payment'); // Add this
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const ReceiptGenerator = require('../utils/receiptGenerator');
const path = require('path');
const Teacher = require('../models/Teacher');
const ClassConfiguration = require('../models/ClassConfig'); // Add this
const ClassConfig = require('../models/ClassConfig');
const GSTSettings = require('../models/GSTSettings');


// ========== ABSOLUTE TOP TEST ROUTE ==========
router.get('/test-absolute', (req, res) => {
    console.log('🔥🔥🔥 ABSOLUTE TOP TEST ROUTE HIT! 🔥🔥🔥');
    res.json({ success: true, message: 'Absolute top test route working' });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create uploads directory if it doesn't exist
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accept only CSV files
        if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
            return cb(new Error('Only CSV files are allowed'));
        }
        cb(null, true);
    }
});

// Comment this out temporarily
// router.use((req, res, next) => {
//     console.log(`🚦 ${req.method} ${req.url}`);
//     next();
// });

// ========== TEST ROUTES ==========
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Test route working' });
});

router.get('/test-pdf/:id', (req, res) => {
    res.json({ success: true, message: `Test PDF with ID: ${req.params.id}` });
});

// Add this test route
router.get('/test-receipt-pdf/:number', (req, res) => {
    console.log('✅ TEST RECEIPT PDF ROUTE HIT!');
    res.json({ 
        success: true, 
        message: 'Test receipt PDF route working',
        number: req.params.number 
    });
});

// ========== RECEIPT ROUTES ==========
// 1. Get all distinct financial years
router.get('/receipts/financial-years', async (req, res) => {
    try {
        const years = await Receipt.distinct('financialYear');
        res.json({ success: true, years: years.length ? years : ['2025-26'] });
    } catch (error) {
        res.json({ success: true, years: ['2025-26'] });
    }
});

// 2. Search receipts
router.get('/receipts/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim() === '') {
            return res.json({ success: true, receipts: [] });
        }
        
        const searchRegex = new RegExp(q.trim(), 'i');
        const receipts = await Receipt.find({
            $or: [
                { receiptNumber: searchRegex },
                { 'receiptData.studentName': searchRegex }
            ]
        }).limit(50);
        
        res.json({ success: true, receipts });
    } catch (error) {
        res.json({ success: true, receipts: [] });
    }
});

// 3. Get receipts by financial year
router.get('/receipts/financial-year/:year', async (req, res) => {
    try {
        const receipts = await Receipt.find({ financialYear: req.params.year });
        res.json({ success: true, receipts });
    } catch (error) {
        res.json({ success: true, receipts: [] });
    }
});

// ========== COMPLETE PDF RECEIPT ROUTE ==========
router.get('/receipts/pdf/*', async (req, res) => {
    console.log('🎯 PDF ROUTE HIT!');
    const receiptNumber = req.params[0];
    console.log('Receipt number:', receiptNumber);
    
    try {
        // Find the receipt
        const receipt = await Receipt.findOne({ receiptNumber });
        
        if (!receipt) {
            console.log('❌ Receipt not found');
            return res.status(404).json({ 
                success: false, 
                error: 'Receipt not found',
                receiptNumber: receiptNumber
            });
        }
        
        console.log('✅ Receipt found:', receipt.receiptNumber);
        
        // Get payment details
        const payment = await Payment.findById(receipt.paymentId);
        
        // Create PDF document
        const doc = new PDFDocument({ 
            margin: 50, 
            size: 'A4'
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="receipt-${receiptNumber.replace(/\//g, '-')}.pdf"`);
        
        // Pipe PDF to response
        doc.pipe(res);
        
        // School Header
        doc.fontSize(14).font('Helvetica-Bold').text('SRI P.A.C. RAMASAMY RAJA MEMORIAL MUSIC SCHOOL', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('No.1, P.A.C. Ramasamy Raja Road, Rajapalayam - 626 117.', { align: 'center' });
        doc.fontSize(8).text('Phone: +91 8822334455 | Email: shastraprathista@gmail.com', { align: 'center' });
        
        doc.moveDown();
        doc.fontSize(12).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center', underline: true });
        
        doc.moveDown(2);
        
        // Receipt details box
        doc.rect(50, doc.y, 500, 120).stroke();
        
        const startY = doc.y + 15;
        
        // Left column
        doc.fontSize(10).font('Helvetica-Bold').text('Receipt No:', 60, startY);
        doc.font('Helvetica').text(receipt.receiptNumber, 140, startY);
        
        doc.font('Helvetica-Bold').text('Financial Year:', 60, startY + 20);
        doc.font('Helvetica').text(receipt.financialYear, 140, startY + 20);
        
        doc.font('Helvetica-Bold').text('Date:', 60, startY + 40);
        doc.font('Helvetica').text(new Date(receipt.receiptDate).toLocaleDateString('en-IN'), 140, startY + 40);
        
        doc.font('Helvetica-Bold').text('Payment Mode:', 60, startY + 60);
        doc.font('Helvetica').text((receipt.receiptData?.paymentMethod || 'Cash').toUpperCase(), 140, startY + 60);
        
        // Right column
        doc.font('Helvetica-Bold').text('Student ID:', 300, startY);
        doc.font('Helvetica').text(receipt.receiptData?.studentId || receipt.studentId, 380, startY);
        
        doc.font('Helvetica-Bold').text('Student Name:', 300, startY + 20);
        doc.font('Helvetica').text(receipt.receiptData?.studentName || '', 380, startY + 20);
        
        doc.font('Helvetica-Bold').text('Payment For:', 300, startY + 40);
        const paymentMonth = receipt.receiptData?.paymentMonth ? 
            new Date(receipt.receiptData.paymentMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 
            'N/A';
        doc.font('Helvetica').text(paymentMonth, 380, startY + 40);
        
        doc.moveDown(8);
        
        // Classes table
        const tableTop = doc.y + 20;
        
        doc.fontSize(12).font('Helvetica-Bold').text('Class Details:', 50, tableTop - 15);
        
        // Table headers
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('S.No', 50, tableTop);
        doc.text('Class Name', 100, tableTop);
        doc.text('Teacher', 250, tableTop);
        doc.text('Fees (₹)', 450, tableTop, { align: 'right' });
        
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        
        // Table rows
        let rowY = tableTop + 25;
        const classes = receipt.receiptData?.classes || [];
        
        if (classes.length === 0) {
            doc.font('Helvetica').text('No class details available', 100, rowY);
            rowY += 20;
        } else {
            classes.forEach((cls, index) => {
                doc.font('Helvetica');
                doc.text(`${index + 1}`, 50, rowY);
                doc.text(cls.className || 'N/A', 100, rowY);
                doc.text(cls.teacherName || 'Not Assigned', 250, rowY);
                doc.text(`₹${(cls.fees || 0).toFixed(2)}`, 450, rowY, { align: 'right' });
                rowY += 20;
            });
        }
        
        doc.moveTo(50, rowY - 5).lineTo(550, rowY - 5).stroke();
        
        // Amount breakdown
        const summaryY = rowY + 10;
        
        doc.font('Helvetica-Bold');
        doc.text('Subtotal:', 350, summaryY);
        doc.font('Helvetica');
        doc.text(`₹${(receipt.receiptData?.baseAmount || 0).toFixed(2)}`, 450, summaryY, { align: 'right' });
        
        doc.font('Helvetica-Bold');
        doc.text(`GST (${receipt.receiptData?.gstPercentage || 0}%):`, 350, summaryY + 20);
        doc.font('Helvetica');
        doc.text(`₹${(receipt.receiptData?.gstAmount || 0).toFixed(2)}`, 450, summaryY + 20, { align: 'right' });
        
        // Total
        doc.moveTo(350, summaryY + 35).lineTo(550, summaryY + 35).stroke();
        
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('TOTAL AMOUNT:', 300, summaryY + 45);
        doc.fontSize(14).text(`₹${(receipt.receiptData?.totalAmount || 0).toFixed(2)}`, 450, summaryY + 45, { align: 'right' });
        
        // Amount in words - with safety check
        const amountInWords = receipt.receiptData?.totalAmount ? numberToWords(receipt.receiptData.totalAmount) : 'Zero Rupees Only';
        doc.moveDown(4);
        doc.fontSize(9).font('Helvetica');
        doc.text(`Amount in words: ${amountInWords}`, 50, doc.y + 30);
        
        // Footer
        doc.moveDown(4);
        doc.fontSize(8).text('This is a computer generated receipt. No signature required.', { align: 'center' });
        doc.text('Thank you for your payment!', { align: 'center' });
        
        // Finalize PDF
        doc.end();
        
        console.log('✅ PDF generated and sent successfully');
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        // Only send error response if headers haven't been sent yet
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                error: 'Error generating PDF',
                message: error.message 
            });
        }
    }
});

// 5. Generate receipt (POST)
router.post('/receipts/generate', async (req, res) => {
    res.json({ success: true, message: 'Generate route working' });
});

// 6. Get receipt by identifier (LAST)
router.get('/receipts/:identifier', async (req, res) => {
    const receipt = await Receipt.findOne({ receiptNumber: req.params.identifier });
    res.json({ success: true, receipt });
});

// ========== HELPER FUNCTIONS ==========
function getCurrentFinancialYear() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return month >= 4 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;
}

function getNextFinancialYear(currentFY) {
    const [start] = currentFY.split('-').map(Number);
    return `${start + 1}-${(start + 2).toString().slice(-2)}`;
}

async function generateReceiptNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    let financialYear;
    if (month >= 4) {
        financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
        financialYear = `${year - 1}-${year.toString().slice(-2)}`;
    }
    
    const lastReceipt = await Receipt.findOne({ 
        financialYear: financialYear 
    }).sort({ receiptNumber: -1 });
    
    let nextNumber = 1;
    if (lastReceipt) {
        const lastNumber = parseInt(lastReceipt.receiptNumber.split('/')[2]);
        nextNumber = lastNumber + 1;
    }
    
    const sequenceNumber = nextNumber.toString().padStart(3, '0');
    const receiptNumber = `MS/${financialYear}/${sequenceNumber}`;
    
    return {
        receiptNumber,
        financialYear,
        sequenceNumber
    };
}

async function getTeacherForClass(className) {
    try {
        const ClassConfig = require('../models/ClassConfig');
        const config = await ClassConfig.findOne({ className }).populate('teacherId');
        return config?.teacherId?.name || config?.teacherName || 'Not Assigned';
    } catch (error) {
        return 'Not Assigned';
    }
}

// ========== NUMBER TO WORDS FUNCTION ==========
function numberToWords(num) {
    if (!num || num === 0) return 'Zero Rupees Only';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const numStr = num.toFixed(2).toString();
    const [rupees, paise] = numStr.split('.');
    
    const rupeesNum = parseInt(rupees);
    const paiseNum = parseInt(paise || '0');
    
    function convertLessThanOneThousand(n) {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertLessThanOneThousand(n % 100) : '');
    }
    
    function convert(n) {
        if (n < 1000) return convertLessThanOneThousand(n);
        if (n < 100000) return convertLessThanOneThousand(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convertLessThanOneThousand(n % 1000) : '');
        return convertLessThanOneThousand(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    }
    
    let result = convert(rupeesNum) + ' Rupees';
    if (paiseNum > 0) {
        result += ' and ' + convert(paiseNum) + ' Paise';
    }
    result += ' Only';
    
    return result;
}

// ========== EXISTING ROUTES (keep as is) ==========

// ✅ Add new student - MODIFIED for siblings
router.post('/add-student', async (req, res) => {
    try {
        const studentData = req.body;
        
        // MODIFIED: Allow siblings with same email/phone but different names
        // Only block if EXACT same name + email + phone exists (duplicate registration)
        const existingStudent = await MusicStudent.findOne({
            name: studentData.name,
            email: studentData.email,
            phone: studentData.phone
        });

        if (existingStudent) {
            return res.status(400).json({
                success: false,
                message: 'Student with this exact name, email and phone already exists'
            });
        }

        // Don't block on just email or phone - allow siblings!
        // Just log it for tracking
        const siblingsWithSameEmail = await MusicStudent.countDocuments({
            email: studentData.email,
            phone: studentData.phone
        });
        
        if (siblingsWithSameEmail > 0) {
            console.log(`📝 Adding sibling #${siblingsWithSameEmail + 1} for family with email: ${studentData.email}`);
        }

        // ===== Validate classes against database =====
        if (studentData.classes && studentData.classes.length > 0) {
            // Get all valid teachers and class configs
            const [teachers, classConfigs] = await Promise.all([
                Teacher.find({}, 'name'),
                ClassConfig.find({ active: true }, 'className teacherName baseFee')
            ]);

            const validTeacherNames = teachers.map(t => t.name);
            const validClassNames = classConfigs.map(c => c.className);
            
            // Create a map for quick fee lookup
            const classFeeMap = {};
            classConfigs.forEach(c => {
                classFeeMap[c.className] = c.baseFee;
            });

            // Validate each class in the student's enrollment
            for (let i = 0; i < studentData.classes.length; i++) {
                const cls = studentData.classes[i];
                
                // Validate class name
                if (!validClassNames.includes(cls.className)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid class name: "${cls.className}". Class must exist in class configurations.`
                    });
                }
                
                // Validate instructor
                if (!validTeacherNames.includes(cls.instructor)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid instructor: "${cls.instructor}". Teacher must exist in teacher list.`
                    });
                }
                
                // Auto-correct fee to match class configuration
                const expectedFee = classFeeMap[cls.className];
                if (expectedFee && cls.monthlyFee !== expectedFee) {
                    console.log(`Auto-correcting fee for ${cls.className}: ${cls.monthlyFee} -> ${expectedFee}`);
                    cls.monthlyFee = expectedFee;
                }
            }
            
            // Recalculate total monthly fee based on validated fees
            studentData.totalMonthlyFee = studentData.classes.reduce((sum, cls) => sum + cls.monthlyFee, 0);
        }

        const student = new MusicStudent(studentData);
        await student.save();

        res.json({
            success: true,
            message: 'Student added successfully',
            student: {
                studentId: student.studentId,
                name: student.name,
                classes: student.classes,
                totalMonthlyFee: student.totalMonthlyFee,
                joinDate: student.joinDate
            }
        });
    } catch (error) {
        console.error('Error adding student:', error);
        
        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: Object.values(error.errors).map(e => e.message)
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error adding student',
            error: error.message
        });
    }
});

// ROUTE 1: Get student by ID (single student)
// ROUTE 1: Get student by ID (single student)
// COMMENT THIS OUT - IT'S CONFLICTING WITH THE FIXED VERSION BELOW
/*
router.get('/students/:id', async (req, res) => {
    try {
        const id = req.params.id;
        console.log('🔍 Searching for student with ID:', id);
        
        let student;
        
        // Try by studentId first
        student = await MusicStudent.findOne({ studentId: id });
        
        // If not found, try by _id
        if (!student && id.match(/^[0-9a-fA-F]{24}$/)) {
            student = await MusicStudent.findById(id);
        }
        
        if (!student) {
            return res.status(404).json({ 
                success: false, 
                message: 'Student not found' 
            });
        }
        
        res.json({
            success: true,
            student: student
        });
        
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});
*/

// ROUTE 2: Get ALL students by parent contact (email/phone)
router.get('/students/by-contact/:contact', async (req, res) => {
    try {
        const contact = req.params.contact;
        console.log(`🔍 Searching for ALL students with parent contact: ${contact}`);
        
        // Check if it's email or phone
        const isEmail = contact.includes('@');
        let query;
        
        if (isEmail) {
            // Search by parent email
            query = { parentEmail: contact };
        } else {
            // Search by parent phone - handle different formats
            const cleanPhone = contact.replace(/\D/g, '');
            query = {
                $or: [
                    { parentPhone: contact },
                    { parentPhone: cleanPhone },
                    { parentPhone: `+91${cleanPhone}` }, // India format
                    { parentPhone: `0${cleanPhone}` } // With leading zero
                ]
            };
        }
        
        const students = await MusicStudent.find(query);
        
        if (!students || students.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No students found with this contact information' 
            });
        }
        
        // Get parent info from first student
        const parentInfo = {
            email: students[0].parentEmail,
            phone: students[0].parentPhone,
            name: students[0].parentName || 'Parent'
        };
        
        res.json({
            success: true,
            multipleStudents: students.length > 1,
            students: students,
            parentInfo: parentInfo,
            count: students.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching students by contact:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error while fetching students' 
        });
    }
});

// ROUTE 3: Combined search (optional) - tries both methods
router.get('/students/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        console.log('🔍 Combined search for:', query);
        
        const isEmail = query.includes('@');
        const isStudentId = /^MS\d+$/i.test(query);
        
        let students = [];
        let searchMethod = '';
        
        if (isStudentId) {
            // Search by student ID
            searchMethod = 'studentId';
            const student = await MusicStudent.findOne({ studentId: query });
            if (student) students = [student];
        } else if (isEmail) {
            // Search by parent email
            searchMethod = 'parentEmail';
            students = await MusicStudent.find({ parentEmail: query });
        } else {
            // Search by parent phone
            searchMethod = 'parentPhone';
            const cleanPhone = query.replace(/\D/g, '');
            students = await MusicStudent.find({
                $or: [
                    { parentPhone: query },
                    { parentPhone: cleanPhone }
                ]
            });
        }
        
        if (!students || students.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No students found' 
            });
        }
        
        res.json({
            success: true,
            searchMethod: searchMethod,
            multipleStudents: students.length > 1,
            students: students,
            count: students.length
        });
        
    } catch (error) {
        console.error('Error in combined search:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// ✅ Get all students - UPDATED with exact match option
router.get('/students', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status, 
            className,
            instructor,
            search,
            exact = 'false'  // New parameter: 'true' for exact match, 'false' for partial
        } = req.query;
        
        const query = {};
        
        if (status) query.status = status;
        if (className) {
            // Search in both old className field and new classes array
            query.$or = [
                { className: className },
                { 'classes.className': className }
            ];
        }
        if (instructor) {
            // Search in both old instructor field and new classes array
            query.$or = [
                { instructor: instructor },
                { 'classes.instructor': instructor }
            ];
        }
        
        if (search) {
            // Determine if search looks like email, phone, or student ID
            const cleanSearch = search.trim();
            const isEmail = cleanSearch.includes('@');
            const isPhone = /^\d{10}$/.test(cleanSearch.replace(/\D/g, ''));
            const isStudentId = /^MS\d+$/i.test(cleanSearch);
            
            if (exact === 'true') {
                // EXACT MATCH mode
                if (isEmail) {
                    // Exact email match
                    query.email = { $regex: new RegExp(`^${cleanSearch}$`, 'i') };
                } 
                else if (isPhone) {
                    // Exact phone match (multiple formats)
                    const cleanPhone = cleanSearch.replace(/\D/g, '');
                    query.$or = [
                        { phone: cleanPhone },
                        { phone: `+91${cleanPhone}` },
                        { phone: `0${cleanPhone}` }
                    ];
                }
                else if (isStudentId) {
                    // Exact student ID match
                    query.studentId = { $regex: new RegExp(`^${cleanSearch}$`, 'i') };
                }
                else {
                    // For name searches, still do partial (since names aren't exact)
                    query.$or = [
                        { name: { $regex: cleanSearch, $options: 'i' } }
                    ];
                }
            } else {
                // PARTIAL match mode (for admin search)
                query.$or = [
                    { studentId: { $regex: cleanSearch, $options: 'i' } },
                    { name: { $regex: cleanSearch, $options: 'i' } },
                    { email: { $regex: cleanSearch, $options: 'i' } },
                    { phone: { $regex: cleanSearch, $options: 'i' } }
                ];
            }
        }

        const students = await MusicStudent.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-__v');

        const total = await MusicStudent.countDocuments(query);

        res.json({
            success: true,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            students,
            matchType: exact === 'true' ? 'exact' : 'partial'
        });
        
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching students'
        });
    }
});

// ✅ Update student - UPDATED to handle multiple classes
router.put('/update-student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const updateData = req.body;

        // If classes array is provided, calculate totalMonthlyFee
        if (updateData.classes && Array.isArray(updateData.classes)) {
            updateData.totalMonthlyFee = updateData.classes.reduce((total, cls) => total + (cls.monthlyFee || 0), 0);
            
            // For backward compatibility, also set className to first class
            if (updateData.classes.length > 0) {
                updateData.className = updateData.classes[0].className;
                updateData.instructor = updateData.classes[0].instructor;
                updateData.monthlyFee = updateData.classes[0].monthlyFee;
            }
        }

        const student = await MusicStudent.findOneAndUpdate(
            { studentId },
            updateData,
            { new: true, runValidators: true }
        ).select('-__v');

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            message: 'Student updated successfully',
            student
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating student'
        });
    }
});

// ✅ Update student
router.put('/update-student/:id', async (req, res) => {
    try {
        const studentData = req.body;
        const studentId = req.params.id;

        // ===== Validate classes against database =====
        if (studentData.classes && studentData.classes.length > 0) {
            // Get all valid teachers and class configs
            const [teachers, classConfigs] = await Promise.all([
                Teacher.find({}, 'name'),
                ClassConfig.find({ active: true }, 'className teacherName baseFee') // Using ClassConfig here
            ]);

            const validTeacherNames = teachers.map(t => t.name);
            const validClassNames = classConfigs.map(c => c.className);
            
            // Create a map for quick fee lookup
            const classFeeMap = {};
            classConfigs.forEach(c => {
                classFeeMap[c.className] = c.baseFee;
            });

            // Validate each class
            for (let i = 0; i < studentData.classes.length; i++) {
                const cls = studentData.classes[i];
                
                // Validate class name
                if (!validClassNames.includes(cls.className)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid class name: "${cls.className}". Class must exist in class configurations.`
                    });
                }
                
                // Validate instructor
                if (!validTeacherNames.includes(cls.instructor)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid instructor: "${cls.instructor}". Teacher must exist in teacher list.`
                    });
                }
                
                // Auto-correct fee to match class configuration
                const expectedFee = classFeeMap[cls.className];
                if (expectedFee && cls.monthlyFee !== expectedFee) {
                    console.log(`Auto-correcting fee for ${cls.className}: ${cls.monthlyFee} -> ${expectedFee}`);
                    cls.monthlyFee = expectedFee;
                }
            }
            
            // Recalculate total monthly fee
            studentData.totalMonthlyFee = studentData.classes.reduce((sum, cls) => sum + cls.monthlyFee, 0);
        }

        // MODIFIED: Check for exact email+phone combination excluding current student
        if (studentData.email || studentData.phone) {
            const duplicateQuery = {
                $and: [
                    { studentId: { $ne: studentId } },
                    { email: studentData.email },
                    { phone: studentData.phone }
                ]
            };
            
            const existingStudent = await MusicStudent.findOne(duplicateQuery);
            if (existingStudent) {
                return res.status(400).json({
                    success: false,
                    message: 'Another student with this exact email and phone combination already exists'
                });
            }
        }

        const updatedStudent = await MusicStudent.findOneAndUpdate(
            { studentId: studentId },
            studentData,
            { new: true, runValidators: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            message: 'Student updated successfully',
            student: updatedStudent
        });
    } catch (error) {
        console.error('Error updating student:', error);
        
        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: Object.values(error.errors).map(e => e.message)
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error updating student',
            error: error.message
        });
    }
});

// ✅ Delete student
router.delete('/delete-student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        const student = await MusicStudent.findOneAndDelete({ studentId });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Also delete associated payments
        await Payment.deleteMany({ studentId });

        res.json({
            success: true,
            message: 'Student deleted successfully',
            studentId
        });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting student'
        });
    }
});

// ✅ Get student dashboard stats
router.get('/dashboard-stats', async (req, res) => {
    try {
        const totalStudents = await MusicStudent.countDocuments();
        const activeStudents = await MusicStudent.countDocuments({ status: 'active' });
        
        // Count pending payments
        const pendingPayments = await MusicStudent.countDocuments({ 
            paymentStatus: 'pending',
            status: 'active'
        });
        
        // Calculate total monthly collection from Payment records
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const monthlyCollection = await Payment.aggregate([
            {
                $match: {
                    month: currentMonth,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        
        const totalCollection = monthlyCollection[0]?.total || 0;
        
        // Updated class stats to handle both old and new format
        const classStats = await MusicStudent.aggregate([
            { $unwind: { path: '$classes', preserveNullAndEmptyArrays: true } },
            { $group: { 
                _id: { $ifNull: ['$classes.className', '$className'] }, 
                count: { $sum: 1 } 
            } }
        ]);
        
        const statusStats = await MusicStudent.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        // Updated instructor stats to handle both old and new format
        const instructorStats = await MusicStudent.aggregate([
            { $unwind: { path: '$classes', preserveNullAndEmptyArrays: true } },
            { $group: { 
                _id: { $ifNull: ['$classes.instructor', '$instructor'] }, 
                count: { $sum: 1 } 
            } }
        ]);
        
        const recentStudents = await MusicStudent.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('studentId name className joinDate status classes');

        res.json({
            success: true,
            stats: {
                totalStudents,
                activeStudents,
                inactiveStudents: totalStudents - activeStudents,
                pendingPayments,
                totalCollection,
                classDistribution: classStats,
                statusDistribution: statusStats,
                instructorDistribution: instructorStats
            },
            recentStudents
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard stats'
        });
    }
});

// ========== PAYMENT ROUTES ==========

// ✅ Mark payment manually (for admin)
router.post('/mark-payment/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { amount, month, paymentMethod = 'cash', notes } = req.body;

        const student = await MusicStudent.findOne({ studentId });
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Determine amount (use provided or totalMonthlyFee or monthlyFee)
        const paymentAmount = amount || student.totalMonthlyFee || student.monthlyFee || 0;

        // Create payment record
        const payment = new Payment({
            studentId: student.studentId,
            studentName: student.name,
            className: student.className,
            amount: paymentAmount,
            month: month || new Date().toISOString().slice(0, 7),
            paymentMethod,
            notes,
            collectedBy: 'Admin'
        });

        await payment.save();

        // Update student payment info
        student.lastPaymentDate = new Date();
        student.nextPaymentDue = new Date();
        student.nextPaymentDue.setMonth(student.nextPaymentDue.getMonth() + 1);
        student.paymentStatus = 'paid';
        
        await student.save();

        res.json({
            success: true,
            message: 'Payment recorded successfully',
            receiptNo: payment.receiptNo,
            paymentId: payment.paymentId,
            nextPaymentDue: student.nextPaymentDue,
            student: {
                studentId: student.studentId,
                name: student.name,
                paymentStatus: student.paymentStatus
            }
        });
    } catch (error) {
        console.error('Error marking payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking payment'
        });
    }
});

// ✅ Updated payment marking with proper due date logic and professional receipts
router.post('/payments/mark', async (req, res) => {
    try {
        const { 
            studentId, 
            studentName, 
            className, 
            amount, 
            baseAmount, 
            gstAmount, 
            gstPercentage, 
            month, 
            paymentMethod, 
            notes 
        } = req.body;
        
        console.log('📝 Creating payment:', { studentId, studentName, className, amount, month });
        
        // Validate month - cannot be future
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1; // 1-12
        
        const [paymentYear, paymentMonth] = month.split('-').map(Number);
        
        if (paymentYear > currentYear || (paymentYear === currentYear && paymentMonth > currentMonth)) {
            return res.status(400).json({
                success: false,
                message: `Cannot pay for future months. Current month is ${currentYear}-${String(currentMonth).padStart(2, '0')}`
            });
        }
        
        // Get student with populated classes
        const student = await MusicStudent.findOne({ studentId });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        // Check if payment already exists
        const existing = await Payment.findOne({ studentId, month });
        if (existing) {
            return res.status(400).json({ 
                success: false, 
                message: `Payment already exists for ${month}` 
            });
        }
        
        // Generate professional receipt number (MS/2025-26/001 format)
        const receiptGen = await generateReceiptNumber();
        
        // Create payment with receipt number
        const payment = new Payment({
            studentId,
            studentName: studentName || student.name,
            className: className || student.className || 'Music Class',
            amount: amount,
            baseAmount: baseAmount || amount,
            gstAmount: gstAmount || 0,
            gstPercentage: gstPercentage || 0,
            month,
            paymentMethod,
            receiptNo: receiptGen.receiptNumber, // Use new receipt number format
            notes: notes || `GST @ ${gstPercentage || 0}%`,
            paymentDate: new Date(),
            status: 'completed',
            receiptGenerated: true,
            receiptDate: new Date()
        });
        
        await payment.save();
        
        // ===== UPDATE STUDENT WITH PROPER DUE DATES =====
        const paymentMonthDate = new Date(paymentYear, paymentMonth - 1, 1); // First day of paid month
        
        // Calculate next due date based on payment month
        // If paying for March (month 3), next due is for April, payable in May 1-15
        const nextDueMonth = new Date(paymentYear, paymentMonth, 1); // First day of next month
        
        // Due date window: 1st to 15th of the month AFTER next month
        // Example: If paying for March, next due is for April, payable May 1-15
        const dueDateStart = new Date(nextDueMonth.getFullYear(), nextDueMonth.getMonth() + 1, 1); // First day of month after next
        const dueDateEnd = new Date(nextDueMonth.getFullYear(), nextDueMonth.getMonth() + 1, 15); // 15th of that month
        
        student.lastPaymentDate = new Date();
        student.lastPaymentMonth = month;
        student.paymentStatus = 'paid';
        
        // Store both the due month and the payment window
        student.nextPaymentDue = dueDateStart; // Keep for backward compatibility
        student.nextPaymentMonth = `${nextDueMonth.getFullYear()}-${String(nextDueMonth.getMonth() + 1).padStart(2, '0')}`;
        student.dueDateStart = dueDateStart;
        student.dueDateEnd = dueDateEnd;
        
        await student.save();
        
        console.log(`📅 Next payment for ${student.name}: ${student.nextPaymentMonth} (due ${dueDateStart.toLocaleDateString()} to ${dueDateEnd.toLocaleDateString()})`);
        
        // ===== CREATE RECEIPT IN RECEIPT COLLECTION =====
        let receiptUrl = null;
        let receipt = null;
        
        try {
            // Prepare class details for receipt
            const classDetails = [];
            
            if (student.classes && student.classes.length > 0) {
                // Multi-class student
                for (const cls of student.classes) {
                    classDetails.push({
                        className: cls.className,
                        teacherName: cls.instructor || await getTeacherForClass(cls.className),
                        fees: cls.monthlyFee || 0
                    });
                }
            } else {
                // Single class student (backward compatibility)
                classDetails.push({
                    className: student.className || className,
                    teacherName: student.instructor || await getTeacherForClass(student.className || className),
                    fees: baseAmount || amount
                });
            }
            
            // Create receipt in database
            const Receipt = require('../models/Receipt');
            receipt = new Receipt({
                receiptNumber: receiptGen.receiptNumber,
                paymentId: payment._id,
                studentId: student.studentId,
                financialYear: receiptGen.financialYear,
                receiptDate: new Date(),
                receiptData: {
                    studentName: student.name,
                    studentId: student.studentId,
                    studentEmail: student.email || '',
                    studentPhone: student.phone || '',
                    classes: classDetails,
                    paymentMonth: month,
                    paymentMethod: paymentMethod || 'cash',
                    totalAmount: amount,
                    baseAmount: baseAmount || amount,
                    gstAmount: gstAmount || 0,
                    gstPercentage: gstPercentage || 0,
                    transactionId: payment.transactionId,
                    notes: notes
                }
            });
            
            await receipt.save();
            
            // Update payment with receipt reference
            payment.receiptId = receipt._id;
            await payment.save();
            
            // Generate PDF receipt (optional - you can generate on-demand instead)
            // const ReceiptGenerator = require('../utils/receiptGenerator');
            // const pdfReceipt = await ReceiptGenerator.generatePaymentReceipt(payment, student);
            // receiptUrl = pdfReceipt.url;
            
            console.log(`🧾 Receipt generated: ${receipt.receiptNumber}`);
            
        } catch (receiptError) {
            console.error('Error creating receipt:', receiptError);
            // Continue even if receipt creation fails - payment is still recorded
        }
        
        res.json({
            success: true,
            message: 'Payment recorded successfully',
            receiptNo: receiptGen.receiptNumber,
            receiptId: receipt ? receipt._id : null,
            receiptUrl: receiptUrl || `/api/music/receipts/pdf/${receiptGen.receiptNumber}`,
            financialYear: receiptGen.financialYear,
            nextPaymentInfo: {
                month: student.nextPaymentMonth,
                dueFrom: dueDateStart,
                dueTo: dueDateEnd,
                dueFromFormatted: dueDateStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                dueToFormatted: dueDateEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            },
            payment: {
                ...payment.toObject(),
                gstBreakdown: {
                    baseAmount: baseAmount || amount,
                    gstAmount: gstAmount || 0,
                    gstPercentage: gstPercentage || 0,
                    totalAmount: amount
                }
            }
        });
        
    } catch (error) {
        console.error('Error marking payment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
    }
});

// ✅ Get pending payments
router.get('/payments/pending', async (req, res) => {
    try {
        const students = await MusicStudent.find({
            paymentStatus: 'pending',
            status: 'active'
        }).select('studentId name className monthlyFee totalMonthlyFee nextPaymentDue classes');
        
        console.log('📊 Pending students count:', students.length);
        
        res.json({
            success: true,
            count: students.length,
            students
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching pending payments' });
    }
});

// ✅ Get overdue payments (past due date)
router.get('/payments/overdue', async (req, res) => {
    try {
        const today = new Date();
        const students = await MusicStudent.find({
            paymentStatus: 'pending',
            nextPaymentDue: { $lt: today },
            status: 'active'
        }).select('studentId name className monthlyFee totalMonthlyFee nextPaymentDue classes');
        
        res.json({
            success: true,
            count: students.length,
            students
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching overdue payments' });
    }
});

// ✅ Get paid payments for specific month
router.get('/payments/paid', async (req, res) => {
    try {
        const { month } = req.query;
        const currentMonth = month || new Date().toISOString().slice(0, 7);
        
        const payments = await Payment.find({ 
            month: currentMonth,
            status: 'completed'
        }).sort({ paymentDate: -1 });
        
        res.json({
            success: true,
            count: payments.length,
            payments
        });
    } catch (error) {
        console.error('Error fetching paid payments:', error);
        res.status(500).json({ success: false, message: 'Error fetching paid payments' });
    }
});

// ✅ Check if payment exists
router.get('/payments/check', async (req, res) => {
    try {
        const { studentId, month } = req.query;
        
        const existingPayment = await Payment.findOne({ 
            studentId, 
            month,
            status: 'completed'
        });
        
        res.json({
            success: true,
            exists: !!existingPayment
        });
    } catch (error) {
        console.error('Error checking payment:', error);
        res.status(500).json({ success: false, message: 'Error checking payment' });
    }
});

// ✅ Get payment history
router.get('/payments/history', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const payments = await Payment.find()
            .sort({ paymentDate: -1 })
            .limit(parseInt(limit));
        
        res.json({
            success: true,
            payments
        });
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({ success: false, message: 'Error fetching payment history' });
    }
});

// ✅ Get payments for a specific student
router.get('/payments/student/:studentId', async (req, res) => {
    try {
        const payments = await Payment.find({ 
            studentId: req.params.studentId,
            status: 'completed'
        }).sort({ paymentDate: -1 });
        
        res.json({
            success: true,
            payments
        });
    } catch (error) {
        console.error('Error fetching student payments:', error);
        res.status(500).json({ success: false, message: 'Error fetching student payments' });
    }
});

// ========== PENDING MONTHS WITH JOIN DATE LOGIC ==========
router.get('/payments/pending-months/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const student = await MusicStudent.findOne({ studentId });
        if (!student) {
            return res.json({ 
                success: false,
                pendingMonths: [],
                pendingCount: 0 
            });
        }
        
        const joinDate = student.joinDate ? new Date(student.joinDate) : new Date(student.createdAt);
        const today = new Date();
        
        // Get all completed payments
        const payments = await Payment.find({ 
            studentId, 
            status: 'completed' 
        }).select('month');
        
        const paidMonths = new Set(payments.map(p => p.month));
        
        // Determine which months should be paid
        const pendingMonths = [];
        const pendingRawMonths = [];
        
        const startYear = joinDate.getFullYear();
        const startMonth = joinDate.getMonth(); // 0-11
        const joinDay = joinDate.getDate();
        
        // Calculate months from join date to CURRENT MONTH
        // If joined in March 2026, March is payable immediately
        for (let year = startYear; year <= today.getFullYear(); year++) {
            const monthStart = (year === startYear) ? startMonth : 0;
            // Include current month (today's month)
            const monthEnd = (year === today.getFullYear()) ? today.getMonth() : 11;
            
            for (let month = monthStart; month <= monthEnd; month++) {
                const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
                
                // Special case: If this is the join month and same year/month
                if (year === startYear && month === startMonth) {
                    // Join month is ALWAYS payable immediately
                    if (!paidMonths.has(monthStr)) {
                        pendingRawMonths.push(monthStr);
                        const displayDate = new Date(year, month, 1).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long' 
                        });
                        pendingMonths.push(`${displayDate} (Join month - pay now)`);
                    }
                }
                // For months after join month, only include if they are in the past
                else if (year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth())) {
                    if (!paidMonths.has(monthStr)) {
                        pendingRawMonths.push(monthStr);
                        const displayDate = new Date(year, month, 1).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long' 
                        });
                        pendingMonths.push(displayDate);
                    }
                }
                // Current month (if not join month) is NOT included - will be due next month
            }
        }
        
        // Calculate due date info for next payment
        let dueDateInfo = null;
        
        // Find the next month that will be due
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
        
        // Due date is 1st to 15th of the month AFTER next month
        const dueStart = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1);
        const dueEnd = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 15);
        
        // In the pending-months endpoint, update the dueDateInfo:
        dueDateInfo = {
            month: nextMonthStr,
            displayMonth: nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            dueFrom: dueStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), // "May 1"
            dueTo: dueEnd.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),     // "May 15"
            dueRange: `${dueStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${dueEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            message: `Payment for ${nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} is due by ${dueEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
        };
        
        res.json({
            success: true,
            studentId: studentId,
            studentName: student.name,
            joinDate: joinDate.toLocaleDateString(),
            pendingMonths: pendingMonths,
            pendingRawMonths: pendingRawMonths,
            pendingCount: pendingMonths.length,
            monthlyFee: student.totalMonthlyFee || student.monthlyFee || 0,
            currentMonth: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
            joinMonth: `${startYear}-${String(startMonth + 1).padStart(2, '0')}`,
            nextDueInfo: dueDateInfo,
            message: pendingMonths.length === 0 
                ? `✅ All payments up to date! Next payment for ${dueDateInfo.displayMonth} is due ${dueDateInfo.dueFrom} to ${dueDateInfo.dueTo}`
                : `⚠️ You have ${pendingMonths.length} pending month(s) to pay.`
        });
        
    } catch (error) {
        console.error('Error getting pending months:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error getting pending months',
            error: error.message 
        });
    }
});

// ========== NEW: CLASS CONFIGURATION ROUTES ==========

// Get all class configurations
router.get('/class-configurations', async (req, res) => {
    try {
        const configs = await ClassConfig.find().sort({ className: 1 });
        res.json({ success: true, configurations: configs });
    } catch (error) {
        console.error('Error fetching class configurations:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ✅ ADD THIS MISSING ROUTE - Get single class configuration by ID
router.get('/class-configurations/:id', async (req, res) => {
    try {
        const config = await ClassConfig.findById(req.params.id);
        
        if (!config) {
            return res.status(404).json({ 
                success: false, 
                message: 'Class configuration not found' 
            });
        }
        
        res.json({ 
            success: true, 
            config 
        });
    } catch (error) {
        console.error('Error fetching class configuration:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Add new class configuration
router.post('/class-configurations', async (req, res) => {
    try {
        const { className, teacherName, baseFee, description } = req.body;
        
        // Check if class already exists
        const existing = await ClassConfig.findOne({ className });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Class already exists' });
        }
        
        const config = new ClassConfig({
            className,
            teacherName,
            baseFee,
            description,
            active: true
        });
        
        await config.save();
        
        res.json({ success: true, message: 'Class configuration added', config });
    } catch (error) {
        console.error('Error adding class configuration:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update class configuration
router.put('/class-configurations/:id', async (req, res) => {
    try {
        const { className, teacherName, baseFee, description, active } = req.body;
        
        const config = await ClassConfig.findByIdAndUpdate(
            req.params.id,
            { className, teacherName, baseFee, description, active },
            { new: true }
        );
        
        if (!config) {
            return res.status(404).json({ success: false, message: 'Configuration not found' });
        }
        
        res.json({ success: true, message: 'Configuration updated', config });
    } catch (error) {
        console.error('Error updating class configuration:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Toggle class status
router.patch('/class-configurations/:id/toggle', async (req, res) => {
    try {
        const config = await ClassConfig.findById(req.params.id);
        
        if (!config) {
            return res.status(404).json({ success: false, message: 'Configuration not found' });
        }
        
        config.active = !config.active;
        await config.save();
        
        res.json({ success: true, message: 'Status toggled', active: config.active });
    } catch (error) {
        console.error('Error toggling class status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ========== NEW: GST SETTINGS ROUTES ==========

// Get GST settings
router.get('/gst-settings', async (req, res) => {
    try {
        let settings = await GSTSettings.findOne();
        
        if (!settings) {
            // Create default settings
            settings = new GSTSettings({
                gstPercentage: 18,
                gstNumber: '',
                applicableClasses: []
            });
            await settings.save();
        }
        
        res.json({ success: true, ...settings.toObject() });
    } catch (error) {
        console.error('Error fetching GST settings:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Save GST settings
router.post('/gst-settings', async (req, res) => {
    try {
        const { gstPercentage, gstNumber, applicableClasses } = req.body;
        
        let settings = await GSTSettings.findOne();
        
        if (settings) {
            settings.gstPercentage = gstPercentage || settings.gstPercentage;
            settings.gstNumber = gstNumber || settings.gstNumber;
            if (applicableClasses) settings.applicableClasses = applicableClasses;
            settings.updatedAt = new Date();
        } else {
            settings = new GSTSettings({
                gstPercentage: gstPercentage || 18,
                gstNumber: gstNumber || '',
                applicableClasses: applicableClasses || []
            });
        }
        
        await settings.save();
        
        res.json({ success: true, message: 'GST settings saved', settings });
    } catch (error) {
        console.error('Error saving GST settings:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ========== GET CLASS NAMES (for dropdowns) ==========
router.get('/class-names', async (req, res) => {
    try {
        // Get distinct class names from ClassConfig
        const ClassConfig = require('../models/ClassConfig');
        const classNames = await ClassConfig.distinct('className', { active: true });
        
        // Sort alphabetically
        classNames.sort();
        
        res.json({
            success: true,
            classNames: classNames
        });
    } catch (error) {
        console.error('Error fetching class names:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching class names'
        });
    }
});

// ========== BULK UPLOAD ==========

// ✅ Bulk upload
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
    try {
        const { type } = req.body;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        
        // Parse CSV file
        const csvData = await parseCSV(file.path);
        const results = [];
        const errors = [];
        
        if (type === 'students') {
            for (const row of csvData) {
                try {
                    // Validate required fields
                    if (!row.name || !row.email || !row.phone || !row.className) {
                        errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
                        continue;
                    }
                    
                    // Validate className
                    const validClasses = [
                        'Carnatic Vocal', 
                        'Carnatic Veena',
                        'Carnatic Violin',
                        'Mridangam', 
                        'Keyboard', 
                        'Bharatanatyam'
                    ];
                    
                    // Fix common typo
                    if (row.className === 'Bhratanatyam') {
                        row.className = 'Bharatanatyam';
                    }
                    
                    if (!validClasses.includes(row.className)) {
                        errors.push(`Row ${row.name || 'Unknown'}: Invalid class '${row.className}'. Valid: ${validClasses.join(', ')}`);
                        continue;
                    }
                    
                    // Parse date properly
                    let dateOfBirth = null;
                    if (row.dateOfBirth) {
                        const date = parseDateString(row.dateOfBirth);
                        if (date) {
                            dateOfBirth = date;
                        } else {
                            errors.push(`Row ${row.name}: Invalid date format '${row.dateOfBirth}'. Use YYYY-MM-DD`);
                            continue;
                        }
                    }
                    
                    // Create classes array from single class
                    const classes = [{
                        className: row.className,
                        instructor: row.instructor || 'Other',
                        monthlyFee: parseInt(row.monthlyFee) || 0,
                        batchTiming: row.batchTiming || ''
                    }];
                    
                    const student = new MusicStudent({
                        name: row.name,
                        email: row.email,
                        phone: row.phone,
                        classes: classes,
                        totalMonthlyFee: parseInt(row.monthlyFee) || 0,
                        // Keep old fields for backward compatibility
                        className: row.className,
                        instructor: row.instructor || 'Other',
                        monthlyFee: parseInt(row.monthlyFee) || 0,
                        batchTiming: row.batchTiming || '',
                        gender: row.gender,
                        dateOfBirth: dateOfBirth,
                        address: {
                            street: row.street || '',
                            city: row.city || '',
                            state: row.state || '',
                            pincode: row.pincode || ''
                        }
                    });
                    
                    await student.save();
                    results.push({
                        studentId: student.studentId,
                        name: student.name
                    });
                } catch (error) {
                    errors.push(`Row ${row.name || 'Unknown'}: ${error.message}`);
                }
            }
        } else if (type === 'payments') {
            for (const row of csvData) {
                try {
                    if (!row.studentId || !row.amount) {
                        errors.push(`Row missing studentId or amount: ${JSON.stringify(row)}`);
                        continue;
                    }
                    
                    // Find student
                    const student = await MusicStudent.findOne({ studentId: row.studentId });
                    if (!student) {
                        errors.push(`Student not found: ${row.studentId}`);
                        continue;
                    }
                    
                    // Create payment record
                    const payment = new Payment({
                        studentId: student.studentId,
                        studentName: student.name,
                        className: student.className,
                        amount: parseFloat(row.amount),
                        month: row.month || new Date().toISOString().slice(0, 7),
                        paymentMethod: row.paymentMethod || 'cash',
                        notes: row.notes || 'CSV upload',
                        collectedBy: 'CSV Upload'
                    });
                    
                    await payment.save();
                    
                    // Update student payment status
                    student.paymentStatus = 'paid';
                    student.lastPaymentDate = new Date();
                    student.nextPaymentDue = new Date();
                    student.nextPaymentDue.setMonth(student.nextPaymentDue.getMonth() + 1);
                    
                    await student.save();
                    results.push({
                        paymentId: payment.paymentId,
                        studentId: row.studentId,
                        amount: row.amount
                    });
                } catch (error) {
                    errors.push(`Row ${row.studentId}: ${error.message}`);
                }
            }
        } else if (type === 'fees') {
            for (const row of csvData) {
                try {
                    if (!row.studentId || !row.monthlyFee) {
                        errors.push(`Row missing studentId or monthlyFee: ${JSON.stringify(row)}`);
                        continue;
                    }
                    
                    // Find student
                    const student = await MusicStudent.findOne({ studentId: row.studentId });
                    if (!student) {
                        errors.push(`Student not found: ${row.studentId}`);
                        continue;
                    }
                    
                    // Update fee in classes array
                    const newFee = parseFloat(row.monthlyFee);
                    
                    // Update each class or create one if none exists
                    if (student.classes && student.classes.length > 0) {
                        student.classes.forEach(cls => {
                            cls.monthlyFee = newFee;
                        });
                        student.totalMonthlyFee = newFee * student.classes.length;
                    } else {
                        // If no classes array, create one
                        student.classes = [{
                            className: student.className || 'Carnatic Vocal',
                            instructor: student.instructor || 'Other',
                            monthlyFee: newFee,
                            batchTiming: student.batchTiming || ''
                        }];
                        student.totalMonthlyFee = newFee;
                    }
                    
                    // Keep old fields for backward compatibility
                    student.monthlyFee = newFee;
                    
                    await student.save();
                    
                    results.push({
                        studentId: row.studentId,
                        monthlyFee: newFee,
                        status: 'Updated'
                    });
                } catch (error) {
                    errors.push(`Row ${row.studentId}: ${error.message}`);
                }
            }
        }
        
        // Clean up uploaded file
        try {
            fs.unlinkSync(file.path);
        } catch (cleanupError) {
            console.warn('Could not delete uploaded file:', cleanupError.message);
        }
        
        res.json({
            success: true,
            processed: csvData.length,
            successCount: results.length,
            failedCount: errors.length,
            results: results.slice(0, 10),
            errors: errors.slice(0, 10)
        });
        
    } catch (error) {
        console.error('Error processing upload:', error);
        
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ success: false, message: 'Error processing upload' });
    }
});

// ✅ Bulk update monthly fees
router.post('/bulk-update-fees', upload.single('file'), async (req, res) => {
    try {
        console.log('📊 Bulk fee update request received');
        
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file uploaded' 
            });
        }
        
        // Parse CSV file
        const csvData = await parseCSV(file.path);
        console.log(`📁 Parsed ${csvData.length} rows from CSV`);
        
        const results = [];
        const errors = [];
        const updatedStudents = [];
        
        for (const [index, row] of csvData.entries()) {
            try {
                // Skip empty rows
                if (!row || Object.keys(row).length === 0) continue;
                
                // Validate required fields
                if (!row.studentId || row.studentId.trim() === '') {
                    errors.push(`Row ${index + 1}: Student ID is required`);
                    continue;
                }
                
                if (!row.monthlyFee || row.monthlyFee.trim() === '') {
                    errors.push(`Row ${index + 1}: Monthly fee is required`);
                    continue;
                }
                
                const studentId = row.studentId.trim();
                
                // Validate studentId exists
                const student = await MusicStudent.findOne({ studentId: studentId });
                if (!student) {
                    errors.push(`Row ${index + 1}: Student not found - ${studentId}`);
                    continue;
                }
                
                // Validate monthly fee
                const newFee = parseFloat(row.monthlyFee);
                if (isNaN(newFee) || newFee <= 0) {
                    errors.push(`Row ${index + 1}: Invalid fee amount - ${row.monthlyFee}`);
                    continue;
                }
                
                // Store old fee BEFORE updating
                const oldFee = student.monthlyFee;
                
                // Only update if fee has changed
                if (oldFee !== newFee) {
                    // Update student fee in classes array
                    if (student.classes && student.classes.length > 0) {
                        student.classes.forEach(cls => {
                            cls.monthlyFee = newFee;
                        });
                        student.totalMonthlyFee = newFee * student.classes.length;
                    }
                    
                    // Keep old fields for backward compatibility
                    student.monthlyFee = newFee;
                    
                    // Initialize feeHistory if not exists
                    if (!student.feeHistory) {
                        student.feeHistory = [];
                    }
                    
                    // Parse effective date
                    let effectiveDate = new Date();
                    if (row.effectiveFrom && row.effectiveFrom.trim() !== '') {
                        const parsedDate = parseDateString(row.effectiveFrom);
                        if (parsedDate) {
                            effectiveDate = parsedDate;
                        }
                    }
                    
                    // Add to fee history
                    student.feeHistory.push({
                        oldFee: oldFee,
                        newFee: newFee,
                        effectiveFrom: effectiveDate,
                        updatedAt: new Date(),
                        updatedBy: 'CSV Upload',
                        reason: row.notes || 'Bulk fee update'
                    });
                    
                    await student.save();
                    
                    updatedStudents.push({
                        studentId: student.studentId,
                        name: student.name,
                        oldFee: oldFee,
                        newFee: newFee,
                        effectiveFrom: row.effectiveFrom || 'Immediately'
                    });
                    
                    results.push({
                        studentId: studentId,
                        monthlyFee: newFee,
                        status: 'Updated'
                    });
                    
                    console.log(`✅ Updated fee for ${student.studentId}: ₹${oldFee} → ₹${newFee}`);
                } else {
                    results.push({
                        studentId: studentId,
                        monthlyFee: newFee,
                        status: 'No change (same fee)'
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error processing row ${index + 1}:`, error.message);
                errors.push(`Row ${index + 1}: ${error.message}`);
            }
        }
        
        // Clean up uploaded file
        try {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
                console.log('🗑️ Cleaned up uploaded file');
            }
        } catch (cleanupError) {
            console.warn('Could not delete uploaded file:', cleanupError.message);
        }
        
        console.log(`🎉 Fee update complete: ${results.length} processed, ${errors.length} errors`);
        
        res.json({
            success: true,
            processed: csvData.length,
            successCount: results.length,
            failedCount: errors.length,
            updatedStudents: updatedStudents,
            results: results.slice(0, 20),
            errors: errors.slice(0, 20),
            message: `Updated ${updatedStudents.length} student fees`
        });
        
    } catch (error) {
        console.error('❌ Error in bulk fee update:', error);
        
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error processing fee update',
            error: error.message 
        });
    }
});

// Helper function to parse CSV
function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        if (!fs.existsSync(filePath)) {
            return reject(new Error('File not found'));
        }
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

// Helper function to parse date from string
function parseDateString(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;
    
    // Remove any quotes or extra spaces
    dateStr = dateStr.trim().replace(/['"]/g, '');
    
    // Try standard ISO format first
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    
    // Try parsing common formats
    const parts = dateStr.split(/[-\/]/);
    if (parts.length === 3) {
        // Try YYYY-MM-DD
        if (parts[0].length === 4) {
            date = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
            if (!isNaN(date.getTime())) return date;
        }
        // Try DD-MM-YYYY
        if (parts[2].length === 4) {
            date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            if (!isNaN(date.getTime())) return date;
        }
        // Try MM-DD-YYYY (if middle part is > 12, it's probably day)
        if (parseInt(parts[1]) > 12 && parts[2].length === 4) {
            date = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
            if (!isNaN(date.getTime())) return date;
        }
    }
    
    // Return null if all parsing attempts failed
    console.warn(`⚠️ Could not parse date: "${dateStr}"`);
    return null;
}

// ========== REPORTS ==========

// ✅ Generate reports
router.get('/reports/summary', async (req, res) => {
    try {
        const { from, to, className } = req.query;
        
        // Build query for students
        const studentQuery = {};
        if (className) {
            studentQuery.$or = [
                { className: className },
                { 'classes.className': className }
            ];
        }
        
        // Build query for payments
        const paymentQuery = {};
        if (from || to) {
            paymentQuery.paymentDate = {};
            if (from) paymentQuery.paymentDate.$gte = new Date(from);
            if (to) paymentQuery.paymentDate.$lte = new Date(to);
        }
        if (className) {
            // We need to get studentIds first for this class
            const studentsInClass = await MusicStudent.find({
                $or: [
                    { className: className },
                    { 'classes.className': className }
                ]
            }).select('studentId');
            const studentIds = studentsInClass.map(s => s.studentId);
            paymentQuery.studentId = { $in: studentIds };
        }
        
        // Get students
        const students = await MusicStudent.find(studentQuery);
        const activeStudents = students.filter(s => s.status === 'active');
        
        // Get payments
        const payments = await Payment.find({
            ...paymentQuery,
            status: 'completed'
        });
        
        // Calculate totals
        const totalCollection = payments.reduce((sum, p) => sum + p.amount, 0);
        const pendingAmount = activeStudents
            .filter(s => s.paymentStatus === 'pending')
            .reduce((sum, s) => sum + (s.totalMonthlyFee || s.monthlyFee || 0), 0);
        
        // Get class-wise data (updated for multi-class)
        const classWise = await MusicStudent.aggregate([
            { $match: studentQuery },
            { $unwind: { path: '$classes', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ['$classes.className', '$className'] },
                    studentCount: { $sum: 1 },
                    totalMonthlyFee: { $sum: { $ifNull: ['$classes.monthlyFee', '$monthlyFee', 0] } },
                    activeCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    },
                    paidCount: {
                        $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
                    }
                }
            }
        ]);
        
        // Get monthly trend
        const monthlyTrend = await Payment.aggregate([
            { 
                $match: {
                    ...paymentQuery,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: { $substr: ['$paymentDate', 0, 7] }, // YYYY-MM
                    totalAmount: { $sum: '$amount' },
                    paymentCount: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);
        
        res.json({
            success: true,
            summary: {
                totalCollection,
                totalPayments: payments.length,
                pendingAmount,
                activeStudents: activeStudents.length,
                totalStudents: students.length
            },
            classWise,
            monthlyTrend: monthlyTrend.slice(-6) // Last 6 months
        });
        
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ success: false, message: 'Error generating report' });
    }
});

// ✅ Export reports as CSV
router.get('/reports/export/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { from, to, className } = req.query;
        
        let csvData = '';
        
        if (type === 'payment') {
            // Build payment query
            const paymentQuery = { status: 'completed' };
            if (from || to) {
                paymentQuery.paymentDate = {};
                if (from) paymentQuery.paymentDate.$gte = new Date(from);
                if (to) paymentQuery.paymentDate.$lte = new Date(to);
            }
            if (className) {
                const studentsInClass = await MusicStudent.find({
                    $or: [
                        { className: className },
                        { 'classes.className': className }
                    ]
                }).select('studentId');
                const studentIds = studentsInClass.map(s => s.studentId);
                paymentQuery.studentId = { $in: studentIds };
            }
            
            const payments = await Payment.find(paymentQuery).sort({ paymentDate: -1 });
            
            csvData = 'Payment ID,Student ID,Student Name,Class,Amount,Month,Payment Date,Payment Method,Receipt No,Status\n';
            payments.forEach(p => {
                csvData += `${p.paymentId},${p.studentId},${p.studentName},${p.className},${p.amount},${p.month},${p.paymentDate?.toISOString().split('T')[0] || ''},${p.paymentMethod},${p.receiptNo},${p.status}\n`;
            });
            
        } else if (type === 'student') {
            const query = {};
            if (className) {
                query.$or = [
                    { className: className },
                    { 'classes.className': className }
                ];
            }
            
            const students = await MusicStudent.find(query);
            
            csvData = 'Student ID,Name,Email,Phone,Class,Instructor,Monthly Fee,Status,Payment Status,Last Payment,Next Due,Join Date,Address\n';
            students.forEach(s => {
                const address = `${s.address?.street || ''}, ${s.address?.city || ''}, ${s.address?.state || ''} ${s.address?.pincode || ''}`.trim();
                const className = s.classes?.map(c => c.className).join('; ') || s.className || '';
                const instructor = s.classes?.map(c => c.instructor).join('; ') || s.instructor || '';
                const monthlyFee = s.totalMonthlyFee || s.monthlyFee || 0;
                
                csvData += `${s.studentId},${s.name},${s.email},${s.phone},${className},${instructor},${monthlyFee},${s.status},${s.paymentStatus},${s.lastPaymentDate?.toISOString().split('T')[0] || ''},${s.nextPaymentDue?.toISOString().split('T')[0] || ''},${s.joinDate?.toISOString().split('T')[0] || ''},"${address}"\n`;
            });
            
        } else if (type === 'overdue') {
            const today = new Date();
            const query = {
                paymentStatus: 'pending',
                nextPaymentDue: { $lt: today },
                status: 'active'
            };
            if (className) {
                query.$or = [
                    { className: className },
                    { 'classes.className': className }
                ];
            }
            
            const overdueStudents = await MusicStudent.find(query);
            
            csvData = 'Student ID,Name,Class,Monthly Fee,Next Due Date,Overdue Days,Phone,Email,Instructor\n';
            overdueStudents.forEach(s => {
                const overdueDays = Math.floor((today - s.nextPaymentDue) / (1000 * 60 * 60 * 24));
                const className = s.classes?.map(c => c.className).join('; ') || s.className || '';
                const monthlyFee = s.totalMonthlyFee || s.monthlyFee || 0;
                
                csvData += `${s.studentId},${s.name},${className},${monthlyFee},${s.nextPaymentDue?.toISOString().split('T')[0] || ''},${overdueDays},${s.phone},${s.email},${s.instructor || ''}\n`;
            });
            
        } else if (type === 'full') {
            const query = {};
            if (className) {
                query.$or = [
                    { className: className },
                    { 'classes.className': className }
                ];
            }
            
            const students = await MusicStudent.find(query);
            
            csvData = 'Student ID,Name,Email,Phone,Classes,Instructors,Total Monthly Fee,Status,Payment Status,Gender,Date of Birth,Last Payment,Next Due,Join Date,Guardian Name,Guardian Phone,Address,Notes\n';
            students.forEach(s => {
                const address = `${s.address?.street || ''}, ${s.address?.city || ''}, ${s.address?.state || ''} ${s.address?.pincode || ''}`.trim();
                const classes = s.classes?.map(c => c.className).join('; ') || s.className || '';
                const instructors = s.classes?.map(c => c.instructor).join('; ') || s.instructor || '';
                const totalFee = s.totalMonthlyFee || s.monthlyFee || 0;
                
                csvData += `${s.studentId},${s.name},${s.email},${s.phone},${classes},${instructors},${totalFee},${s.status},${s.paymentStatus},${s.gender || ''},${s.dateOfBirth?.toISOString().split('T')[0] || ''},${s.lastPaymentDate?.toISOString().split('T')[0] || ''},${s.nextPaymentDue?.toISOString().split('T')[0] || ''},${s.joinDate?.toISOString().split('T')[0] || ''},${s.guardianName || ''},${s.guardianPhone || ''},"${address}",${s.notes || ''}\n`;
            });
            
        } else if (type === 'monthly') {
            const currentYear = new Date().getFullYear();
            const payments = await Payment.aggregate([
                {
                    $match: {
                        status: 'completed',
                        paymentDate: {
                            $gte: new Date(`${currentYear}-01-01`),
                            $lte: new Date(`${currentYear}-12-31`)
                        }
                    }
                },
                {
                    $group: {
                        _id: { $substr: ['$paymentDate', 0, 7] }, // YYYY-MM
                        totalAmount: { $sum: '$amount' },
                        paymentCount: { $sum: 1 },
                        studentCount: { $addToSet: '$studentId' }
                    }
                },
                {
                    $project: {
                        month: '$_id',
                        totalAmount: 1,
                        paymentCount: 1,
                        studentCount: { $size: '$studentCount' }
                    }
                },
                { $sort: { 'month': 1 } }
            ]);
            
            csvData = 'Month,Total Collection,Number of Payments,Number of Students\n';
            payments.forEach(p => {
                csvData += `${p.month},${p.totalAmount},${p.paymentCount},${p.studentCount}\n`;
            });
        }
        
        res.json({
            success: true,
            csv: csvData
        });
        
    } catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({ success: false, message: 'Error exporting report' });
    }
});

// ✅ Download CSV template
router.get('/download-template/:type', async (req, res) => {
    try {
        const { type } = req.params;
        let csvContent = '';
        
        if (type === 'students') {
            csvContent = 'name,email,phone,className,instructor,monthlyFee,gender,dateOfBirth,street,city,state,pincode,guardianName,guardianPhone,batchTiming,notes\n' +
                       'John Doe,john@example.com,9876543210,Carnatic Vocal,Vidwan R. Srikrishnan,250,male,2005-01-15,123 Main St,Chennai,Tamil Nadu,600001,Mr. Doe,9876543211,Mon Wed Fri 4-5 PM,Beginner student';
        } else if (type === 'payments') {
            csvContent = 'studentId,amount,month,paymentMethod,notes\n' +
                       'MS24001,250,2024-03,cash,Monthly fee payment';
        } else if (type === 'fees' || type === 'update-fees') {
            // Template for fee updates
            csvContent = 'studentId,monthlyFee,effectiveFrom,notes\n' +
                       'MS24001,300,2024-04-01,Fee increased due to advanced class\n' +
                       'MS24002,320,2024-04-01,Annual fee adjustment\n' +
                       'MS24003,280,2024-04-01,Discount applied';
        }
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}_template.csv`);
        res.send(csvContent);
        
    } catch (error) {
        console.error('Error downloading template:', error);
        res.status(500).json({ success: false, message: 'Error downloading template' });
    }
});

// ========== ENHANCED TEACHER-WISE REPORT ==========

// ✅ Generate teacher-wise collection report with multiple instructors per class
router.get('/reports/teacher-wise', async (req, res) => {
    try {
        const { from, to } = req.query;
        
        if (!from || !to) {
            return res.status(400).json({
                success: false,
                message: 'Please provide from and to dates'
            });
        }
        
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        
        // Get all class configurations with teachers
        const ClassConfig = require('../models/ClassConfig');
        const classConfigs = await ClassConfig.find({ active: true });
        
        // Create a map of class to teachers (since one class can have multiple teachers)
        const classTeachersMap = {};
        classConfigs.forEach(config => {
            if (!classTeachersMap[config.className]) {
                classTeachersMap[config.className] = [];
            }
            classTeachersMap[config.className].push(config.teacherName);
        });
        
        console.log('📚 Class-Teacher mapping:', classTeachersMap);
        
        // Get all students to count per instructor and class
        const MusicStudent = require('../models/MusicStudent');
        const students = await MusicStudent.find({ status: 'active' });
        
        // Count students per instructor and class
        const instructorStudentCount = {};
        
        students.forEach(student => {
            if (student.classes && student.classes.length > 0) {
                // Multi-class student
                student.classes.forEach(cls => {
                    const className = cls.className;
                    const instructor = cls.instructor;
                    
                    if (instructor && className) {
                        const key = `${instructor}::${className}`;
                        instructorStudentCount[key] = (instructorStudentCount[key] || 0) + 1;
                    }
                });
            } else if (student.className && student.instructor) {
                // Single class student
                const key = `${student.instructor}::${student.className}`;
                instructorStudentCount[key] = (instructorStudentCount[key] || 0) + 1;
            }
        });
        
        console.log('👥 Instructor-student counts:', instructorStudentCount);
        
        // Get payments for the period
        const Payment = require('../models/Payment');
        const payments = await Payment.find({
            paymentDate: { $gte: fromDate, $lte: toDate },
            status: 'completed'
        });
        
        console.log(`💰 Found ${payments.length} payments in date range`);
        
        // Create instructor-wise data structure
        const instructorMap = {};
        
        // Initialize all instructors from class configs
        classConfigs.forEach(config => {
            const instructorName = config.teacherName;
            const className = config.className;
            
            if (!instructorMap[instructorName]) {
                instructorMap[instructorName] = {
                    instructorName: instructorName,
                    classes: [],
                    totalCollection: 0,
                    paymentCount: 0,
                    studentCount: 0,
                    classDetails: []
                };
            }
            
            // Add class to this instructor if not already added
            if (!instructorMap[instructorName].classes.includes(className)) {
                instructorMap[instructorName].classes.push(className);
            }
            
            // Check if class detail already exists
            const existingClassDetail = instructorMap[instructorName].classDetails.find(
                c => c.className === className
            );
            
            if (!existingClassDetail) {
                instructorMap[instructorName].classDetails.push({
                    className: className,
                    baseFee: config.baseFee,
                    studentCount: 0,
                    collection: 0,
                    paymentCount: 0
                });
            }
        });
        
        // Process payments and assign to instructors
        payments.forEach(payment => {
            const className = payment.className;
            
            // Find which instructors teach this class
            const instructorsForClass = classTeachersMap[className] || [];
            
            if (instructorsForClass.length === 0) {
                console.warn(`No instructors found for class: ${className}`);
                return;
            }
            
            // If multiple instructors teach the same class, we need to determine which one
            // For now, we'll distribute equally or you might want to add logic to determine
            // which instructor actually taught this student
            
            // For demo purposes, we'll assign to the first instructor
            // In a real scenario, you might want to store instructor in payment records
            const primaryInstructor = instructorsForClass[0];
            
            if (instructorMap[primaryInstructor]) {
                instructorMap[primaryInstructor].totalCollection += payment.amount;
                instructorMap[primaryInstructor].paymentCount++;
                
                // Update class-specific collection
                const classDetail = instructorMap[primaryInstructor].classDetails.find(
                    c => c.className === className
                );
                if (classDetail) {
                    classDetail.collection += payment.amount;
                    classDetail.paymentCount = (classDetail.paymentCount || 0) + 1;
                }
            }
        });
        
        // Update student counts for each instructor's classes
        Object.values(instructorMap).forEach(instructor => {
            instructor.classDetails.forEach(classDetail => {
                const key = `${instructor.instructorName}::${classDetail.className}`;
                classDetail.studentCount = instructorStudentCount[key] || 0;
                instructor.studentCount += classDetail.studentCount;
            });
            
            // Calculate average per class
            instructor.averagePerClass = instructor.classDetails.length > 0 
                ? (instructor.totalCollection / instructor.classDetails.length).toFixed(2) 
                : 0;
        });
        
        // Create class-instructor breakdown
        const classInstructorBreakdown = [];
        
        // Group by class name
        const classGroups = {};
        classConfigs.forEach(config => {
            const className = config.className;
            
            if (!classGroups[className]) {
                classGroups[className] = {
                    className: className,
                    instructors: [],
                    totalClassCollection: 0,
                    totalClassStudents: 0
                };
            }
            
            // Find data for this instructor in this class
            const instructorData = instructorMap[config.teacherName];
            if (instructorData) {
                const classDetail = instructorData.classDetails.find(c => c.className === className);
                
                classGroups[className].instructors.push({
                    instructorName: config.teacherName,
                    collection: classDetail?.collection || 0,
                    studentCount: classDetail?.studentCount || 0,
                    paymentCount: classDetail?.paymentCount || 0
                });
                
                classGroups[className].totalClassCollection += classDetail?.collection || 0;
                classGroups[className].totalClassStudents += classDetail?.studentCount || 0;
            }
        });
        
        // Convert to array
        Object.values(classGroups).forEach(group => {
            classInstructorBreakdown.push(group);
        });
        
        // Convert instructor map to array
        const instructorWiseData = Object.values(instructorMap)
            .filter(instructor => instructor.totalCollection > 0 || instructor.studentCount > 0)
            .sort((a, b) => b.totalCollection - a.totalCollection);
        
        // Calculate totals
        const totalCollection = instructorWiseData.reduce((sum, t) => sum + t.totalCollection, 0);
        const totalStudents = instructorWiseData.reduce((sum, t) => sum + t.studentCount, 0);
        const totalPayments = instructorWiseData.reduce((sum, t) => sum + t.paymentCount, 0);
        
        console.log('📊 Final instructor data:', instructorWiseData.map(i => ({
            name: i.instructorName,
            collection: i.totalCollection,
            students: i.studentCount,
            classes: i.classes
        })));
        
        res.json({
            success: true,
            instructorWise: instructorWiseData,
            classInstructorBreakdown: classInstructorBreakdown,
            summary: {
                totalInstructors: instructorWiseData.length,
                totalCollection,
                totalStudents,
                totalPayments,
                averagePerInstructor: instructorWiseData.length > 0 ? (totalCollection / instructorWiseData.length).toFixed(2) : 0
            },
            period: { from, to }
        });
        
    } catch (error) {
        console.error('Error generating teacher-wise report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error generating teacher-wise report: ' + error.message 
        });
    }
});

// ✅ Export teacher-wise report as CSV
router.get('/reports/export/teacher-wise', async (req, res) => {
    try {
        const { from, to } = req.query;
        
        if (!from || !to) {
            return res.status(400).json({
                success: false,
                message: 'Please provide from and to dates'
            });
        }
        
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        
        // Get all class configurations with teachers
        const ClassConfig = require('../models/ClassConfig');
        const classConfigs = await ClassConfig.find({ active: true });
        
        // Create a map of class to teachers
        const classTeachersMap = {};
        classConfigs.forEach(config => {
            if (!classTeachersMap[config.className]) {
                classTeachersMap[config.className] = [];
            }
            classTeachersMap[config.className].push(config.teacherName);
        });
        
        // Get payments for the period
        const Payment = require('../models/Payment');
        const payments = await Payment.find({
            paymentDate: { $gte: fromDate, $lte: toDate },
            status: 'completed'
        });
        
        // Get all students
        const MusicStudent = require('../models/MusicStudent');
        const students = await MusicStudent.find({ status: 'active' });
        
        // Count students per instructor and class
        const instructorStudentCount = {};
        students.forEach(student => {
            if (student.classes && student.classes.length > 0) {
                student.classes.forEach(cls => {
                    if (cls.instructor && cls.className) {
                        const key = `${cls.instructor}::${cls.className}`;
                        instructorStudentCount[key] = (instructorStudentCount[key] || 0) + 1;
                    }
                });
            } else if (student.instructor && student.className) {
                const key = `${student.instructor}::${student.className}`;
                instructorStudentCount[key] = (instructorStudentCount[key] || 0) + 1;
            }
        });
        
        // Create instructor-wise data
        const instructorMap = {};
        
        classConfigs.forEach(config => {
            if (!instructorMap[config.teacherName]) {
                instructorMap[config.teacherName] = {
                    instructorName: config.teacherName,
                    classes: [],
                    totalCollection: 0,
                    paymentCount: 0,
                    studentCount: 0
                };
            }
            instructorMap[config.teacherName].classes.push(config.className);
            
            // Add student count
            const key = `${config.teacherName}::${config.className}`;
            instructorMap[config.teacherName].studentCount += instructorStudentCount[key] || 0;
        });
        
        // Process payments
        payments.forEach(payment => {
            const instructorsForClass = classTeachersMap[payment.className] || [];
            if (instructorsForClass.length > 0) {
                const primaryInstructor = instructorsForClass[0];
                if (instructorMap[primaryInstructor]) {
                    instructorMap[primaryInstructor].totalCollection += payment.amount;
                    instructorMap[primaryInstructor].paymentCount++;
                }
            }
        });
        
        // Generate CSV
        let csv = 'Instructor,Classes Taught,Total Students,Total Collection (₹),Number of Payments,Average per Payment (₹)\n';
        
        Object.values(instructorMap)
            .filter(instructor => instructor.totalCollection > 0 || instructor.studentCount > 0)
            .sort((a, b) => b.totalCollection - a.totalCollection)
            .forEach(instructor => {
                const avgPerPayment = instructor.paymentCount > 0 
                    ? (instructor.totalCollection / instructor.paymentCount).toFixed(2) 
                    : 0;
                
                csv += `${instructor.instructorName},"${instructor.classes.join('; ')}",${instructor.studentCount},${instructor.totalCollection},${instructor.paymentCount},${avgPerPayment}\n`;
            });
        
        // Add class-instructor breakdown
        csv += '\n\nCLASS-INSTRUCTOR BREAKDOWN\n';
        csv += 'Class,Instructor,Students,Collection (₹)\n';
        
        classConfigs.forEach(config => {
            const key = `${config.teacherName}::${config.className}`;
            const studentCount = instructorStudentCount[key] || 0;
            
            // Find collection for this instructor-class combination
            let collection = 0;
            payments.forEach(payment => {
                if (payment.className === config.className) {
                    const instructors = classTeachersMap[config.className] || [];
                    if (instructors.includes(config.teacherName) && instructors[0] === config.teacherName) {
                        collection += payment.amount;
                    }
                }
            });
            
            csv += `${config.className},${config.teacherName},${studentCount},${collection}\n`;
        });
        
        res.json({
            success: true,
            csv
        });
        
    } catch (error) {
        console.error('Error exporting teacher-wise report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error exporting teacher-wise report' 
        });
    }
});

// ========== RAZORPAY INTEGRATION (TO BE IMPLEMENTED LATER) ==========

// Temporary placeholder for Razorpay
router.post('/payments/create', async (req, res) => {
    try {
        const { amount, studentId, className, month } = req.body;
        
        console.log('💰 Payment creation requested:', { amount, studentId, className, month });
        
        // Generate a mock order ID
        const mockOrderId = 'order_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        
        res.json({
            success: true,
            order: {
                id: mockOrderId,
                amount: amount * 100, // Razorpay uses paise
                currency: 'INR',
                receipt: 'receipt_' + Date.now()
            },
            message: 'Mock order created. Replace with actual Razorpay integration when keys are available.'
        });
        
    } catch (error) {
        console.error('Error in payment creation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create payment order',
            error: error.message 
        });
    }
});

// Payment verification endpoint
router.post('/payments/verify', async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, paymentData } = req.body;
        
        const { studentId, className, amount, month, paymentMethod, notes } = paymentData;
        
        // Find the student
        let student = null;
        if (studentId && !studentId.includes('New Student')) {
            student = await MusicStudent.findOne({
                $or: [
                    { studentId: studentId },
                    { email: studentId.toLowerCase() },
                    { phone: studentId }
                ]
            });
        }
        
        // Create payment record
        const payment = new Payment({
            studentId: student ? student.studentId : (studentId || 'NEW_STUDENT'),
            studentName: student ? student.name : (paymentData.studentName || 'New Student'),
            className: className,
            amount: amount,
            month: month,
            paymentMethod: paymentMethod || 'online',
            transactionId: razorpay_payment_id || 'ONLINE_' + Date.now(),
            notes: notes || 'Online payment',
            collectedBy: 'Student (Online)',
            status: 'completed'
        });
        
        await payment.save();
        
        // Update student if exists
        if (student) {
            student.lastPaymentDate = new Date();
            student.paymentStatus = 'paid';
            
            const nextDue = new Date();
            nextDue.setMonth(nextDue.getMonth() + 1);
            nextDue.setDate(1);
            student.nextPaymentDue = nextDue;
            
            await student.save();
        }
        
        // Generate receipt
        let receiptUrl = null;
        try {
            const receipt = await ReceiptGenerator.generatePaymentReceipt(payment, student || {
                studentId: 'NEW_STUDENT',
                name: paymentData.studentName || 'Student',
                className: className
            });
            receiptUrl = receipt.url;
            
            // Save receipt path to payment record
            payment.receiptPath = receipt.filePath;
            await payment.save();
            
        } catch (receiptError) {
            console.error('Error generating receipt:', receiptError);
            // Continue even if receipt generation fails
        }
        
        res.json({
            success: true,
            receiptNo: payment.receiptNo,
            paymentId: payment.paymentId,
            receiptUrl: receiptUrl,
            message: 'Payment successful! Receipt generated.'
        });
        
    } catch (error) {
        console.error('Error in payment verification:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Payment verification failed',
            error: error.message 
        });
    }
});

// ========== MULTI-CLASS STUDENT SUPPORT ==========

// ✅ Get student with all classes - FIXED PHONE SEARCH
router.get('/students/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        
        console.log('🔍 Looking up student with identifier:', identifier);
        
        // Sanitize input
        const cleanIdentifier = identifier.trim();
        
        // Determine search type
        const isEmail = cleanIdentifier.includes('@');
        const isPhone = /^\d{10}$/.test(cleanIdentifier.replace(/\D/g, ''));
        const isStudentId = /^MS\d+$/i.test(cleanIdentifier);
        
        let query = {};
        
        if (isStudentId) {
            // EXACT MATCH for student ID
            console.log('🔍 Searching by Student ID (exact):', cleanIdentifier);
            query = { studentId: { $regex: new RegExp(`^${cleanIdentifier}$`, 'i') } };
        } 
        else if (isEmail) {
            // EXACT MATCH for email
            console.log('🔍 Searching by Email (exact):', cleanIdentifier);
            query = { email: { $regex: new RegExp(`^${cleanIdentifier}$`, 'i') } };
        } 
        else if (isPhone) {
            // FIXED: Phone search - try exact match first
            const cleanPhone = cleanIdentifier.replace(/\D/g, '');
            console.log('🔍 Searching by Phone (exact):', cleanPhone);
            
            // Simple and direct - just match the phone field exactly
            query = { phone: cleanPhone };
            
            // Log for debugging
            console.log('📞 Looking for phone exactly:', cleanPhone);
            
            // Optional: Also try to find any student to debug
            const debug_student = await MusicStudent.findOne({ phone: cleanPhone });
            if (debug_student) {
                console.log('✅ Found student with phone:', debug_student.name);
            } else {
                console.log('❌ No student found with phone:', cleanPhone);
                
                // Debug: List all phones in database (limit 5)
                const allPhones = await MusicStudent.find({}, 'phone name').limit(5);
                console.log('📋 Sample phones in DB:', allPhones.map(s => ({ 
                    name: s.name, 
                    phone: s.phone,
                    type: typeof s.phone,
                    length: s.phone ? s.phone.length : 0
                })));
            }
        } 
        else {
            // Not a valid format
            console.log('❌ Invalid identifier format:', cleanIdentifier);
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid Student ID, Email, or 10-digit Phone number'
            });
        }
        
        // Find student with EXACT match
        const student = await MusicStudent.findOne(query);

        if (!student) {
            console.log('❌ Student not found with query:', JSON.stringify(query));
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Rest of your code remains the same...
        console.log('✅ Student found:', student.studentId, student.name);
        console.log('📚 Classes:', student.classes ? student.classes.length : 'No classes array');
        console.log('💰 Total Monthly Fee:', student.totalMonthlyFee || student.monthlyFee || 0);

        // If student has classes array, use that (multi-class)
        // Otherwise create a classes array from single class fields (backward compatibility)
        let classes = [];
        let totalMonthlyFee = 0;
        
        if (student.classes && student.classes.length > 0) {
            // Multi-class format
            classes = student.classes;
            totalMonthlyFee = student.totalMonthlyFee || 0;
        } else if (student.className) {
            // Single class format - convert to multi-class format
            classes = [{
                className: student.className,
                instructor: student.instructor || '',
                monthlyFee: student.monthlyFee || 0,
                batchTiming: student.batchTiming || ''
            }];
            totalMonthlyFee = student.monthlyFee || 0;
        }

        // Check payment status for current month
        const Payment = require('../models/Payment');
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        
        // Check if already paid for current month
        const existingPayment = await Payment.findOne({
            studentId: student.studentId,
            month: currentMonth,
            status: 'completed'
        });
        
        const hasPaidCurrentMonth = !!existingPayment;

        res.json({
            success: true,
            student: {
                studentId: student.studentId,
                name: student.name,
                email: student.email,
                phone: student.phone,
                classes: classes,
                totalMonthlyFee: totalMonthlyFee,
                status: student.status,
                paymentStatus: hasPaidCurrentMonth ? 'paid' : (student.paymentStatus || 'pending'),
                lastPaymentDate: student.lastPaymentDate,
                nextPaymentDue: student.nextPaymentDue,
                joinDate: student.joinDate,
                address: student.address,
                guardianName: student.guardianName,
                guardianPhone: student.guardianPhone,
                gender: student.gender,
                dateOfBirth: student.dateOfBirth
            }
        });

    } catch (error) {
        console.error('❌ Error fetching student with classes:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching student details',
            error: error.message
        });
    }
});

// ========== BULK UPDATE STUDENTS BY CLASS ==========

// Update all students in a class with new fee
router.post('/students/bulk-update-class-fee', async (req, res) => {
    try {
        const { className, newFee, updatedBy } = req.body;
        
        // Find all students in this class (both old and new format)
        const students = await MusicStudent.find({
            $or: [
                { className: className },
                { 'classes.className': className }
            ]
        });
        
        let updatedCount = 0;
        
        for (const student of students) {
            let updated = false;
            
            // Update in classes array
            if (student.classes && student.classes.length > 0) {
                student.classes.forEach(cls => {
                    if (cls.className === className) {
                        cls.monthlyFee = newFee;
                        updated = true;
                    }
                });
                
                // Recalculate total monthly fee
                if (updated) {
                    student.totalMonthlyFee = student.classes.reduce((total, cls) => total + (cls.monthlyFee || 0), 0);
                }
            }
            
            // Update old format if applicable
            if (student.className === className) {
                student.monthlyFee = newFee;
                updated = true;
            }
            
            // Add to fee history
            if (updated) {
                if (!student.feeHistory) {
                    student.feeHistory = [];
                }
                
                student.feeHistory.push({
                    oldFee: student.monthlyFee,
                    newFee: newFee,
                    effectiveFrom: new Date(),
                    updatedBy: updatedBy || 'System',
                    reason: `Bulk update for ${className} class`
                });
                
                await student.save();
                updatedCount++;
            }
        }
        
        res.json({
            success: true,
            message: `Updated ${updatedCount} students`,
            updatedCount
        });
        
    } catch (error) {
        console.error('Error bulk updating students:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ========== TEACHERS MANAGEMENT ==========

// Get all teachers
router.get('/teachers', async (req, res) => {
    try {
        console.log('Fetching teachers from database...');
        const teachers = await Teacher.find().sort({ name: 1 });
        console.log(`Found ${teachers.length} teachers`);
        
        res.json({
            success: true,
            teachers: teachers
        });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch teachers' 
        });
    }
});

// Get single teacher
router.get('/teachers/:id', async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ 
                success: false, 
                message: 'Teacher not found' 
            });
        }
        res.json({ 
            success: true, 
            teacher 
        });
    } catch (error) {
        console.error('Error fetching teacher:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch teacher' 
        });
    }
});

// Add new teacher
router.post('/teachers', async (req, res) => {
    try {
        const { name, classes, phone, email, specialization } = req.body;
        
        if (!name) {
            return res.status(400).json({ 
                success: false, 
                message: 'Teacher name is required' 
            });
        }
        
        const teacher = new Teacher({
            name,
            classes: classes || [],
            phone: phone || '',
            email: email || '',
            specialization: specialization || ''
        });
        
        await teacher.save();
        
        res.json({ 
            success: true, 
            message: 'Teacher added successfully',
            teacher 
        });
    } catch (error) {
        console.error('Error adding teacher:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to add teacher' 
        });
    }
});

// Update teacher
router.put('/teachers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, classes, phone, email, specialization, active } = req.body;
        
        console.log('Updating teacher:', id, req.body);
        
        const teacher = await Teacher.findById(id);
        
        if (!teacher) {
            return res.status(404).json({ 
                success: false, 
                message: 'Teacher not found' 
            });
        }
        
        teacher.name = name || teacher.name;
        teacher.classes = classes || teacher.classes;
        teacher.phone = phone || teacher.phone;
        teacher.email = email || teacher.email;
        teacher.specialization = specialization || teacher.specialization;
        if (active !== undefined) teacher.active = active;
        
        await teacher.save();
        
        res.json({
            success: true,
            message: 'Teacher updated successfully',
            teacher
        });
        
    } catch (error) {
        console.error('Error updating teacher:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update teacher: ' + error.message 
        });
    }
});

// Delete teacher
router.delete('/teachers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if teacher is assigned to any classes
        const ClassConfig = require('../models/ClassConfig');
        const classWithTeacher = await ClassConfig.findOne({ teacherId: id });
        
        if (classWithTeacher) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete teacher assigned to classes. Please reassign classes first.' 
            });
        }
        
        const teacher = await Teacher.findByIdAndDelete(id);
        
        if (!teacher) {
            return res.status(404).json({ 
                success: false, 
                message: 'Teacher not found' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Teacher deleted successfully' 
        });
        
    } catch (error) {
        console.error('Error deleting teacher:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete teacher' 
        });
    }
});

// ========== DEBUG ENDPOINTS ==========
router.get('/debug/all-receipts', async (req, res) => {
    try {
        const receipts = await Receipt.find().select('receiptNumber financialYear studentId receiptDate');
        res.json({ success: true, count: receipts.length, receipts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/debug/check-receipt/:receiptNumber', async (req, res) => {
    try {
        const { receiptNumber } = req.params;
        const receipt = await Receipt.findOne({ receiptNumber });
        res.json({ 
            exists: !!receipt, 
            receipt: receipt ? {
                receiptNumber: receipt.receiptNumber,
                financialYear: receipt.financialYear,
                studentId: receipt.studentId
            } : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== ROUTE DEBUGGING - MOVED TO THE VERY END ==========
// console.log('\n📋 REGISTERED ROUTES:');
// router.stack.forEach((r) => {
//     if (r.route && r.route.path) {
//         console.log(`${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
//     }
// });

// // Add this at the VERY END of your music.js file, right before module.exports = router
// console.log('\n🔍 DEBUGGING ROUTER STACK:');
// let foundPdfRoute = false;
// let foundWildcardRoute = false;

// router.stack.forEach((layer) => {
//     if (layer.route && layer.route.path) {
//         console.log(`Route: ${layer.route.path}`);
        
//         // Check for both parameterized and wildcard PDF routes
//         if (layer.route.path === '/receipts/pdf/:receiptNumber') {
//             foundPdfRoute = true;
//             console.log('✅ FOUND PDF PARAMETER ROUTE!');
//         }
//         if (layer.route.path === '/receipts/pdf/*') {
//             foundWildcardRoute = true;
//             console.log('✅ FOUND PDF WILDCARD ROUTE!');
//         }
//     }
// });

// if (!foundPdfRoute && !foundWildcardRoute) {
//     console.log('❌ NO PDF ROUTE FOUND IN STACK!');
// } else {
//     console.log('✓ PDF routes are properly registered');
// }

// // Optional: Show count of total routes
// console.log(`\n📊 Total routes registered: ${router.stack.length}`);


module.exports = router;