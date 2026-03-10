// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true,
        ref: 'MusicStudent'
    },
    studentName: {
        type: String,
        required: true
    },
    className: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
        comment: 'Total amount including GST'
    },
    // NEW GST FIELDS
    baseAmount: {
        type: Number,
        required: true,
        min: 0,
        default: function() {
            return this.amount; // Fallback to amount if not provided
        },
        comment: 'Amount before GST'
    },
    gstAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
        comment: 'GST amount calculated'
    },
    gstPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 18,
        comment: 'GST percentage applied'
    },
    // END NEW GST FIELDS
    
    month: {
        type: String,
        required: true // Format: YYYY-MM
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'online', 'cheque'],
        default: 'cash'
    },
    paymentId: {
        type: String,
        unique: true,
        default: function() {
            return 'PAY' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
        }
    },
    receiptNo: {
        type: String,
        unique: true,
        default: function() {
            const year = new Date().getFullYear().toString().slice(-2);
            const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
            const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            return `RCPT${year}${month}${random}`;
        }
    },
    status: {
        type: String,
        enum: ['completed', 'pending', 'failed', 'refunded'],
        default: 'completed'
    },
    notes: {
        type: String,
        trim: true
    },
    collectedBy: {
        type: String,
        default: 'Admin'
    },
    bankReference: {
        type: String,
        trim: true
    },
    transactionId: {
        type: String,
        trim: true
    },
    // Optional: Store receipt path if PDF is generated
    receiptPath: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for faster queries
paymentSchema.index({ studentId: 1, month: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ gstPercentage: 1 }); // New index for GST queries

// Virtual for GST breakdown
paymentSchema.virtual('gstBreakdown').get(function() {
    return {
        baseAmount: this.baseAmount,
        gstAmount: this.gstAmount,
        gstPercentage: this.gstPercentage,
        totalAmount: this.amount,
        gstRate: `${this.gstPercentage}%`
    };
});

// Method to calculate GST if not provided
paymentSchema.methods.calculateGST = function(baseAmount, gstPercentage) {
    this.baseAmount = baseAmount;
    this.gstPercentage = gstPercentage || 18;
    this.gstAmount = (baseAmount * this.gstPercentage / 100);
    this.amount = baseAmount + this.gstAmount;
    return this;
};

// Pre-save middleware to ensure GST fields are set
paymentSchema.pre('save', function(next) {
    // If baseAmount is not set but amount is, try to derive
    if (!this.baseAmount && this.amount) {
        if (this.gstPercentage) {
            // Reverse calculate base amount
            this.baseAmount = this.amount / (1 + (this.gstPercentage / 100));
            this.gstAmount = this.amount - this.baseAmount;
        } else {
            // Default to no GST
            this.baseAmount = this.amount;
            this.gstAmount = 0;
            this.gstPercentage = 0;
        }
    }
    
    // Ensure receiptNo format
    if (!this.receiptNo || this.receiptNo === 'RCPT' + Date.now().toString().slice(-8)) {
        const year = new Date().getFullYear().toString().slice(-2);
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.receiptNo = `RCPT${year}${month}${random}`;
    }
    
    next();
});

// Static method to get monthly GST summary
paymentSchema.statics.getMonthlyGSTSummary = async function(month) {
    const match = month ? { month } : {};
    
    return this.aggregate([
        { $match: { ...match, status: 'completed' } },
        {
            $group: {
                _id: '$month',
                totalAmount: { $sum: '$amount' },
                totalBaseAmount: { $sum: '$baseAmount' },
                totalGST: { $sum: '$gstAmount' },
                count: { $sum: 1 },
                avgGSTPercentage: { $avg: '$gstPercentage' }
            }
        },
        { $sort: { '_id': -1 } }
    ]);
};

// Static method to get class-wise GST collection
paymentSchema.statics.getClassWiseGST = async function(month) {
    const match = month ? { month } : {};
    
    return this.aggregate([
        { $match: { ...match, status: 'completed' } },
        {
            $group: {
                _id: '$className',
                totalAmount: { $sum: '$amount' },
                totalBaseAmount: { $sum: '$baseAmount' },
                totalGST: { $sum: '$gstAmount' },
                count: { $sum: 1 },
                gstPercentage: { $first: '$gstPercentage' }
            }
        },
        { $sort: { totalAmount: -1 } }
    ]);
};

module.exports = mongoose.model('Payment', paymentSchema);