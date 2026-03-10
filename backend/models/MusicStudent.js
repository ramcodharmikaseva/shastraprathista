const mongoose = require('mongoose');

const musicStudentSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: function() {
            // Auto-generate student ID if not provided
            const year = new Date().getFullYear().toString().slice(-2);
            const random = Math.floor(100 + Math.random() * 900);
            return `MS${year}${random}`;
        }
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number starting with 6-9']
    },
    classes: [
        {
            className: {
                type: String,
                required: true
                // REMOVE the enum!
            },
            instructor: {
                type: String,
                required: true
                // REMOVE the enum!
            },
            monthlyFee: {
                type: Number,
                required: true,
                min: 0
            },
            batchTiming: {
                type: String,
                trim: true,
                default: ''
            }
        }
    ],

    totalMonthlyFee: {
        type: Number,
        required: true,
        min: 0
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'graduated', 'on_leave'],
        default: 'active'
    },
    address: {
        street: { type: String, trim: true, default: '' },
        city: { type: String, trim: true, default: '' },
        state: { type: String, trim: true, default: '' },
        pincode: { 
            type: String, 
            trim: true, 
            default: '',
            match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
        }
    },
    guardianName: {
        type: String,
        trim: true,
        default: ''
    },
    guardianPhone: {
        type: String,
        trim: true,
        default: '',
        match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number starting with 6-9']
    },
    dateOfBirth: {
        type: Date,
        set: function(value) {
            // Auto-convert string dates to Date objects
            if (!value) return null;
            if (value instanceof Date) return value;
            
            // Try to parse the date
            let date = new Date(value);
            if (!isNaN(date.getTime())) return date;
            
            // Try different formats
            const parts = value.split(/[-\/]/);
            if (parts.length === 3) {
                if (parts[0].length === 4) { // YYYY-MM-DD
                    date = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
                } else if (parts[2].length === 4) { // DD-MM-YYYY
                    date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
            }
            
            // Return null if still invalid instead of throwing error
            return !isNaN(date.getTime()) ? date : null;
        }
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', ''],
        default: ''
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    lastPaymentDate: {
        type: Date
    },
    nextPaymentDue: {
        type: Date,
        default: function() {
            // Set next payment due date (30 days from now)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            return dueDate;
        }
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'pending', 'overdue'],
        default: 'pending'
    },
    feeHistory: [{
        oldFee: {
            type: Number,
            required: true,
            min: 0
        },
        newFee: {
            type: Number,
            required: true,
            min: 0
        },
        effectiveFrom: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: String,
            default: 'Admin'
        },
        reason: {
            type: String,
            default: ''
        }
    }],
}, {
    timestamps: true
});

// Add index for better query performance
musicStudentSchema.index({ studentId: 1 });
musicStudentSchema.index({ email: 1 });
musicStudentSchema.index({ phone: 1 });
musicStudentSchema.index({ className: 1 });
musicStudentSchema.index({ status: 1 });
musicStudentSchema.index({ paymentStatus: 1 });
musicStudentSchema.index({ nextPaymentDue: 1 });

// Virtual for age calculation
musicStudentSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

// Method to mark payment
musicStudentSchema.methods.markPayment = function(amount, month, paymentMethod = 'cash') {
    this.lastPaymentDate = new Date();
    this.paymentStatus = 'paid';
    
    // Set next payment due to next month
    const nextDue = new Date();
    nextDue.setMonth(nextDue.getMonth() + 1);
    this.nextPaymentDue = nextDue;
    
    return this.save();
};

// Method to check if payment is overdue
musicStudentSchema.methods.isPaymentOverdue = function() {
    if (this.paymentStatus === 'paid') return false;
    if (!this.nextPaymentDue) return false;
    
    const today = new Date();
    return today > this.nextPaymentDue;
};

// Static method to get overdue students
musicStudentSchema.statics.getOverdueStudents = function() {
    const today = new Date();
    return this.find({
        paymentStatus: 'pending',
        nextPaymentDue: { $lt: today },
        status: 'active'
    });
};

module.exports = mongoose.model('MusicStudent', musicStudentSchema);