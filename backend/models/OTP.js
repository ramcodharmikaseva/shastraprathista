const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: String,
  phone: String,
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['signup', 'login', 'forgot-password'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Auto-delete expired OTPs after 10 minutes
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.model('OTP', otpSchema);