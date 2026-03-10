const OTP = require('../models/OTP');
const crypto = require('crypto');

exports.generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

exports.storeOTP = async (email, phone, otp, type) => {
  console.log(`📝 [storeOTP] Storing OTP:`, {
    email: email,
    phone: phone,
    otp: otp,
    type: type
  });
  
  // Clean data
  const cleanEmail = email ? email.toLowerCase().trim() : null;
  const cleanPhone = phone ? phone.trim() : null;
  const cleanOtp = otp.toString().trim();
  
  // Remove any existing OTPs for this email/phone and type
  const deleteQuery = {};
  if (cleanEmail) deleteQuery.email = cleanEmail;
  if (cleanPhone) deleteQuery.phone = cleanPhone;
  deleteQuery.type = type;
  
  console.log(`📝 [storeOTP] Deleting existing OTPs with query:`, deleteQuery);
  await OTP.deleteMany(deleteQuery);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  const otpRecord = await OTP.create({
    email: cleanEmail,
    phone: cleanPhone,
    otp: cleanOtp,
    type: type,
    expiresAt: expiresAt
  });
  
  console.log(`✅ [storeOTP] OTP stored successfully:`, {
    id: otpRecord._id,
    email: otpRecord.email,
    otp: otpRecord.otp,
    type: otpRecord.type,
    expiresAt: otpRecord.expiresAt
  });
  
  return otpRecord;
};

exports.verifyOTP = async (email, phone, otp, type) => {
  console.log(`🔍 [verifyOTP] Starting verification for:`, {
    email: email,
    phone: phone,
    otp: otp,
    type: type
  });
  
  // Build query
  const query = { type: type, otp: otp.toString().trim() };
  
  // Add email or phone to query
  if (email) {
    query.email = email.toLowerCase().trim();
    console.log(`🔍 [verifyOTP] Searching by email: ${query.email}`);
  }
  if (phone) {
    query.phone = phone.trim();
    console.log(`🔍 [verifyOTP] Searching by phone: ${query.phone}`);
  }
  
  console.log(`🔍 [verifyOTP] Final query:`, JSON.stringify(query));
  
  // Find the OTP
  const otpRecord = await OTP.findOne(query);
  
  if (!otpRecord) {
    console.log(`❌ [verifyOTP] OTP record NOT FOUND with query:`, query);
    
    // Debug: Show what's actually in the database
    const allRecords = await OTP.find({ 
      email: email ? email.toLowerCase().trim() : undefined,
      type: type 
    });
    console.log(`🔍 [verifyOTP] All OTPs in database for this email/type:`, allRecords);
    
    return { success: false, message: 'Invalid OTP' };
  }
  
  console.log(`✅ [verifyOTP] OTP record FOUND:`, {
    id: otpRecord._id,
    email: otpRecord.email,
    phone: otpRecord.phone,
    otp: otpRecord.otp,
    type: otpRecord.type,
    expiresAt: otpRecord.expiresAt,
    createdAt: otpRecord.createdAt
  });

  // Check if OTP is expired
  const now = new Date();
  const expiresAt = new Date(otpRecord.expiresAt);
  
  if (now > expiresAt) {
    console.log(`❌ [verifyOTP] OTP EXPIRED:`, {
      now: now,
      expiresAt: expiresAt,
      differenceMinutes: (now - expiresAt) / (1000 * 60)
    });
    await OTP.deleteOne({ _id: otpRecord._id });
    return { success: false, message: 'OTP has expired' };
  }
  
  console.log(`✅ [verifyOTP] OTP is VALID, deleting from database...`);
  
  // Delete the OTP after successful verification
  await OTP.deleteOne({ _id: otpRecord._id });
  
  return { 
    success: true, 
    message: 'OTP verified successfully',
    otpRecord: otpRecord
  };
};