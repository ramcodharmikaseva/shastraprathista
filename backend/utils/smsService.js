// utils/smsService.js
const twilio = require('twilio');

// For now, we'll simulate SMS - you can integrate Twilio later
exports.sendOTPSMS = async (phone, otp, type = 'signup') => {
  const message = type === 'signup' ? 
    `Your Shastraprathista verification OTP is: ${otp}. It will expire in 10 minutes.` :
    type === 'login' ?
    `Your Shastraprathista login OTP is: ${otp}. It will expire in 10 minutes.` :
    `Your Shastraprathista password reset OTP is: ${otp}. It will expire in 10 minutes.`;

  // Simulate SMS sending (replace with actual SMS service)
  console.log(`📱 SMS to ${phone}: ${message}`);
  return true;
};