const mongoose = require('mongoose');

const classConfigSchema = new mongoose.Schema({
    className: {
        type: String,
        required: true,
        unique: true
    },
    teacherName: {
        type: String,
        required: true
    },
    baseFee: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        default: ''
    },
    active: {
        type: Boolean,
        default: true
    },
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

module.exports = mongoose.model('ClassConfig', classConfigSchema);