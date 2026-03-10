const mongoose = require('mongoose');

const gstSettingsSchema = new mongoose.Schema({
    gstPercentage: {
        type: Number,
        default: 18,
        min: 0,
        max: 100
    },
    gstNumber: {
        type: String,
        default: '',
        trim: true
    },
    applicableClasses: [{
        type: String
    }],
    createdBy: {
        type: String,
        default: 'System'
    },
    updatedBy: {
        type: String,
        default: 'System'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('GSTSettings', gstSettingsSchema);