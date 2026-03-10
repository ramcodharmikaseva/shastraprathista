const axios = require('axios');

// Add this at the VERY TOP of the file
console.log('🔥🔥🔥 LOADING NEW SENDGRID EMAIL SERVICE 🔥🔥🔥');
console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);

// Send email using SendGrid API (works on Render)
exports.sendOTPEmail = async (email, otp, type = 'signup') => {
  const subject = type === 'signup' ? 'Verify Your Account' : 
                 type === 'login' ? 'Your Login OTP' : 
                 'Reset Your Password';
  
  // Get current year for copyright
  const currentYear = new Date().getFullYear();
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #2c5aa0; margin: 0;">🎵 Sri P.A.C. Ramasamy Raja Memorial Music School</h2>
        <p style="color: #666; margin-top: 5px;">Shastraprathista Bookstore & Music School</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px; color: #333;">Your OTP for <strong>${subject}</strong> is:</p>
        <h1 style="background: #e7f3ff; padding: 15px; text-align: center; letter-spacing: 5px; font-size: 28px; margin: 0; border-radius: 5px; color: #2c5aa0; border: 2px dashed #2c5aa0;">
          ${otp}
        </h1>
        <p style="margin: 10px 0 0; color: #666; font-size: 14px; text-align: center;">Valid for 10 minutes only</p>
      </div>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          ⚠️ <strong>Security Notice:</strong> Never share this OTP with anyone. We will never ask for your OTP.
        </p>
      </div>
      
      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0; color: #666; font-size: 12px;">
          If you didn't request this, please ignore this email.<br>
          Need help? Contact us at: ${process.env.SUPPORT_EMAIL || 'shastraprathista@gmail.com'}
        </p>
        <p style="margin: 10px 0 0; color: #999; font-size: 11px;">
          No.1 PACR Road, Rajapalayam - 626117<br>
          © ${currentYear} Shastraprathista. All rights reserved.
        </p>
      </div>
    </div>
  `;

  // Plain text version for email clients that don't support HTML
  const text = `
    ${subject}
    
    Your OTP is: ${otp}
    
    Valid for 10 minutes only.
    
    Security Notice: Never share this OTP with anyone.
    
    Need help? Contact us at: ${process.env.SUPPORT_EMAIL || 'shastraprathista@gmail.com'}
    
    No.1 PACR Road, Rajapalayam - 626117
  `;

  try {
    console.log(`📧 Attempting to send ${type} OTP to: ${email}`);
    console.log(`📧 Using SendGrid from: ${process.env.FROM_EMAIL || 'shastraprathistabooks@gmail.com'}`);
    
    // Check if SendGrid API key is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ SENDGRID_API_KEY not found in environment variables');
      console.log('📝 OTP for debugging:', otp); // Log OTP for testing
      return false;
    }

    // Send via SendGrid API
    const response = await axios({
      method: 'post',
      url: 'https://api.sendgrid.com/v3/mail/send',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        personalizations: [{
          to: [{ email: email }]
        }],
        from: { 
          email: process.env.FROM_EMAIL || 'shastraprathistabooks@gmail.com',
          name: 'Sri P.A.C. Ramasamy Raja Memorial Music School'
        },
        reply_to: { 
          email: process.env.REPLY_TO_EMAIL || 'shastraprathista@gmail.com',
          name: 'Customer Support'
        },
        subject: subject,
        content: [
          {
            type: 'text/plain',
            value: text
          },
          {
            type: 'text/html',
            value: html
          }
        ]
      }
    });
    
    console.log(`✅ OTP email sent successfully to ${email}`);
    console.log(`📧 SendGrid Response: ${response.status}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error sending OTP email via SendGrid:');
    
    // Detailed error logging
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('SendGrid API Error Response:');
      console.error('- Status:', error.response.status);
      console.error('- Data:', JSON.stringify(error.response.data, null, 2));
      
      // Specific error handling
      if (error.response.status === 401) {
        console.error('🔑 Authentication failed: Invalid API key');
        console.error('Please check your SENDGRID_API_KEY in Render environment variables');
      } else if (error.response.status === 403) {
        console.error('🚫 Forbidden: Check if sender is verified');
        console.error('Your sender email must be verified in SendGrid');
      } else if (error.response.status === 429) {
        console.error('⏰ Rate limit exceeded: Too many emails');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from SendGrid API');
      console.error('Request details:', error.request._currentUrl);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
    
    // Log OTP for debugging (since email failed)
    console.log('📝 OTP for manual use:', otp);
    console.log('📝 You can use this OTP directly from the logs');
    
    return false;
  }
};

// Add this to your emailService.js if not already there
exports.testSendGridConnection = async () => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      return { success: false, error: 'SENDGRID_API_KEY not configured' };
    }
    
    const response = await axios({
      method: 'get',
      url: 'https://api.sendgrid.com/v3/scopes',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`
      },
      timeout: 10000 // 10 second timeout
    });
    
    return { success: true, scopes: response.data.scopes };
  } catch (error) {
    console.error('SendGrid test error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.errors?.[0]?.message || error.message,
      status: error.response?.status
    };
  }
};