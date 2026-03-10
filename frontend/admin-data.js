console.log('📊 Admin data loading...');

// Single API base definition
window.API_BASE = window.API_BASE || window.location.origin + '/api';

// Global admin state
if (!window.adminState) {
  window.adminState = {
    allOrders: [],
    filteredOrders: [],
    allCustomers: [],
    filteredCustomers: [],
    allBooks: [],
    initialized: false
  };
}

let BOOK_CACHE = null;

let tokenValidatedAt = 0;
const TOKEN_CACHE_TIME = 30 * 1000; // 30 seconds

function clearBookCache() {
  BOOK_CACHE = null;
}

async function getBooksCache() {
  if (BOOK_CACHE) return BOOK_CACHE;

  const res = await makeAuthenticatedRequest(`${API_BASE}/books`);
  const data = await res.json();

  BOOK_CACHE = Array.isArray(data) ? data : [];
  return BOOK_CACHE;
}

async function enrichOrderItems(items) {
  const books = await getBooksCache();

  return items.map(item => {
    const book = books.find(b => b._id === item.bookId);

    return {
      ...item,
      title: book?.title || 'Unknown Book',
      price: book?.price || 0,
      image: book?.image || 'image/no-book.png',
      total: (book?.price || 0) * item.quantity
    };
  });
}

// ✅ Validate and refresh token if needed (SAFE VERSION)
async function validateToken() {
  const now = Date.now();

  // Use cache to avoid decoding token too often
  if (now - tokenValidatedAt < TOKEN_CACHE_TIME) return true;

  const token = localStorage.getItem('token');
  if (!token) {
    redirectToLogin();
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('❌ Invalid token format');
    clearAuthAndRedirect();
    return false;
  }

  let payload;
  try {
    payload = JSON.parse(atob(parts[1]));
  } catch (error) {
    console.error('❌ Failed to decode token payload:', error);
    clearAuthAndRedirect();
    return false;
  }

  if (!payload.exp) {
    console.error('❌ Token missing exp field');
    clearAuthAndRedirect();
    return false;
  }

  // Check expiration
  if (Date.now() >= payload.exp * 1000) {
    console.warn('⚠️ Token expired');
    clearAuthAndRedirect();
    return false;
  }

  tokenValidatedAt = now;
  return true;
}

// ✅ Helper: clear auth and redirect
function clearAuthAndRedirect() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');

  if (typeof showToast === 'function') {
    showToast('Session expired. Please login again.', 'error');
  }

  window.location.href = 'login.html';
}

// ✅ Helper: redirect if missing token
function redirectToLogin() {
  if (typeof showToast === 'function') {
    showToast('Please login to continue.', 'warning');
  }
  window.location.href = 'login.html';
}


// ✅ Enhanced API request function (SAFE & ROBUST)
async function makeAuthenticatedRequest(url, options = {}) {
  // Validate token first
  const isValid = await validateToken();
  if (!isValid) {
    throw new Error('Authentication failed');
  }

  const token = localStorage.getItem('token');

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  } catch (networkError) {
    console.error('❌ Network error:', networkError);
    if (typeof showToast === 'function') {
      showToast('Network error. Please check your connection.', 'error');
    }
    throw new Error('Network error');
  }

  // Handle auth errors
  if (response.status === 401 || response.status === 403) {
    console.warn('⚠️ Unauthorized or forbidden response');

    clearAuthAndRedirect(); // from validateToken helper
    throw new Error('Unauthorized');
  }

  // Handle other errors
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;

    try {
      const errData = await response.json();
      errorMessage = errData.message || errorMessage;
    } catch (_) {
      // ignore JSON parse error
    }

    console.error('❌ API Error:', errorMessage);
    throw new Error(errorMessage);
  }

  return response;
}

// ✅ Test admin API connection (SAFE)
async function testAdminConnection() {
  try {
    console.log('🔧 Testing admin API connection...');

    const response = await makeAuthenticatedRequest(`${API_BASE}/admin/test-debug`);
    const data = await response.json();

    console.log('✅ Admin API test successful:', data);
    return true;

  } catch (error) {
    console.error('❌ Admin API test failed:', error);

    if (typeof showToast === 'function') {
      showToast('Admin API connection failed', 'error');
    }

    return false;
  }
}

