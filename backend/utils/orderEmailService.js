const axios = require('axios');

// Admin emails
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'shastraprathista@gmail.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'shastraprathista@gmail.com';

// Brand Configuration
const BRAND_NAME = 'Smt Lingammal Ramaraju Shastraprathista Trust';
const BRAND_TAGLINE = 'Ramco Dharmika Seva';

const BASE_URL = process.env.BASE_URL || "https://shastraprathista.onrender.com";

// Generate tracking number
const generateTrackingNumber = () => {
  const prefix = 'SP';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

// ===============================
// ✅ HELPER: Safe email sending via SendGrid
// ===============================
const sendEmailViaSendGrid = async (to, subject, html) => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ SENDGRID_API_KEY not configured');
      return false;
    }

    const response = await axios({
      method: 'post',
      url: 'https://api.sendgrid.com/v3/mail/send',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        personalizations: [{
          to: [{ email: to }]
        }],
        from: { 
          email: process.env.FROM_EMAIL || 'shastraprathistabooks@gmail.com',
          name: BRAND_NAME
        },
        reply_to: { 
          email: process.env.REPLY_TO_EMAIL || 'shastraprathista@gmail.com'
        },
        subject: subject,
        content: [{
          type: 'text/html',
          value: html
        }]
      }
    });
    
    console.log(`✅ Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ SendGrid error:', error.response?.data || error.message);
    return false;
  }
};

// ===============================
// ✅ HELPER: Brand Header
// ===============================
const getBrandHeader = (isAdmin = false) => {
  return `
    <div style="text-align: center; margin-bottom: 25px; background: ${isAdmin ? '#c62828' : '#2c5aa0'}; padding: 25px; border-radius: 8px; color: white;">
      <div style="text-align: center;">
        <h1 style="margin: 0; font-size: 20px; font-weight: bold; color: white; line-height: 1.3;">
          Smt Lingammal Ramaraju Shastraprathista Trust<br>
        </h1>
        <p style="margin: 10px 0 0; font-style: italic; opacity: 0.9; font-size: 16px; color: #ffd700;">
          ${BRAND_TAGLINE}${isAdmin ? ' - ADMIN NOTIFICATION' : ''}
        </p>
      </div>
      ${isAdmin ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3);">
          <h2 style="margin: 0; font-size: 22px; font-weight: bold;">🆕 New Order Received!</h2>
          <p style="margin: 5px 0 0; font-size: 14px;">Time to prepare this order for shipment</p>
        </div>
      ` : ''}
    </div>
  `;
};

// ===============================
// ✅ ORDER CONFIRMATION EMAIL
// ===============================
exports.sendOrderConfirmationEmail = async (order) => {
  try {
    console.log(`📧 Sending order confirmation for: ${order.orderId}`);
    
    if (!order.customerEmail) {
      console.error('❌ No customer email provided');
      return false;
    }

    const orderLink = `${BASE_URL}/order-details.html?orderId=${order.orderId}`;
    
    const orderDate = order.createdAt 
      ? new Date(order.createdAt).toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : new Date().toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });

    const subject = `✅ Order Confirmed - #${order.orderId} | Shastraprathista Trust`;
    
    const totalItems = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .order-info { background: #e8f4ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .item-card { background: white; padding: 10px; margin: 8px 0; border-radius: 5px; border-left: 3px solid #2c5aa0; }
            .totals-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e0e0e0; }
            .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            ${getBrandHeader()}
            
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 24px; color: #2c5aa0;">🎉 Thank You for Your Order!</h1>
                <p style="margin: 10px 0 0; font-size: 14px; color: #666;">Your order has been confirmed</p>
            </div>
            
            <div class="order-info">
                <h2 style="color: #2c5aa0; margin-bottom: 10px; font-size: 18px;">Order Details</h2>
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>Order Date:</strong> ${orderDate}</p>
                <p><strong>Payment Status:</strong> <span style="color: #28a745;">${order.paymentStatus || 'Paid'}</span></p>
                <p><strong>Total Items:</strong> ${totalItems}</p>
            </div>

            <h2 style="color: #2c5aa0; margin-bottom: 10px; font-size: 18px;">Your Items</h2>
            ${order.items.map(item => `
                <div class="item-card">
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <h3 style="margin: 0 0 5px; color: #2c5aa0; font-size: 16px;">${item.title}</h3>
                            <p style="margin: 3px 0; color: #666; font-size: 14px;">by ${item.author}</p>
                            <p style="margin: 3px 0; color: #666; font-size: 14px;">Quantity: ${item.quantity}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 16px; font-weight: bold; color: #2c5aa0;">₹${(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            `).join('')}

            <div class="totals-box">
                <h2 style="color: #2c5aa0; margin-bottom: 10px; font-size: 18px;">Order Summary</h2>
                <div style="display: grid; gap: 8px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Subtotal:</span>
                        <span>₹${order.totals?.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    ${order.totals?.discount && order.totals.discount > 0 ? `
                    <div style="display: flex; justify-content: space-between; color: #28a745;">
                        <span>Discount:</span>
                        <span>-₹${order.totals.discount.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between;">
                        <span>Shipping:</span>
                        <span>₹${order.totals?.shipping?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #2c5aa0; border-top: 1px solid #ddd; padding-top: 10px;">
                        <span>Total Amount:</span>
                        <span>₹${order.totals?.total?.toFixed(2) || '0.00'}</span>
                    </div>
                </div>
            </div>

            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #ffeaa7;">
                <h3 style="color: #856404; margin-bottom: 10px;">What's Next?</h3>
                <p>📦 We're preparing your order for shipment</p>
                <p>📬 You'll receive shipping confirmation soon</p>
                <p>⏰ Expected processing: 1-2 business days</p>
            </div>

            <div style="text-align:center; margin:20px 0;">
              <a href="${orderLink}"
                style="background:#2c5aa0;color:white;padding:12px 25px;
                        text-decoration:none;border-radius:6px;display:inline-block;">
                🔍 View Your Order Details
              </a>
            </div>

            <div class="footer">
                <p>Need help? Contact: ${SUPPORT_EMAIL}</p>
                <p>© ${new Date().getFullYear()} ${BRAND_NAME}</p>
            </div>
        </div>
    </body>
    </html>
    `;

    return await sendEmailViaSendGrid(order.customerEmail, subject, html);
    
  } catch (error) {
    console.error('❌ Error in sendOrderConfirmationEmail:', error.message);
    return false;
  }
};

