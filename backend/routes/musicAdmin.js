const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdminPageAccess } = require('../middleware/requireRole');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Apply page access protection - Only music_admin and super_admin can access
router.use(requireAdminPageAccess('music_admin'));

// Welcome endpoint for music admin
router.get('/welcome', (req, res) => {
  res.json({
    success: true,
    message: `Welcome to Music Admin Portal, ${req.user.name}!`,
    user: {
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    },
    permissions: req.user.permissions || []
  });
});

// ========== EXISTING STUDENT ROUTES (UPDATED) ==========

// Get music school statistics - UPDATED for multi-class
router.get('/stats', async (req, res) => {
  try {
    const MusicStudent = require('../models/MusicStudent');
    
    const totalStudents = await MusicStudent.countDocuments();
    const activeStudents = await MusicStudent.countDocuments({ status: 'active' });
    const newStudents = await MusicStudent.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    // Get students by course (handle both old and new format)
    const studentsByCourse = await MusicStudent.aggregate([
      {
        $project: {
          courses: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$classes', []] } }, 0] },
              then: '$classes.className',
              else: ['$className']
            }
          }
        }
      },
      { $unwind: '$courses' },
      {
        $group: {
          _id: '$courses',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get total monthly collection (from payments)
    const Payment = require('../models/Payment');
    const currentMonth = new Date().toISOString().slice(0, 7);
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
    
    res.json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        newStudents,
        studentsByCourse,
        monthlyCollection: monthlyCollection[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching music stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch music statistics'
    });
  }
});

// Get music students - UPDATED for multi-class
router.get('/students', async (req, res) => {
  try {
    const MusicStudent = require('../models/MusicStudent');
    const { page = 1, limit = 20, status, course } = req.query;
    
    let query = {};
    if (status && status !== 'all') query.status = status;
    
    // Handle course search (check both old and new format)
    if (course && course !== 'all') {
      query.$or = [
        { className: course },
        { 'classes.className': course }
      ];
    }
    
    const students = await MusicStudent.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await MusicStudent.countDocuments(query);
    
    res.json({
      success: true,
      students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching music students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch music students'
    });
  }
});

// Add student - UPDATED for multi-class
router.post('/students', async (req, res) => {
  try {
    const MusicStudent = require('../models/MusicStudent');
    const studentData = req.body;
    
    // If classes array is provided, calculate totalMonthlyFee
    if (studentData.classes && Array.isArray(studentData.classes)) {
      studentData.totalMonthlyFee = studentData.classes.reduce((total, cls) => total + (cls.monthlyFee || 0), 0);
      
      // For backward compatibility, set className to first class
      if (studentData.classes.length > 0) {
        studentData.className = studentData.classes[0].className;
        studentData.instructor = studentData.classes[0].instructor;
        studentData.monthlyFee = studentData.classes[0].monthlyFee;
        studentData.batchTiming = studentData.classes[0].batchTiming;
      }
    }
    
    const student = new MusicStudent(studentData);
    await student.save();
    
    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      student
    });
  } catch (error) {
    console.error('❌ Error adding student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add student'
    });
  }
});

// ========== NEW: CLASS CONFIGURATION ROUTES ==========

// Get all class configurations (for dropdowns, fee management)
router.get('/class-configs', async (req, res) => {
  try {
    const ClassConfig = require('../models/ClassConfig');
    
    const configs = await ClassConfig.find({ active: true }).sort({ className: 1 });
    
    res.json({
      success: true,
      configurations: configs
    });
  } catch (error) {
    console.error('❌ Error fetching class configs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class configurations'
    });
  }
});

// ========== CLASS CONFIGURATION ROUTES FOR ADMIN ==========

// Get single class configuration by ID
router.get('/class-configurations/:id', async (req, res) => {
    try {
        const ClassConfig = require('../models/ClassConfig');
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
        console.error('❌ Error fetching class configuration:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch class configuration' 
        });
    }
});