// ✅ ENHANCED: Load orders from backend (SAFE & ROBUST)
async function loadOrdersFromBackend() {
  try {
    console.log('🔄 Loading orders from backend...');

    const response = await makeAuthenticatedRequest(`${API_BASE}/admin/orders`);
    const data = await response.json();

    let orders = [];

    if (data?.success && Array.isArray(data.orders)) {
      orders = data.orders;
    } 
    else if (Array.isArray(data)) {
      orders = data;
    } 
    else {
      console.warn('⚠️ Unexpected API response format:', data);
      orders = [];
    }

    console.log(`✅ Orders loaded: ${orders.length}`);

    // ✅ Always normalize state
    window.adminState.allOrders = orders;
    window.adminState.filteredOrders = [...orders];

    // ✅ Clear cache only after successful load
    clearBookCache();

    return orders;

  } catch (error) {
    console.error('❌ Failed to load orders:', error);

    if (typeof showToast === 'function') {
      showToast('Failed to load orders from server', 'error');
    }

    // ✅ Safe fallback (never undefined)
    window.adminState.allOrders = [];
    window.adminState.filteredOrders = [];

    return [];
  }
}

// ✅ ENHANCED: Load customers from backend with dashboard sync
async function loadCustomersFromBackend() {
  try {
    console.log('🔄 Loading customers from backend...');
    
    const response = await makeAuthenticatedRequest(`${API_BASE}/admin/customers`);
    const data = await response.json();
    
    let customers = [];
    if (data.success && Array.isArray(data.customers)) {
      customers = data.customers;
    } else if (Array.isArray(data)) {
      customers = data;
    } else {
      console.warn('Unexpected customers API response format');
      customers = [];
    }

    console.log("✅ Customers loaded:", customers.length);
    
    // ✅ Update global admin state
    window.adminState.allCustomers = customers;
    window.adminState.filteredCustomers = [...customers];

    return customers;

  } catch (err) {
    console.error("❌ Error loading customers:", err);

    // ✅ Reset state safely
    window.adminState.allCustomers = [];
    window.adminState.filteredCustomers = [];

    return [];
  }
}

// ✅ CLEAN & SAFE: Get dashboard statistics from backend
async function getDashboardStats() {
  try {
    console.log('📊 Fetching dashboard stats...');

    // Fetch backend stats ONLY
    const response = await makeAuthenticatedRequest(
      `${API_BASE}/admin/dashboard/stats`
    );

    const data = await response.json();

    if (!data.success || !data.stats) {
      throw new Error('Invalid dashboard stats response');
    }

    // ✅ Normalize + fallback using adminState
    const stats = {
      totalOrders: data.stats.totalOrders ?? window.adminState.allOrders.length,
      totalRevenue: data.stats.totalRevenue ?? 0,
      totalCustomers:
        data.stats.totalCustomers ?? window.adminState.allCustomers.length,
      totalInventory:
        data.stats.totalInventory ?? window.adminState.allBooks.length
    };

    console.log('✅ Dashboard stats ready:', stats);
    return stats;

  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);

    // ✅ Safe fallback so dashboard never breaks
    return {
      totalOrders: window.adminState.allOrders.length,
      totalRevenue: 0,
      totalCustomers: window.adminState.allCustomers.length,
      totalInventory: window.adminState.allBooks.length
    };
  }
}

