const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true 
    },
    classes: [{ 
        type: String,
        trim: true 
    }],
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    specialization: {
        type: String,
        trim: true
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Teacher', teacherSchema);