// Add new class configuration
router.post('/class-configs', async (req, res) => {
  try {
    const ClassConfig = require('../models/ClassConfig');
    const { className, teacherName, baseFee, description } = req.body;
    
    // Check if class already exists
    const existing = await ClassConfig.findOne({ className });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Class already exists'
      });
    }
    
    const config = new ClassConfig({
      className,
      teacherName,
      baseFee,
      description,
      createdBy: req.user.name,
      updatedBy: req.user.name
    });
    
    await config.save();
    
    res.status(201).json({
      success: true,
      message: 'Class configuration added successfully',
      configuration: config
    });
  } catch (error) {
    console.error('❌ Error adding class config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add class configuration'
    });
  }
});

// Update class configuration
router.put('/class-configs/:id', async (req, res) => {
  try {
    const ClassConfig = require('../models/ClassConfig');
    const { className, teacherName, baseFee, description, active } = req.body;
    
    const config = await ClassConfig.findByIdAndUpdate(
      req.params.id,
      {
        className,
        teacherName,
        baseFee,
        description,
        active,
        updatedBy: req.user.name,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      configuration: config
    });
  } catch (error) {
    console.error('❌ Error updating class config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update class configuration'
    });
  }
});

// Toggle class status
router.patch('/class-configs/:id/toggle', async (req, res) => {
  try {
    const ClassConfig = require('../models/ClassConfig');
    
    const config = await ClassConfig.findById(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }
    
    config.active = !config.active;
    config.updatedBy = req.user.name;
    config.updatedAt = new Date();
    await config.save();
    
    res.json({
      success: true,
      message: `Class ${config.active ? 'activated' : 'deactivated'} successfully`,
      active: config.active
    });
  } catch (error) {
    console.error('❌ Error toggling class status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle class status'
    });
  }
});

// ========== NEW: GST SETTINGS ROUTES ==========

// Get GST settings
router.get('/gst-settings', async (req, res) => {
  try {
    const GSTSettings = require('../models/GSTSettings');
    
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
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('❌ Error fetching GST settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch GST settings'
    });
  }
});

// Save GST settings
router.post('/gst-settings', async (req, res) => {
  try {
    const GSTSettings = require('../models/GSTSettings');
    const { gstPercentage, gstNumber, applicableClasses } = req.body;
    
    let settings = await GSTSettings.findOne();
    
    if (settings) {
      settings.gstPercentage = gstPercentage;
      settings.gstNumber = gstNumber;
      if (applicableClasses) settings.applicableClasses = applicableClasses;
      settings.updatedBy = req.user.name;
      settings.updatedAt = new Date();
    } else {
      settings = new GSTSettings({
        gstPercentage,
        gstNumber,
        applicableClasses,
        createdBy: req.user.name,
        updatedBy: req.user.name
      });
    }
    
    await settings.save();
    
    res.json({
      success: true,
      message: 'GST settings saved successfully',
      settings
    });
  } catch (error) {
    console.error('❌ Error saving GST settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save GST settings'
    });
  }
});

// ========== PAYMENT ROUTES (UPDATED) ==========