// ✅ CLEAN & CORRECT: Update Order Status in Backend (DATA ONLY)
async function updateOrderStatusInBackend(orderId, updateData) {
  try {
    console.log('🔄 Updating order status in backend:', { orderId, updateData });

    const response = await makeAuthenticatedRequest(
      `${API_BASE}/admin/orders/${orderId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify(updateData)
      }
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Status update failed');
    }

    // ✅ Invalidate caches only
    clearBookCache();

    console.log('✅ Order status updated successfully in backend');
    return true;

  } catch (error) {
    console.error('❌ Error updating order status in backend:', error);
    return false;
  }
}

// ✅ SINGLE SOURCE FOR DASHBOARD REFRESH (FINAL)
async function refreshDashboardData() {
  try {
    console.log('🔄 Refreshing dashboard data...');
    
    if (typeof showLoading === 'function') {
      showLoading(true);
    }

    await Promise.all([
      loadOrdersFromBackend(),
      loadCustomersFromBackend()
    ]);

    updateDashboardMetrics();

    console.log('✅ Dashboard data refreshed');

  } catch (error) {
    console.error('❌ Dashboard refresh failed:', error);
    showToast?.('Failed to refresh dashboard data', 'error');
  } finally {
    if (typeof showLoading === 'function') {
      showLoading(false);
    }
  }
}

// ✅ Get order details from backend
async function getOrderDetails(orderId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.order) {
      return data.order;
    } else {
      throw new Error('Order not found');
    }
    
  } catch (error) {
    console.error('❌ Error fetching order details from backend:', error);
    throw error;
  }
}

// ✅ Export customers using client-side generation
async function exportCustomers() {
  try {
    showToast('Preparing customers export...', 'info');
    
    const customers = await loadCustomersFromBackend();
    
    if (customers.length === 0) {
      showToast('No customers found to export', 'warning');
      return;
    }
    
    // Generate customers CSV
    const csvContent = generateCustomersCSV(customers);
    downloadCSV(csvContent, `All_Customers_Export.csv`);
    
    showToast(`Customers exported successfully (${customers.length} customers)`, 'success');
    
  } catch (error) {
    console.error('❌ Error exporting customers:', error);

    if (typeof showToast === 'function') {
      showToast('Failed to export customers', 'error');
    }
  }
}

// ✅ Add customers CSV generation function
function generateCustomersCSV(customers) {
  const headers = [
    'Customer ID',
    'Name', 
    'Email',
    'Phone',
    'Total Orders',
    'Total Spent (₹)',
    'Join Date',
    'Last Order Date'
  ];
  
  let csvContent = headers.join(',') + '\n';
  
  customers.forEach(customer => {
    const row = [
      `"${customer._id || customer.id || ''}"`,
      `"${customer.name || ''}"`,
      `"${customer.email || ''}"`,
      `"${customer.phone || 'Not provided'}"`,
      customer.totalOrders || 0,
      (customer.totalSpent || 0).toFixed(2),
      `"${new Date(customer.createdAt || customer.joinDate).toLocaleDateString('en-IN')}"`,
      `"${customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString('en-IN') : 'No orders'}"`
    ];
    
    csvContent += row.join(',') + '\n';
  });
  
  return csvContent;
}

// ✅ Export orders using client-side generation (FIXED)
async function exportOrders() {
  try {
    console.log('📊 Exporting orders using client-side generation...');
    showToast('Preparing orders export...', 'info');
    
    // Load all orders from backend
    const allOrders = await loadOrdersFromBackend();
    
    if (allOrders.length === 0) {
      showToast('No orders found to export', 'warning');
      return;
    }
    
    // Use the same generateOrdersCSV function from admin.js
    const csvContent = generateOrdersCSV(allOrders, 'all', 'all-time', 'all-time');
    
    // Download the CSV using data URL method (not blob)
    downloadCSV(csvContent, `All_Orders_Export.csv`);
    
    showToast(`Orders exported successfully (${allOrders.length} orders)`, 'success');
    
  } catch (error) {
    console.error('❌ Error exporting orders:', error);
    showToast('Failed to export orders', 'error');
    
    // Fallback: Try the original backend export - FIXED VERSION
    console.log('🔄 Trying fallback to backend export...');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/export/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to export orders');
      
      // ✅ FIX: Use response.text() instead of blob() to avoid blob URLs
      const csvText = await response.text();
      
      // Create data URL instead of blob URL
      const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csvText);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      showToast('Orders exported successfully via backend', 'success');
    } catch (fallbackError) {
      console.error('❌ Fallback export also failed:', fallbackError);
      showToast('Both export methods failed', 'error');
    }
  }
}

// ✅ Sync function - just refreshes data from backend
async function refreshAllData() {
  return refreshDashboardData();
}

// ✅ Dynamic jsPDF loader
function loadJSPDFLibrary() {
    return new Promise((resolve, reject) => {
        if (typeof window.jspdf !== "undefined") {
            resolve();
            return;
        }
        
        // Load jsPDF
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            // Load autoTable plugin
            const autoTableScript = document.createElement('script');
            autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
            autoTableScript.onload = resolve;
            autoTableScript.onerror = reject;
            document.head.appendChild(autoTableScript);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ✅ KEEP THE FUNCTION DEFINITION (very useful!)
async function debugOrderStructure() {
    try {
        console.log('🔍 DIAGNOSING ORDER DATA STRUCTURE...');
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/admin/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        let orders = [];

        // Handle different response formats
        if (data.success && Array.isArray(data.orders)) {
            orders = data.orders;
        } else if (Array.isArray(data)) {
            orders = data;
        } else {
            throw new Error('Unexpected API response format');
        }

        if (orders.length === 0) {
            console.log('❌ No orders found in response');
            return;
        }

        const sampleOrder = orders[0];
        
        console.log('=== ORDER STRUCTURE ANALYSIS ===');
        console.log('Total orders:', orders.length);
        console.log('Sample order keys:', Object.keys(sampleOrder));
        console.log('Full sample order:', JSON.stringify(sampleOrder, null, 2));
        
        // Check for customer data
        console.log('=== CUSTOMER DATA CHECK ===');
        if (sampleOrder.customer) {
            console.log('✅ Customer object found:', sampleOrder.customer);
            console.log('Customer object keys:', Object.keys(sampleOrder.customer));
        } else {
            console.log('❌ NO CUSTOMER OBJECT - checking flat structure:');
            console.log('customerName:', sampleOrder.customerName);
            console.log('customerEmail:', sampleOrder.customerEmail); 
            console.log('customerPhone:', sampleOrder.customerPhone);
        }
        
        // Check for shipping data
        console.log('=== SHIPPING DATA CHECK ===');
        if (sampleOrder.shippingAddress) {
            console.log('✅ Shipping address object found:', sampleOrder.shippingAddress);
        } else {
            console.log('❌ NO SHIPPING ADDRESS OBJECT - checking flat structure:');
            console.log('shippingAddress:', sampleOrder.shippingAddress);
            console.log('city:', sampleOrder.city);
            console.log('state:', sampleOrder.state);
            console.log('pincode:', sampleOrder.pincode);
        }
        
        // Check for items
        console.log('=== ITEMS DATA CHECK ===');
        if (sampleOrder.items && Array.isArray(sampleOrder.items)) {
            console.log('✅ Items array found, count:', sampleOrder.items.length);
            console.log('First item:', sampleOrder.items[0]);
        } else {
            console.log('❌ NO ITEMS ARRAY - order has flat book structure:');
            console.log('bookTitle:', sampleOrder.bookTitle);
            console.log('bookCategory:', sampleOrder.bookCategory);
            console.log('quantity:', sampleOrder.quantity);
            console.log('unitPrice:', sampleOrder.unitPrice);
        }
        
        // Check for totals
        console.log('=== TOTALS DATA CHECK ===');
        if (sampleOrder.totals) {
            console.log('✅ Totals object found:', sampleOrder.totals);
        } else {
            console.log('❌ NO TOTALS OBJECT - checking flat structure:');
            console.log('subtotal:', sampleOrder.subtotal);
            console.log('shipping:', sampleOrder.shipping);
            console.log('tax:', sampleOrder.tax);
            console.log('discount:', sampleOrder.discount);
            console.log('total:', sampleOrder.total);
        }

    } catch (error) {
        console.error('❌ Diagnostic error:', error);
    }
}

// ✅ Download Invoice as PDF (EXACT format matching your user invoice)
async function downloadInvoice(orderId) {
    try {
        showLoading(true);
        showToast('Generating invoice PDF...', 'info');
        
        console.log('📄 Starting invoice generation for order:', orderId);
        
        // Get order details from backend
        const order = await getOrderDetails(orderId);
        console.log('✅ Order data loaded for invoice:', order);
        
        // ✅ CORRECTED: Call the fixed function
        await generateExactFormatInvoicePDF(order);
        
    } catch (error) {
        console.error('❌ Error downloading invoice:', error);
        showToast('Failed to generate invoice: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ✅ Generate PDF Invoice EXACTLY like your profile page format WITH DISTRICT
async function generateExactFormatInvoicePDF(order) {
    return new Promise(async (resolve, reject) => {
        try {
            // Load jsPDF library dynamically if not loaded
            if (typeof window.jspdf === "undefined") {
                await loadJSPDFLibrary();
            }

            const { jsPDF } = window.jspdf;
            
            // Check if order data is valid
            if (!order || !order.items) {
                throw new Error("Invalid order data for PDF generation");
            }

            const doc = new jsPDF();

            // Get order info safely
            const billingAddress = order.billingAddress || order.billing || {};
            const shippingAddress = order.shippingAddress || order.shipping || {};
            const totals = order.totals || order.summary || {};

            const orderIdText = order.orderId || order.id || "N/A";
            const orderDate = order.date ? new Date(order.date).toLocaleDateString("en-IN") : "Invalid Date";

            // ===== HEADER =====
            doc.setFillColor(41, 128, 185);
            doc.rect(0, 0, 210, 40, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.text("Smt Lingammal Ramaraju Shastraprathista Trust", 105, 15, {
                align: "center",
            });

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(
                "No.1, Gandhi Kalaimandram, Rajapalayam - 626117, Tamil Nadu",
                105,
                23,
                { align: "center" }
            );
            doc.setFontSize(10);
            doc.text("Email: shastraprathista@gmail.com | Contact: 88704 12345", 105, 30, {
                align: "center",
            });

            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("INVOICE", 105, 40, { align: "center" });

            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");

            // ===== INVOICE DETAILS =====
            let yPosition = 55;
            doc.setFontSize(10);
            doc.text(`Invoice No: ${orderIdText}`, 20, yPosition);
            doc.text(`Order Date: ${orderDate}`, 120, yPosition);
            yPosition += 8;
            doc.text(`Order No: ${orderIdText}`, 20, yPosition);
            doc.text(`Invoice Date: ${new Date().toLocaleDateString("en-IN")}`, 120, yPosition);
            yPosition += 15;

            // ===== ADDRESSES =====
            doc.setFont("helvetica", "bold");
            doc.text("BILL TO:", 20, yPosition);
            doc.setFont("helvetica", "normal");
            
            // ✅ BILL TO ADDRESS WITH DISTRICT
            doc.text(`Name: ${billingAddress.fullName || billingAddress.name || shippingAddress.fullName || shippingAddress.name || "Customer"}`, 20, yPosition + 5);
            doc.text(`Address: ${billingAddress.addressLine1 || billingAddress.address || ""}`, 20, yPosition + 10);
            doc.text(`City: ${billingAddress.city || ""}`, 20, yPosition + 15);
            
            // ✅ ADDED DISTRICT FIELD
            doc.text(`District: ${billingAddress.district || ""}`, 20, yPosition + 20);
            doc.text(`State: ${billingAddress.state || ""} - ${billingAddress.pincode || ""}`, 20, yPosition + 25);
            
            doc.text(`Email: ${order.customerEmail || order.contact?.email || ""}`, 20, yPosition + 30);
            doc.text(`Phone: ${billingAddress.phone || order.customerPhone || ""}`, 20, yPosition + 35);

            doc.setFont("helvetica", "bold");
            doc.text("SHIP TO:", 120, yPosition);
            doc.setFont("helvetica", "normal");
            
            // ✅ SHIP TO ADDRESS WITH DISTRICT
            doc.text(`Name: ${shippingAddress.fullName || shippingAddress.name || billingAddress.fullName || billingAddress.name || "Customer"}`, 120, yPosition + 5);
            doc.text(`Address: ${shippingAddress.addressLine1 || shippingAddress.address || ""}`, 120, yPosition + 10);
            doc.text(`City: ${shippingAddress.city || ""}`, 120, yPosition + 15);
            
            // ✅ ADDED DISTRICT FIELD
            doc.text(`District: ${shippingAddress.district || ""}`, 120, yPosition + 20);
            doc.text(`State: ${shippingAddress.state || ""} - ${shippingAddress.pincode || ""}`, 120, yPosition + 25);
            
            doc.text(`Phone: ${shippingAddress.phone || order.customerPhone || ""}`, 120, yPosition + 35);

            yPosition += 45; // Increased to accommodate extra district line

            // ===== ITEMS TABLE =====
            doc.setDrawColor(200, 200, 200);
            doc.line(20, yPosition, 190, yPosition);
            yPosition += 8;

            doc.setFillColor(240, 240, 240);
            doc.rect(20, yPosition, 170, 8, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text("S.No", 25, yPosition + 6);
            doc.text("Book Title", 40, yPosition + 6);
            doc.text("MRP", 120, yPosition + 6, { align: "right" });
            doc.text("Qty", 135, yPosition + 6, { align: "center" });
            doc.text("Total", 150, yPosition + 6, { align: "right" });
            doc.text("Discount", 170, yPosition + 6, { align: "right" });
            doc.text("Subtotal", 190, yPosition + 6, { align: "right" });

            yPosition += 15;

            // ✅ Compute totals manually (to ensure consistency)
            let originalSubtotal = 0;
            let totalDiscount = 0;
            let netSubtotal = 0;

            order.items.forEach((item, index) => {
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }

                const title = item.title || "Unknown Book";
                const mrp = Number(item.originalPrice ?? item.mrp ?? item.price ?? 0);
                const selling = Number(item.price ?? 0);
                const qty = Number(item.quantity ?? 1);

                const lineOriginal = mrp * qty;
                const lineNet = selling * qty;
                const lineDiscount = Math.max(0, lineOriginal - lineNet);

                originalSubtotal += lineOriginal;
                totalDiscount += lineDiscount;
                netSubtotal += lineNet;

                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.text((index + 1).toString(), 25, yPosition);
                const titleLines = doc.splitTextToSize(title, 60);
                doc.text(titleLines[0], 40, yPosition);
                if (titleLines.length > 1) {
                    yPosition += 4;
                    doc.text(titleLines[1], 40, yPosition);
                }

                doc.text(mrp.toFixed(2), 120, yPosition, { align: "right" });
                doc.text(qty.toString(), 135, yPosition, { align: "center" });
                doc.text(lineOriginal.toFixed(2), 150, yPosition, { align: "right" });
                doc.text(lineDiscount > 0 ? lineDiscount.toFixed(2) : "-", 170, yPosition, {
                    align: "right",
                });
                doc.text(lineNet.toFixed(2), 190, yPosition, { align: "right" });
                yPosition += 8;
            });

            const shipping = Number(totals.shipping ?? 0);
            const finalTotal = Math.round(netSubtotal + shipping);

            // ===== TOTALS =====
            yPosition += 10;
            doc.setDrawColor(200, 200, 200);
            doc.line(120, yPosition, 190, yPosition);
            yPosition += 8;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text("Original Subtotal:", 130, yPosition);
            doc.text(originalSubtotal.toFixed(2), 190, yPosition, { align: "right" });
            yPosition += 6;
            doc.text("Discount:", 130, yPosition);
            doc.text(totalDiscount.toFixed(2), 190, yPosition, { align: "right" });
            yPosition += 6;
            doc.text("Net Subtotal:", 130, yPosition);
            doc.text(netSubtotal.toFixed(2), 190, yPosition, { align: "right" });
            yPosition += 6;

            if (shipping > 0) {
                doc.text("Shipping Charges:", 130, yPosition);
                doc.text(shipping.toFixed(2), 190, yPosition, { align: "right" });
                yPosition += 6;
            }

            doc.setFillColor(41, 128, 185);
            doc.rect(120, yPosition, 70, 8, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.text("Total Amount:", 130, yPosition + 6);
            doc.text(finalTotal.toFixed(0), 190, yPosition + 6, { align: "right" });

            yPosition += 15;

            // ===== AMOUNT IN WORDS =====
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text("Amount in Words:", 20, yPosition);
            doc.setFont("helvetica", "normal");
            const amountInWords = numberToWords(finalTotal);
            const amountLines = doc.splitTextToSize(`${amountInWords}`, 150);
            amountLines.forEach((line, i) => doc.text(line, 20, yPosition + 5 + i * 4));
            yPosition += 15;

            // ===== PAYMENT INFO =====
            doc.setFont("helvetica", "bold");
            doc.text("Payment Information:", 20, yPosition);
            doc.setFont("helvetica", "normal");
            doc.text(`Payment Method: ${order.paymentMethod || "Bank Transfer / UPI"}`, 20, yPosition + 5);
            doc.text(`Payment Status: ${order.paymentStatus || "Pending"}`, 20, yPosition + 10);
            yPosition += 20;

            // ===== FOOTER =====
            doc.setFontSize(8);
            doc.text("Terms & Conditions:", 20, yPosition);
            doc.text("This is a computer-generated invoice; no signature required.", 20, yPosition + 4);
            doc.text(
                "Books HSN - 4901 (GST Exempt as per Indian Law) | Powered by SHASTRAPRATHISTA",
                105,
                285,
                { align: "center" }
            );

            // ✅ SAVE THE PDF
            const fileName = `Invoice_${orderIdText}.pdf`;
            doc.save(fileName);

            showToast("Invoice downloaded successfully!", "success");
            resolve();

        } catch (error) {
            console.error("PDF Generation Error:", error);
            reject(error);
        }
    });
}

// ✅ Helper function to convert numbers to words (Indian numbering system)
function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    function convertToWords(n) {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertToWords(n % 100) : '');
        if (n < 100000) return convertToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convertToWords(n % 1000) : '');
        if (n < 10000000) return convertToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convertToWords(n % 100000) : '');
        return convertToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convertToWords(n % 10000000) : '');
    }
    
    if (num === 0) return 'Zero';
    if (num > 999999999) return 'Number too large';
    
    // Handle decimal part (paise)
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    
    let words = convertToWords(rupees) + ' Rupees';
    if (paise > 0) {
        words += ' and ' + convertToWords(paise) + ' Paise';
    }
    
    return words;
}

// ✅ Add missing generatePDFInvoice function (simple version)
function generatePDFInvoice(order, orderId) {
    console.log('📄 generatePDFInvoice called for:', orderId);
    
    // For now, just use the existing downloadInvoice function
    downloadInvoice(orderId);
}

function filterOrdersByDateRange(orders, startDateStr, endDateStr) {
    if (!orders || !startDateStr || !endDateStr) return [];

    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    return orders.filter(order => {
        const orderDate = new Date(order.createdAt || order.orderDate || order.date);
        if (isNaN(orderDate)) return false;
        return orderDate >= start && orderDate <= end;
    });
}


// Missing generateOrdersCSV function (simplified version)
function generateOrdersCSV(orders, period, startDate, endDate) {
    const headers = [
        'Order ID', 'Customer Name', 'Customer Email', 'Order Date', 
        'Status', 'Payment Status', 'Total Amount', 'Items Count'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    orders.forEach(order => {
        const orderDate = new Date(order.createdAt || order.date).toLocaleDateString('en-IN');
        const itemsCount = order.items ? order.items.length : 1;
        const totalAmount = order.totals?.total || order.total || 0;
        
        const row = [
            `"${order.orderId || order._id || ''}"`,
            `"${order.customerName || ''}"`,
            `"${order.customerEmail || ''}"`,
            `"${orderDate}"`,
            `"${order.status || ''}"`,
            `"${order.paymentStatus || ''}"`,
            totalAmount.toFixed(2),
            itemsCount
        ];
        
        csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
}

// ... your existing admin-data.js code ...

// ✅ DEBUG: Test API endpoints - ADD THIS AT THE END OF admin-data.js
async function debugApiEndpoints(orderId) {
  try {
    const token = localStorage.getItem('token');
    console.log('🔧 Testing API endpoints for order:', orderId);
    
    const testEndpoints = [
      `${API_BASE}/orders/${orderId}/status`,
      `${API_BASE}/admin/orders/${orderId}/status`,
      `${API_BASE}/orders/${orderId}`,
      `${API_BASE}/admin/orders/${orderId}`,
      `${API_BASE}/orders/${orderId}/ship`,
      `${API_BASE}/admin/orders/${orderId}/ship`
    ];
    
    const results = [];
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        results.push({
          endpoint: endpoint,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        console.log(`🔍 ${endpoint}: ${response.status} ${response.statusText}`);
        
      } catch (error) {
        results.push({
          endpoint: endpoint,
          error: error.message,
          ok: false
        });
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
    
    console.log('📊 API Endpoint Test Results:', results);
    return results;
    
  } catch (error) {
    console.error('Debug API error:', error);
    return [];
  }
}

Object.assign(window, {
  validateToken,
  makeAuthenticatedRequest,
  testAdminConnection,
  loadOrdersFromBackend,
  loadCustomersFromBackend,
  updateOrderStatusInBackend,
  getOrderDetails,
  getDashboardStats,
  refreshDashboardData,
  exportCustomers,
  exportOrders,
  refreshAllData,
  debugOrderStructure,
  downloadInvoice,
  generatePDFInvoice,
  filterOrdersByDateRange,
  generateOrdersCSV,
  debugApiEndpoints
});

console.log('✅ Admin data module fully loaded with all dependencies');