// ===============================
// ✅ ORDER SHIPPED EMAIL
// ===============================
exports.sendOrderShippedEmail = async (order, trackingNumber = null) => {
  try {
    console.log(`📧 Sending shipped email for order: ${order.orderId}`);

    const orderLink = `${BASE_URL}/order-details.html?orderId=${order.orderId}`;
    const trackingNum = trackingNumber || generateTrackingNumber();
    const subject = `🚚 Order Shipped - #${order.orderId} | Shastraprathista Trust`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .tracking-box { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
            .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            ${getBrandHeader()}
            
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 22px; color: #28a745;">🚚 Your Order is on the Way!</h1>
                <p style="margin: 5px 0 0; color: #666;">Great news ${order.customerName}!</p>
            </div>
            
            <div class="tracking-box">
                <h2 style="color: #2c5aa0; margin-bottom: 10px;">📦 Tracking Information</h2>
                <p><strong>Tracking Number:</strong></p>
                <p style="font-family: monospace; font-size: 18px; font-weight: bold; color: #2c5aa0; margin: 10px 0;">${trackingNum}</p>
                <p><strong>Shipped On:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
                <p><strong>Estimated Delivery:</strong> 5-7 business days</p>
            </div>

            <div style="margin: 15px 0;">
                <h3 style="color: #2c5aa0; margin-bottom: 10px;">Shipping Address</h3>
                <p><strong>${order.shippingAddress.fullName}</strong></p>
                <p>${order.shippingAddress.addressLine1}</p>
                <p>${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}</p>
                <p>📞 ${order.shippingAddress.phone || order.customerPhone}</p>
            </div>

            <div style="text-align:center; margin:20px 0;">
              <a href="${orderLink}"
                style="background:#2c5aa0;color:white;padding:12px 25px;
                        text-decoration:none;border-radius:6px;display:inline-block;">
                🔍 View Your Order Details
              </a>
            </div>

            <div class="footer">
                <p>Need help? Contact: ${SUPPORT_EMAIL}</p>
                <p>© ${new Date().getFullYear()} ${BRAND_NAME}</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const result = await sendEmailViaSendGrid(order.customerEmail, subject, html);
    return { success: result, trackingNumber: trackingNum };
    
  } catch (error) {
    console.error('❌ Error in sendOrderShippedEmail:', error.message);
    return { success: false, error: error.message };
  }
};

// ===============================
// ✅ ORDER DELIVERED EMAIL
// ===============================
exports.sendOrderDeliveredEmail = async (order) => {
  try {
    console.log(`📧 Sending delivered email for order: ${order.orderId}`);

    const orderLink = `${BASE_URL}/order-details.html?orderId=${order.orderId}`;
    const subject = `✅ Order Delivered - #${order.orderId} | Shastraprathista Trust`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .delivery-box { background: #d4edda; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
            .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            ${getBrandHeader()}
            
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 22px; color: #28a745;">✅ Your Order Has Been Delivered!</h1>
                <p style="margin: 5px 0 0; color: #666;">Enjoy your new books, ${order.customerName}!</p>
            </div>
            
            <div class="delivery-box">
                <h2 style="color: #155724; margin-bottom: 10px;">Delivery Confirmed</h2>
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>Delivered On:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
                <p><strong>Delivered To:</strong> ${order.customerName}</p>
            </div>

            <div style="text-align:center; margin:20px 0;">
              <a href="${orderLink}"
                style="background:#2c5aa0;color:white;padding:12px 25px;
                        text-decoration:none;border-radius:6px;display:inline-block;">
                🔍 View Your Order Details
              </a>
            </div>

            <div class="footer">
                <p>Need help? Contact: ${SUPPORT_EMAIL}</p>
                <p>© ${new Date().getFullYear()} ${BRAND_NAME}</p>
            </div>
        </div>
    </body>
    </html>
    `;

    return await sendEmailViaSendGrid(order.customerEmail, subject, html);
    
  } catch (error) {
    console.error('❌ Error in sendOrderDeliveredEmail:', error.message);
    return false;
  }
};

// ===============================
// ✅ ADMIN ORDER NOTIFICATION
// ===============================
exports.sendAdminOrderNotification = async (order) => {
  try {
    console.log(`📧 Sending admin notification for order: ${order.orderId}`);
    
    const orderLink = `${BASE_URL}/order-details.html?orderId=${order.orderId}`;
    const subject = `🆕 New Order #${order.orderId} - ₹${order.totals?.total?.toFixed(2) || '0.00'}`;
    
    const totalQuantity = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .order-card { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e0e0e0; }
            .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            ${getBrandHeader(true)}
            
            <div class="order-card">
                <h2 style="color: #c62828; margin-bottom: 10px;">Order Summary</h2>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div>
                        <strong style="display: block; color: #666; font-size: 14px;">Order ID</strong>
                        <span style="color: #c62828; font-weight: bold;">${order.orderId}</span>
                    </div>
                    <div>
                        <strong style="display: block; color: #666; font-size: 14px;">Customer</strong>
                        <span>${order.customerName}</span>
                    </div>
                    <div>
                        <strong style="display: block; color: #666; font-size: 14px;">Amount</strong>
                        <span style="font-weight: bold;">₹${order.totals?.total?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div>
                        <strong style="display: block; color: #666; font-size: 14px;">Items</strong>
                        <span>${totalQuantity} items</span>
                    </div>
                    <div>
                        <strong style="display: block; color: #666; font-size: 14px;">Email</strong>
                        <span>${order.customerEmail}</span>
                    </div>
                    <div>
                        <strong style="display: block; color: #666; font-size: 14px;">Phone</strong>
                        <span>${order.customerPhone}</span>
                    </div>
                </div>
            </div>

            <h3 style="color: #c62828; margin-bottom: 10px;">Order Items</h3>
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                ${order.items.map(item => `
                    <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
                        <span>${item.title}</span>
                        <span>Qty: ${item.quantity} × ₹${item.price} = ₹${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>

            <div style="margin: 15px 0;">
                <h3 style="color: #1565c0; margin-bottom: 10px;">Shipping Address</h3>
                <p>${order.shippingAddress.fullName}</p>
                <p>${order.shippingAddress.addressLine1}</p>
                <p>${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}</p>
                <p>Phone: ${order.shippingAddress.phone || order.customerPhone}</p>
            </div>

            <div style="text-align:center; margin:20px 0;">
              <a href="${orderLink}"
                style="background:#2c5aa0;color:white;padding:12px 25px;
                        text-decoration:none;border-radius:6px;display:inline-block;">
                🔍 View Order Details
              </a>
            </div>

            <div class="footer">
                <p>Automated notification from ${BRAND_NAME} System</p>
                <p>Order received: ${new Date(order.createdAt || new Date()).toLocaleString('en-IN')}</p>
            </div>
        </div>
    </body>
    </html>
    `;

    return await sendEmailViaSendGrid(ADMIN_EMAIL, subject, html);
    
  } catch (error) {
    console.error('❌ Error in sendAdminOrderNotification:', error.message);
    return false;
  }
};

exports.generateTrackingNumber = generateTrackingNumber;