// ✅ Get all payments (with filtering) - UPDATED
router.get('/payments', async (req, res) => {
    try {
        const Payment = require('../models/Payment');
        const { month, className, status, page = 1, limit = 20 } = req.query;
        
        let query = {};
        if (month) query.month = month;
        if (className) query.className = className;
        if (status) query.status = status;
        
        const payments = await Payment.find(query)
            .sort({ paymentDate: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));
        
        const total = await Payment.countDocuments(query);
        
        // Calculate totals
        const totalAmount = await Payment.aggregate([
            { $match: query },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        res.json({
            success: true,
            payments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            totalCollected: totalAmount[0]?.total || 0
        });
        
    } catch (error) {
        console.error('❌ Error fetching payments:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch payments' });
    }
});

// ✅ Get monthly collection summary - UPDATED
router.get('/collections/monthly', async (req, res) => {
    try {
        const Payment = require('../models/Payment');
        const { year = new Date().getFullYear() } = req.query;
        
        const monthlyData = await Payment.aggregate([
            {
                $match: {
                    paymentDate: {
                        $gte: new Date(`${year}-01-01`),
                        $lte: new Date(`${year}-12-31`)
                    },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: { $substr: ['$paymentDate', 0, 7] }, // YYYY-MM
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                    students: { $addToSet: '$studentId' }
                }
            },
            {
                $project: {
                    month: '$_id',
                    totalAmount: 1,
                    count: 1,
                    studentCount: { $size: '$students' }
                }
            },
            { $sort: { month: 1 } }
        ]);
        
        // Calculate GST component if applicable
        const GSTSettings = require('../models/GSTSettings');
        const gstSettings = await GSTSettings.findOne();
        const gstPercentage = gstSettings?.gstPercentage || 0;
        
        const monthlyDataWithGST = monthlyData.map(item => ({
            ...item,
            gstAmount: (item.totalAmount * gstPercentage / 100).toFixed(2),
            baseAmount: (item.totalAmount * 100 / (100 + gstPercentage)).toFixed(2)
        }));
        
        res.json({
            success: true,
            year,
            gstPercentage,
            monthlyData: monthlyDataWithGST
        });
        
    } catch (error) {
        console.error('❌ Error fetching monthly collections:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch collections' });
    }
});

// ✅ Get class-wise collection - UPDATED
router.get('/collections/by-class', async (req, res) => {
    try {
        const Payment = require('../models/Payment');
        const { month } = req.query;
        
        let matchStage = { status: 'completed' };
        if (month) matchStage.month = month;
        
        const classData = await Payment.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$className',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                    students: { $addToSet: '$studentId' }
                }
            },
            {
                $project: {
                    className: '$_id',
                    totalAmount: 1,
                    count: 1,
                    studentCount: { $size: '$students' }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);
        
        // Get class-wise fee details from ClassConfig
        const ClassConfig = require('../models/ClassConfig');
        const classConfigs = await ClassConfig.find({ active: true });
        
        const classConfigMap = {};
        classConfigs.forEach(config => {
            classConfigMap[config.className] = {
                baseFee: config.baseFee,
                teacherName: config.teacherName
            };
        });
        
        // Enhance class data with fee info
        const enhancedClassData = classData.map(item => ({
            ...item,
            baseFee: classConfigMap[item.className]?.baseFee || 0,
            teacherName: classConfigMap[item.className]?.teacherName || 'Unknown'
        }));
        
        res.json({
            success: true,
            classData: enhancedClassData
        });
        
    } catch (error) {
        console.error('❌ Error fetching class collections:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch class collections' });
    }
});

// ✅ Bulk mark payments (for admin) - UPDATED
router.post('/payments/bulk-mark', async (req, res) => {
    try {
        const { studentIds, month, amount, paymentMethod = 'cash' } = req.body;
        const Payment = require('../models/Payment');
        const MusicStudent = require('../models/MusicStudent');
        
        const results = [];
        const errors = [];
        
        for (const studentId of studentIds) {
            try {
                const student = await MusicStudent.findOne({ studentId });
                
                if (!student) {
                    errors.push(`Student ${studentId} not found`);
                    continue;
                }
                
                // Determine amount (use provided or totalMonthlyFee)
                const paymentAmount = amount || student.totalMonthlyFee || student.monthlyFee || 0;
                
                // Create payment record
                const payment = new Payment({
                    studentId: student.studentId,
                    studentName: student.name,
                    className: student.className,
                    amount: paymentAmount,
                    month: month || new Date().toISOString().slice(0, 7),
                    paymentMethod,
                    collectedBy: req.user?.name || 'Admin',
                    notes: 'Bulk payment marking'
                });
                
                await payment.save();
                
                // Update student
                student.lastPaymentDate = new Date();
                student.nextPaymentDue = new Date();
                student.nextPaymentDue.setMonth(student.nextPaymentDue.getMonth() + 1);
                student.paymentStatus = 'paid';
                
                await student.save();
                
                results.push({
                    studentId,
                    paymentId: payment.paymentId,
                    receiptNo: payment.receiptNo
                });
                
            } catch (error) {
                errors.push(`Student ${studentId}: ${error.message}`);
            }
        }
        
        res.json({
            success: true,
            processed: results.length,
            failed: errors.length,
            results,
            errors: errors.slice(0, 10)
        });
        
    } catch (error) {
        console.error('❌ Error in bulk payment marking:', error);
        res.status(500).json({ success: false, message: 'Failed to process bulk payments' });
    }
});

