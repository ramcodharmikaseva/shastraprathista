// backend/models/Receipt.js
const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
    receiptNumber: {
        type: String,
        required: true,
        unique: true
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        required: true
    },
    studentId: {
        type: String,
        ref: 'MusicStudent',
        required: true
    },
    financialYear: {
        type: String,
        required: true
    },
    receiptDate: {
        type: Date,
        default: Date.now
    },
    // Store receipt data as a snapshot
    receiptData: {
        studentName: String,
        studentId: String,
        studentEmail: String,
        studentPhone: String,
        classes: [{
            className: String,
            teacherName: String,
            fees: Number
        }],
        paymentMonth: String,
        paymentMethod: String,
        totalAmount: Number,
        baseAmount: Number,
        gstAmount: Number,
        gstPercentage: Number,
        transactionId: String,
        bankReference: String,
        notes: String
    }
}, {
    timestamps: true
});

// Helper function to generate financial year
receiptSchema.statics.getFinancialYear = function(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Financial year in India: April to March
    if (month >= 4) {
        return `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
        return `${year - 1}-${year.toString().slice(-2)}`;
    }
};

// Helper function to generate next receipt number
receiptSchema.statics.generateReceiptNumber = async function(date = new Date()) {
    const financialYear = this.getFinancialYear(date);
    
    // Find the last receipt for this financial year
    const lastReceipt = await this.findOne({ 
        financialYear: financialYear 
    }).sort({ receiptNumber: -1 });
    
    let nextNumber = 1;
    if (lastReceipt) {
        // Extract the sequence number from last receipt
        // Format: MS/2025-26/001
        const lastNumber = parseInt(lastReceipt.receiptNumber.split('/')[2]);
        nextNumber = lastNumber + 1;
    }
    
    // Format with leading zeros (3 digits)
    const sequenceNumber = nextNumber.toString().padStart(3, '0');
    const receiptNumber = `MS/${financialYear}/${sequenceNumber}`;
    
    return {
        receiptNumber,
        financialYear,
        sequenceNumber
    };
};

module.exports = mongoose.model('Receipt', receiptSchema);