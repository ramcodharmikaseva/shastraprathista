const nodemailer = require('nodemailer');

// Clean password (remove spaces)
const getCleanPassword = () => {
  if (process.env.EMAIL_PASS) {
    return process.env.EMAIL_PASS.replace(/\s/g, '');
  }
  return process.env.EMAIL_PASSWORD || '';
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: getCleanPassword()
  }
});

exports.sendOTPEmail = async (email, otp, type = 'signup') => {
  const subject = type === 'signup' ? 'Verify Your Account' : 
                 type === 'login' ? 'Your Login OTP' : 
                 'Reset Your Password';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #2c5aa0; margin: 0;">📚 Shastraprathista Bookstore</h2>
        <p style="color: #666; margin-top: 5px;">Your trusted source for spiritual books</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px; color: #333;">Dear Customer<strong>${subject}</strong> is:</p>
        <h1 style="background: #e7f3ff; padding: 15px; text-align: center; letter-spacing: 5px; font-size: 28px; margin: 0; border-radius: 5px; color: #2c5aa0; border: 2px dashed #2c5aa0;">
          ${otp}
        </h1>
        <p style="margin: 10px 0 0; color: #666; font-size: 14px; text-align: center;">Valid for 10 minutes only</p>
      </div>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          ⚠️ <strong>Security Notice:</strong> Never share this OTP with anyone. Shastraprathista will never ask for your OTP.
        </p>
      </div>
      
      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0; color: #666; font-size: 12px;">
          If you didn't request this, please ignore this email.<br>
          Need help? Contact us at: shastraprathista@gmail.com
        </p>
        <p style="margin: 10px 0 0; color: #999; font-size: 11px;">
          © ${new Date().getFullYear()} Shastraprathista. All rights reserved.
        </p>
      </div>
    </div>
  `;

  try {
    console.log(`📧 Attempting to send ${type} OTP to: ${email}`);
    console.log(`📧 Using email: ${process.env.EMAIL_USER}`);
    
    const info = await transporter.sendMail({
      from: `"Shastraprathista" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: html
    });
    
    console.log(`✅ OTP email sent to ${email}, Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message);
    console.error('Error code:', error.code);
    
    // Log specific error details
    if (error.code === 'EAUTH') {
      console.error('🔑 Authentication failed. Check:');
      console.error('EMAIL_USER:', process.env.EMAIL_USER);
      console.error('EMAIL_PASS present:', !!process.env.EMAIL_PASS);
      console.error('EMAIL_PASSWORD present:', !!process.env.EMAIL_PASSWORD);
      console.error('Clean password length:', getCleanPassword().length);
      
      // Try to create new transporter with more debugging
      try {
        console.log('🔄 Creating new transporter for debugging...');
        const debugTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: getCleanPassword()
          },
          debug: true,
          logger: true
        });
        
        await debugTransporter.verify();
        console.log('✅ Debug transporter verified successfully');
      } catch (debugError) {
        console.error('❌ Debug transporter failed:', debugError.message);
      }
    }
    
    return false;
  }
};