// ✅ Export payments to CSV - UPDATED
router.get('/export/payments', async (req, res) => {
    try {
        const Payment = require('../models/Payment');
        const { from, to, className } = req.query;
        
        let query = { status: 'completed' };
        
        if (from || to) {
            query.paymentDate = {};
            if (from) query.paymentDate.$gte = new Date(from);
            if (to) query.paymentDate.$lte = new Date(to);
        }
        
        if (className) query.className = className;
        
        const payments = await Payment.find(query).sort({ paymentDate: -1 });
        
        let csv = 'Payment ID,Student ID,Student Name,Class,Amount,Month,Payment Date,Payment Method,Receipt No,Status\n';
        
        payments.forEach(p => {
            csv += `${p.paymentId},${p.studentId},${p.studentName},${p.className},${p.amount},${p.month},${p.paymentDate?.toISOString().split('T')[0] || ''},${p.paymentMethod},${p.receiptNo},${p.status}\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=payments_export.csv');
        res.send(csv);
        
    } catch (error) {
        console.error('❌ Error exporting payments:', error);
        res.status(500).json({ success: false, message: 'Failed to export payments' });
    }
});

// Add receipt generation to admin mark-payment - UPDATED
router.post('/mark-payment/:studentId', authMiddleware, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { amount, month, paymentMethod, notes } = req.body;
        const user = req.user; // From auth middleware

        // Only admin, music_admin, and super_admin can mark cash payments
        if (!['admin', 'music_admin', 'super_admin'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only administrators can mark cash payments'
            });
        }

        // Force payment method to cash for admin
        const adminPaymentMethod = 'cash';

        const MusicStudent = require('../models/MusicStudent');
        const Payment = require('../models/Payment');
        const ReceiptGenerator = require('../utils/receiptGenerator');

        const student = await MusicStudent.findOne({ studentId });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Determine amount (use provided or totalMonthlyFee)
        const paymentAmount = amount || student.totalMonthlyFee || student.monthlyFee || 0;

        // Create payment record
        const payment = new Payment({
            studentId: student.studentId,
            studentName: student.name,
            className: student.className,
            amount: paymentAmount,
            month: month || new Date().toISOString().slice(0, 7),
            paymentMethod: adminPaymentMethod,
            notes: notes || `Collected by ${user.name} (${user.role})`,
            collectedBy: `${user.name} (${user.role})`,
            status: 'completed'
        });

        await payment.save();

        // Update student
        student.lastPaymentDate = new Date();
        student.paymentStatus = 'paid';
        
        const nextDue = new Date();
        nextDue.setMonth(nextDue.getMonth() + 1);
        nextDue.setDate(1);
        student.nextPaymentDue = nextDue;
        
        await student.save();

        // Generate receipt
        let receiptUrl = null;
        try {
            const receipt = await ReceiptGenerator.generatePaymentReceipt(payment, student);
            receiptUrl = receipt.url;
            payment.receiptPath = receipt.filePath;
            await payment.save();
        } catch (receiptError) {
            console.error('Error generating receipt:', receiptError);
        }

        // Get GST settings for receipt
        const GSTSettings = require('../models/GSTSettings');
        const gstSettings = await GSTSettings.findOne();

        res.json({
            success: true,
            message: 'Payment recorded successfully',
            receiptNo: payment.receiptNo,
            receiptUrl: receiptUrl,
            payment: {
                ...payment.toObject(),
                gstPercentage: gstSettings?.gstPercentage || 0,
                gstAmount: (paymentAmount * (gstSettings?.gstPercentage || 0) / 100).toFixed(2)
            }
        });

    } catch (error) {
        console.error('Error marking payment:', error);
        res.status(500).json({ success: false, message: 'Error marking payment' });
    }
});

// Get all receipts for a student - UPDATED
router.get('/receipts/student/:studentId', authMiddleware, async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const payments = await Payment.find({ 
            studentId: studentId,
            status: 'completed'
        }).sort({ paymentDate: -1 });
        
        // Get GST settings
        const GSTSettings = require('../models/GSTSettings');
        const gstSettings = await GSTSettings.findOne();
        
        const receipts = payments.map(p => ({
            receiptNo: p.receiptNo,
            date: p.paymentDate,
            amount: p.amount,
            gstAmount: (p.amount * (gstSettings?.gstPercentage || 0) / 100).toFixed(2),
            month: p.month,
            paymentMethod: p.paymentMethod,
            downloadUrl: `/api/music/receipt/${p.receiptNo}`
        }));
        
        res.json({
            success: true,
            receipts
        });
        
    } catch (error) {
        console.error('Error fetching receipts:', error);
        res.status(500).json({ success: false, message: 'Error fetching receipts' });
    }
});

// Add this to your routes/musicAdmin.js file (protected routes)

// Generate PDF receipt - PROTECTED (requires auth)
router.get('/receipts/pdf/:receiptNumber', authMiddleware, async (req, res) => {
    try {
        const { receiptNumber } = req.params;
        console.log('📄 Admin PDF request for receipt:', receiptNumber);
        
        const receipt = await Receipt.findOne({ receiptNumber });
        
        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }
        
        // Same PDF generation code as above...
        // [Copy the PDF generation code from Option 1 here]
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== NEW: DASHBOARD SUMMARY FOR ADMIN ==========

// Get comprehensive dashboard summary
router.get('/dashboard-summary', async (req, res) => {
    try {
        const MusicStudent = require('../models/MusicStudent');
        const Payment = require('../models/Payment');
        const ClassConfig = require('../models/ClassConfig');
        const GSTSettings = require('../models/GSTSettings');
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        const today = new Date();
        
        // Student stats
        const totalStudents = await MusicStudent.countDocuments();
        const activeStudents = await MusicStudent.countDocuments({ status: 'active' });
        
        // Payment stats
        const pendingPayments = await MusicStudent.countDocuments({ 
            paymentStatus: 'pending',
            status: 'active'
        });
        
        const overduePayments = await MusicStudent.countDocuments({
            paymentStatus: 'pending',
            nextPaymentDue: { $lt: today },
            status: 'active'
        });
        
        // Monthly collection
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
        
        // Class stats
        const classStats = await MusicStudent.aggregate([
            {
                $project: {
                    courses: {
                        $cond: {
                            if: { $gt: [{ $size: { $ifNull: ['$classes', []] } }, 0] },
                            then: '$classes.className',
                            else: ['$className']
                        }
                    }
                }
            },
            { $unwind: '$courses' },
            {
                $group: {
                    _id: '$courses',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        
        // Recent payments
        const recentPayments = await Payment.find({ status: 'completed' })
            .sort({ paymentDate: -1 })
            .limit(10);
        
        // Upcoming due dates (next 7 days)
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const upcomingDue = await MusicStudent.find({
            status: 'active',
            paymentStatus: 'pending',
            nextPaymentDue: {
                $gte: today,
                $lte: nextWeek
            }
        }).select('studentId name nextPaymentDue totalMonthlyFee').limit(10);
        
        // Get GST settings
        const gstSettings = await GSTSettings.findOne();
        
        // Get class configs count
        const classConfigsCount = await ClassConfig.countDocuments({ active: true });
        
        res.json({
            success: true,
            summary: {
                students: {
                    total: totalStudents,
                    active: activeStudents,
                    inactive: totalStudents - activeStudents
                },
                payments: {
                    pending: pendingPayments,
                    overdue: overduePayments,
                    monthlyCollection: monthlyCollection[0]?.total || 0,
                    recentPayments
                },
                upcomingDue,
                classDistribution: classStats,
                classConfigsCount,
                gstPercentage: gstSettings?.gstPercentage || 18,
                currentMonth
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching dashboard summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard summary'
        });
    }
});

module.exports = router;