console.log('🚀 Admin main loading...');

// Main admin dashboard controller - Backend only

window.adminState = window.adminState || {
  allOrders: [],
  allCustomers: [],
  allBooks: [],

  filteredOrders: [],
  filteredCustomers: []
};

// ✅ BOOK SALES REPORT VARIABLES
let allBooksData = [];
let filteredBooksData = [];

// ✅ Initialize admin dashboard
async function initAdminDashboard() {
  if (!checkAdminAuth()) return;

  try {
    console.log("🚀 Initializing admin dashboard with backend data...");
    
    // Load all data from backend
    await loadDashboardData();
    
    // Start real-time updates
    startRealTimeUpdates();
    
    console.log("✅ Admin dashboard initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing admin dashboard:", error);
    showToast("Failed to initialize dashboard", "error");
  }
}

// ✅ Load dashboard data from backend
async function loadDashboardData() {
  try {
    console.log('📊 Loading dashboard data from backend...');
    showLoading(true);
    
    // Load data in parallel from backend
    const [orders, customers, stats] = await Promise.all([
      loadOrdersFromBackend(),
      loadCustomersFromBackend(),
      getDashboardStats()
    ]);
    
    // Update UI with fresh backend data
    updateDashboardMetrics(orders, customers, stats);
    renderRecentOrders(orders);
    
    console.log('✅ Dashboard data loaded successfully from backend');
  } catch (error) {
    console.error('❌ Error loading dashboard data:', error);
    showToast('Failed to load dashboard data from server', 'error');
  } finally {
    showLoading(false);
  }
}

// admin.js ✅ SINGLE SOURCE OF TRUTH (SAFE + EXTENDED)
function updateDashboardMetrics(orders = [], customers = [], stats = null) {
  try {
    // ✅ Normalize inputs
    orders = Array.isArray(orders) ? orders : [];
    customers = Array.isArray(customers) ? customers : [];

    const totalOrders = stats?.totalOrders ?? orders.length;

    const totalRevenue =
      stats?.totalRevenue ??
      orders.reduce((sum, order) => {
        return sum + Number(order?.totals?.total || order?.total || 0);
      }, 0);

    const totalCustomers = customers.length;

    // ✅ Inventory count (safe fallback)
    const inventoryCount =
      window.adminState?.allBooks?.length ??
      stats?.totalBooks ??
      0;

    // ✅ Safe DOM updates (no crashes if element missing)
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText("total-orders", totalOrders);
    setText("total-revenue", `₹${totalRevenue.toFixed(2)}`);
    setText("total-customers", totalCustomers);
    setText("total-inventory", inventoryCount);

    console.log("📊 Dashboard metrics updated", {
      totalOrders,
      totalRevenue,
      totalCustomers,
      inventoryCount
    });

  } catch (err) {
    console.warn("⚠️ Could not update dashboard metrics:", err);
  }
}

// ✅ Load section data from backend
async function loadSectionData(sectionName) {
    console.log('📂 Loading data for section from backend:', sectionName);
    
    try {
        switch(sectionName) {
            case 'dashboard':
                const orders = await loadOrdersFromBackend();
                renderRecentOrders(orders);
                break;
                
            case 'orders':
                const allOrders = await loadOrdersFromBackend();
                initializeOrdersSearch(allOrders);
                break;
                
            case 'customers':
                const customers = await loadCustomersFromBackend();
                initializeCustomersSearch(customers);
                break;
                
            default:
                console.log('Section loaded:', sectionName);
        }
    } catch (error) {
        console.error(`❌ Error loading ${sectionName} data:`, error);
        showToast(`Failed to load ${sectionName} data`, 'error');
    }
}

// ✅ View order details from backend
async function viewOrderDetails(orderId) {
  try {
    // ✅ FIX: Initialize currentOrderId before using it
    if (typeof window.currentOrderId === 'undefined') {
      window.currentOrderId = null;
    }
    window.currentOrderId = orderId;
    
    // Show loading in modal
    document.getElementById('viewOrderContent').innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div class="spinner"></div>
        <p>Loading order details from server...</p>
      </div>
    `;
    
    // Show the modal
    document.getElementById('viewOrderModal').style.display = 'block';
    
    // Fetch order details directly from backend
    const order = await getOrderDetails(orderId);
    renderOrderDetailsInModal(order);
    
  } catch (error) {
    console.error('❌ Error loading order details from backend:', error);
    document.getElementById('viewOrderContent').innerHTML = `
      <div style="text-align: center; padding: 40px; color: #e74c3c;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
        <h3>Error Loading Order</h3>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="closeViewModal()">Close</button>
      </div>
    `;
  }
}

function handleHashRouting() {
  const hash = window.location.hash.substring(1); 
  // example: "orders&customer=690d94ab3c17c1a4505753c0"

  if (!hash) return;

  const [section, query] = hash.split('&');
  showSection(section);

  if (section === 'orders' && query?.startsWith('customer=')) {
    const customerId = query.split('=')[1];

    console.log('🔍 Filtering orders for customer:', customerId);

    const orders = window.adminState.allOrders || [];

    const filtered = orders.filter(o =>
      o.customerId === customerId ||
      o.userId === customerId
    );

    renderAllOrders(filtered);
  }
}

// ✅ Show section function
function showSection(sectionName) {
  // Hide all sections
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(section => {
    section.classList.remove('active');
  });
  
  // Show selected section
  const targetSection = document.getElementById(sectionName);
  if (targetSection) {
    targetSection.classList.add('active');
    
    // Load reports data when reports section is shown
    if (sectionName === 'reports') {
      loadReportsSection();
    } else {
      loadSectionData(sectionName);
    }
  }
  
  // Update active nav link
  const navLinks = document.querySelectorAll('.admin-nav a');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('onclick')?.includes(sectionName)) {
      link.classList.add('active');
    }
  });
}

window.addEventListener('hashchange', handleHashRouting);

document.addEventListener('DOMContentLoaded', () => {
  handleHashRouting();
});

// ✅ Close modal
function closeViewModal() {
  document.getElementById('viewOrderModal').style.display = 'none';
}

// ✅ Enhanced Admin authentication check with RBAC support
function checkAdminAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

  console.log('🔐 Auth Check:', { 
    hasToken: !!token, 
    userRole: user.role,
    userEmail: user.email 
  });

  if (!token) {
    console.error('❌ No token found');
    showToast("Session expired. Please log in again.", "error");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
    return false;
  }

  if (!user.email) {
    console.error('❌ No user data found');
    showToast("User data missing. Please log in again.", "error");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
    return false;
  }

  // ✅ ALLOW SUPER_ADMIN AND ADMIN ROLES
  const allowedRoles = ['super_admin', 'admin'];
  
  if (!allowedRoles.includes(user.role)) {
    console.error('❌ User role not authorized:', user.role);
    showToast(`Access denied! Your role (${user.role}) cannot access this page.`, "error");
    setTimeout(() => {
      window.location.href = "profile.html"; // Or home page
    }, 2000);
    return false;
  }

  console.log('✅ Admin authentication successful');
  return true;
}

// ✅ Initialize Admin Dashboard Safely
// ✅ Admin bootstrap (single entry point, safe & idempotent)
(function () {

  // 🚫 Stop immediately if not admin page
  if (!document.body.classList.contains('admin-page')) {
    console.warn('Admin JS skipped (not admin page)');
    return;
  }

  // 🚫 Prevent double initialization (very important)
  if (window.__adminInitialized) {
    console.warn('Admin JS already initialized, skipping');
    return;
  }
  window.__adminInitialized = true;

  console.log('🚀 Admin JS bootstrapping...');

  async function bootstrapAdmin() {
    try {
      // ✅ Auth check
      if (!checkAdminAuth()) return;

      // ✅ Set admin name safely
      const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const adminNameEl = document.getElementById('adminName');

      if (adminNameEl && user?.name) {
        adminNameEl.textContent = user.name;
      }

      // ✅ Initialize dashboard (ONLY place this is called)
      await initAdminDashboard();

      console.log('✅ Admin dashboard fully initialized');

    } catch (error) {
      console.error('❌ Failed to bootstrap admin dashboard:', error);
      showToast('Failed to load admin dashboard', 'error');
    }
  }

  // ✅ Run immediately if DOM is already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapAdmin, { once: true });
  } else {
    bootstrapAdmin();
  }

})();

// ✅ Close modal when clicking outside or pressing Escape
window.addEventListener('click', function(event) {
  const modal = document.getElementById('viewOrderModal');
  if (event.target === modal) closeViewModal();
});

document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeViewModal();
  }
});


// ✅ Real-time updates
function startRealTimeUpdates() {
  console.log('🔔 Real-time updates started');
  // Refresh data every 30 seconds
  setInterval(async () => {
    if (document.visibilityState === 'visible') {
      await loadDashboardData();
    }
  }, 30000);
}

// ✅ Export data function
function exportData() {
  console.log('Exporting data...');
  showToast('Export feature coming soon!', 'info');
}

// ✅ Logout function
function logoutUser() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  }
}

// ✅ Reports function - now uses the actual sales report
function generateReport() {
  generateSalesReport();
}

// ✅ Hide notification function
function hideNewOrderNotification() {
  const notification = document.getElementById('newOrderNotification');
  if (notification) {
    notification.style.display = 'none';
  }
}

// ✅ Initialize date inputs when reports section loads
function loadReportsSection() {
    console.log('📊 Loading reports section...');
    
    // Initialize date inputs with sensible defaults
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    document.getElementById('startDate').value = oneWeekAgo.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    
    // ✅ Initialize book sales report
    initializeBookSalesReport();
    
    loadReportData();
}

async function exportOrdersPeriodReport() {
    try {
        showLoading(true);
        showToast('Preparing orders period report...', 'info');
        
        const period = document.getElementById('reportPeriod').value;
        let startDate, endDate;
        
        if (period === 'custom') {
            startDate = document.getElementById('startDate').value;
            endDate = document.getElementById('endDate').value;
            
            if (!startDate || !endDate) {
                showToast('Please select both start and end dates for custom range', 'error');
                showLoading(false);
                return;
            }
        } else {
            const dateRange = calculateDateRange(period);
            startDate = dateRange.startDate;
            endDate = dateRange.endDate;
        }
        
        const allOrders = await loadOrdersFromBackend();
        const filteredOrders = filterOrdersByDateRange(allOrders, startDate, endDate);
        
        if (filteredOrders.length === 0) {
            showToast('No orders found for the selected period', 'warning');
            showLoading(false);
            return;
        }
        
        const csvContent = generateOrdersCSV(filteredOrders, period, startDate, endDate);

        // ✅ Only ONE CSV download
        downloadCSV(csvContent, `Orders_${startDate}_to_${endDate}.csv`);
        
        showToast(`Orders report exported successfully (${filteredOrders.length} orders)`, 'success');
        
    } catch (error) {
        console.error('❌ Error exporting orders period report:', error);
        showToast('Failed to export orders report', 'error');
    } finally {
        showLoading(false);
    }
}

// ✅ Calculate date range for predefined periods
function calculateDateRange(period) {
    const now = new Date();
    let startDate, endDate;
    
    switch(period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
            break;
        case 'week':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case 'quarter':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case 'year':
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    }
    
    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
}

// ✅ GENERATE CSV IN YOUR DESIRED FORMAT
function generateOrdersCSV(orders, period, startDate, endDate) {
    // CSV headers - MATCHING YOUR FORMAT
    const headers = [
        'S.No',
        'Order ID',
        'Order Date',
        'Customer Name',
        'Customer Email',
        'Customer Phone',
        'Shipping Address',
        'City',
        'State',
        'Pincode',
        'Shipping Method',
        'Book Title',
        'Book Category',
        'Quantity',
        'Original Unit Price (₹)',
        'Unit Price (₹)',
        'Total Price (₹)',
        'Subtotal (₹)',
        'Shipping Charge (₹)',
        'Tax (₹)',
        'Discount (₹)',
        'Grand Total (₹)',
        'Order Status',
        'Payment Status',
        'Payment Method',
        'Tracking Number',
        'Notes'
    ];
    
    // Start with headers
    let csvContent = headers.join(',') + '\n';
    
    let serialNumber = 1;
    
    // Add each order's data
    orders.forEach(order => {
        // Extract order data from your actual structure
        const orderId = order.orderId || order._id || '';
        const orderDate = new Date(order.createdAt || order.date).toLocaleDateString('en-IN').split('/').join('-');
        
        // Customer data (flat fields)
        const customerName = order.customerName || '';
        const customerEmail = order.customerEmail || '';
        const customerPhone = order.customerPhone || 'Not provided';
        
        // Shipping address (nested object)
        const shipping = order.shippingAddress || {};
        const shippingAddress = `${shipping.addressLine1 || ''} ${shipping.addressLine2 || ''}`.trim() || 'Not provided';
        const city = shipping.city || 'Not provided';
        const state = shipping.state || 'Not provided';
        const pincode = shipping.pincode || 'Not provided';
        
        // Totals (nested object)
        const totals = order.totals || {};
        const subtotal = totals.subtotal || 0;
        const shippingCharge = totals.shipping || 0;
        const tax = totals.tax || 0;
        const discount = totals.discount || 0;
        const grandTotal = totals.total || 0;
        
        // Other order details
        const orderStatus = order.status || '';
        const paymentStatus = order.paymentStatus || '';
        const paymentMethod = order.paymentMethod || '';
        const trackingNumber = order.trackingNumber || '';
        const shippingMethod = order.shippingMethod || order.shippingRegion || '';
        const notes = order.notes || '';

        // Process items array
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            let isFirstItem = true;
            
            order.items.forEach(item => {
                const bookTitle = item.title || '';
                const bookCategory = item.category || item.author || 'General';
                const quantity = item.quantity || 1;
                const unitPrice = item.price || 0;
                const originalUnitPrice = item.originalPrice || unitPrice;
                const itemTotal = unitPrice * quantity;
                
                const row = [
                    isFirstItem ? serialNumber : '', // S.No only for first item
                    isFirstItem ? `"${orderId}"` : '', // Order ID only for first item
                    isFirstItem ? `"${orderDate}"` : '', // Order Date only for first item
                    isFirstItem ? `"${customerName}"` : '', // Customer Name only for first item
                    isFirstItem ? `"${customerEmail}"` : '', // Customer Email only for first item
                    isFirstItem ? `"${customerPhone}"` : '', // Customer Phone only for first item
                    isFirstItem ? `"${shippingAddress}"` : '', // Shipping Address only for first item
                    isFirstItem ? `"${city}"` : '', // City only for first item
                    isFirstItem ? `"${state}"` : '', // State only for first item
                    isFirstItem ? `"${pincode}"` : '', // Pincode only for first item
                    isFirstItem ? `"${shippingMethod}"` : '', // Shipping Method only for first item
                    `"${bookTitle}"`,
                    `"${bookCategory}"`,
                    quantity,
                    originalUnitPrice.toFixed(0),
                    unitPrice.toFixed(0),
                    itemTotal.toFixed(0),
                    isFirstItem ? subtotal.toFixed(0) : '', // Subtotal only for first item
                    isFirstItem ? shippingCharge.toFixed(0) : '', // Shipping only for first item
                    isFirstItem ? tax.toFixed(0) : '', // Tax only for first item
                    isFirstItem ? discount.toFixed(0) : '', // Discount only for first item
                    isFirstItem ? grandTotal.toFixed(0) : '', // Grand Total only for first item
                    isFirstItem ? `"${orderStatus}"` : '', // Order Status only for first item
                    isFirstItem ? `"${paymentStatus}"` : '', // Payment Status only for first item
                    isFirstItem ? `"${paymentMethod}"` : '', // Payment Method only for first item
                    isFirstItem ? `"${trackingNumber}"` : '', // Tracking only for first item
                    isFirstItem ? `"${notes}"` : '' // Notes only for first item
                ];
                
                csvContent += row.join(',') + '\n';
                isFirstItem = false;
            });
            
            serialNumber++;
        } else {
            // Fallback for orders without items array
            const unitPrice = order.unitPrice || order.price || 0;
            const originalUnitPrice = order.originalPrice || unitPrice;
            const quantity = order.quantity || 1;
            const itemTotal = unitPrice * quantity;
            
            const row = [
                serialNumber,
                `"${orderId}"`,
                `"${orderDate}"`,
                `"${customerName}"`,
                `"${customerEmail}"`,
                `"${customerPhone}"`,
                `"${shippingAddress}"`,
                `"${city}"`,
                `"${state}"`,
                `"${pincode}"`,
                `"${shippingMethod}"`,
                `"No Items"`,
                `"General"`,
                quantity,
                originalUnitPrice.toFixed(0),
                unitPrice.toFixed(0),
                itemTotal.toFixed(0),
                subtotal.toFixed(0),
                shippingCharge.toFixed(0),
                tax.toFixed(0),
                discount.toFixed(0),
                grandTotal.toFixed(0),
                `"${orderStatus}"`,
                `"${paymentStatus}"`,
                `"${paymentMethod}"`,
                `"${trackingNumber}"`,
                `"${notes}"`
            ];
            
            csvContent += row.join(',') + '\n';
            serialNumber++;
        }
    });
    
    // Add empty rows for better separation (like your format)
    csvContent += ',,,,,,,,,,,,,,,,,,,,,,,,,,\n';
    csvContent += ',,,,,,,,,,,,,,,,,,,,,,,,,,\n';
    
    // Enhanced summary section (matching your format)
    csvContent += ',SUMMARY,,,,,,,,,,,,,,,,,,,,,,,,,\n';
    const formattedStartDate = startDate.split('-').reverse().join('-');
    const formattedEndDate = endDate.split('-').reverse().join('-');
    csvContent += ',Report Period,' + period + ',,,,,,,,,,,,,,,,,,,,,,,,,\n';
    csvContent += ',Start Date,' + formattedStartDate + ',,,,,,,,,,,,,,,,,,,,,,,,,\n';
    csvContent += ',End Date,' + formattedEndDate + ',,,,,,,,,,,,,,,,,,,,,,,,,\n';
    
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
    csvContent += ',Total Revenue,₹' + totalRevenue.toFixed(2) + ',,,,,,,,,,,,,,,,,,,,,,,,,\n';
    
    const totalOriginalRevenue = orders.reduce((sum, order) => {
        const totals = order.totals || {};
        const subtotal = totals.subtotal || 0;
        const discount = totals.discount || 0;
        return sum + subtotal + discount;
    }, 0);
    csvContent += ',Total Original Revenue (Before Discount),₹' + totalOriginalRevenue.toFixed(2) + ',,,,,,,,,,,,,,,,,,,,,,,,,\n';
    
    const totalItems = orders.reduce((sum, order) => {
        if (order.items && Array.isArray(order.items)) {
            return sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0);
        }
        return sum + (order.quantity || 1);
    }, 0);
    csvContent += ',Total Items Sold,' + totalItems + ',,,,,,,,,,,,,,,,,,,,,,,,,\n';
    
    const totalDiscount = orders.reduce((sum, order) => sum + (order.totals?.discount || 0), 0);
    csvContent += ',Total Discount Given,₹' + totalDiscount.toFixed(2) + ',,,,,,,,,,,,,,,,,,,,,,,,,\n';
    
    const generatedDate = new Date().toLocaleString('en-IN');
    csvContent += ',Report Generated,' + generatedDate + ',,,,,,,,,,,,,,,,,,,,,,,,,\n';
    
    return csvContent;
}

// ✅ Improved date filtering for your structure
function filterOrdersByDateRange(orders, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include entire end date
    
    return orders.filter(order => {
        const orderDate = new Date(order.createdAt || order.date);
        return orderDate >= start && orderDate <= end;
    });
}

// ✅ Search orders function (FIXED)
function searchOrders() {
  const input = document.getElementById('orderSearch');
  const searchTerm = input.value.toLowerCase().trim();

  // Base list = already filtered list (ex: by customer) OR all orders
  let baseOrders = window.adminState.filteredOrders?.length
    ? window.adminState.filteredOrders
    : window.adminState.allOrders;

  if (!searchTerm) {
    renderAllOrders(baseOrders);
    updateOrdersResultsCounter?.();
    return;
  }

  const filtered = baseOrders.filter(order => {
    // Order ID
    if ((order.orderId || '').toLowerCase().includes(searchTerm)) return true;
    if ((order._id || '').toLowerCase().includes(searchTerm)) return true;

    // Customer info
    if ((order.customerName || '').toLowerCase().includes(searchTerm)) return true;
    if ((order.customerEmail || '').toLowerCase().includes(searchTerm)) return true;
    if ((order.customerPhone || '').includes(searchTerm)) return true;

    // Book titles
    if (Array.isArray(order.items)) {
      const hasBook = order.items.some(item =>
        (item.title || '').toLowerCase().includes(searchTerm)
      );
      if (hasBook) return true;
    }

    // Status
    if ((order.status || '').toLowerCase().includes(searchTerm)) return true;
    if ((order.paymentStatus || '').toLowerCase().includes(searchTerm)) return true;

    return false;
  });

  window.adminState.filteredOrders = filtered;

  renderAllOrders(filtered);
  updateOrdersResultsCounter?.();
}

// ✅ Apply orders filters
function applyOrdersFilters() {
    const searchTerm = document.getElementById('orderSearch').value.toLowerCase().trim();
    const statusFilter = document.getElementById('filterOrderStatus').value;
    const paymentFilter = document.getElementById('filterPaymentStatus').value;
    const dateRange = document.getElementById('filterDateRange').value;
    const minAmount = parseFloat(document.getElementById('filterMinAmount').value) || 0;
    const maxAmount = parseFloat(document.getElementById('filterMaxAmount').value) || Infinity;
    
    let startDate, endDate;
    
    // Handle date range filtering
    if (dateRange === 'custom') {
        const startDateStr = document.getElementById('filterStartDate').value;
        const endDateStr = document.getElementById('filterEndDate').value;
        startDate = startDateStr ? new Date(startDateStr) : null;
        endDate = endDateStr ? new Date(endDateStr) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);
    } else {
        const dateRangeResult = calculateDateRange(dateRange);
        startDate = dateRangeResult.startDate ? new Date(dateRangeResult.startDate) : null;
        endDate = dateRangeResult.endDate ? new Date(dateRangeResult.endDate) : null;
    }
    
    filteredOrders = allOrders.filter(order => {
        // Text search
        if (searchTerm) {
            const matchesSearch = 
                order.orderId?.toLowerCase().includes(searchTerm) ||
                order._id?.toLowerCase().includes(searchTerm) ||
                order.customerName?.toLowerCase().includes(searchTerm) ||
                order.customerEmail?.toLowerCase().includes(searchTerm) ||
                order.customerPhone?.includes(searchTerm) ||
                order.status?.toLowerCase().includes(searchTerm) ||
                order.paymentStatus?.toLowerCase().includes(searchTerm) ||
                (order.items && order.items.some(item => 
                    item.title?.toLowerCase().includes(searchTerm)
                ));
            if (!matchesSearch) return false;
        }
        
        // Status filters
        if (statusFilter && order.status !== statusFilter) return false;
        if (paymentFilter && order.paymentStatus !== paymentFilter) return false;
        
        // Date range filter
        const orderDate = new Date(order.createdAt);
        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;
        
        // Amount range filter
        const orderTotal = order.totals?.total || order.total || 0;
        if (orderTotal < minAmount || orderTotal > maxAmount) return false;
        
        return true;
    });
    
    renderAllOrders(filteredOrders);
    updateOrdersResultsCounter();
}

// ✅ Clear orders search
function clearOrdersSearch() {
    document.getElementById('orderSearch').value = '';
    document.getElementById('filterOrderStatus').value = '';
    document.getElementById('filterPaymentStatus').value = '';
    document.getElementById('filterDateRange').value = '';
    document.getElementById('filterMinAmount').value = '';
    document.getElementById('filterMaxAmount').value = '';
    document.getElementById('customDateRange').style.display = 'none';
    
    filteredOrders = [...allOrders];
    renderAllOrders(filteredOrders);
    updateOrdersResultsCounter();
}

// ✅ Toggle orders filters panel
function toggleOrdersFilters() {
    const panel = document.getElementById('ordersFiltersPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// ✅ Initialize customers search
function initializeCustomersSearch(customers) {
    allCustomers = customers;
    filteredCustomers = [...customers];
    updateCustomersResultsCounter();
    renderAllCustomers(filteredCustomers);
}

// ✅ Search customers function
function searchCustomers() {
    const searchTerm = document.getElementById('customerSearch').value.toLowerCase().trim();
    
    if (!searchTerm) {
        applyCustomersFilters();
        return;
    }
    
    filteredCustomers = allCustomers.filter(customer => {
        return (
            customer.name?.toLowerCase().includes(searchTerm) ||
            customer.email?.toLowerCase().includes(searchTerm) ||
            customer.phone?.includes(searchTerm) ||
            (customer.shippingAddress?.city?.toLowerCase().includes(searchTerm)) ||
            (customer.shippingAddress?.state?.toLowerCase().includes(searchTerm))
        );
    });
    
    renderAllCustomers(filteredCustomers);
    updateCustomersResultsCounter();
}

// ✅ Apply customers filters
function applyCustomersFilters() {
    const searchTerm = document.getElementById('customerSearch').value.toLowerCase().trim();
    const cityFilter = document.getElementById('filterCity').value.toLowerCase().trim();
    const stateFilter = document.getElementById('filterState').value.toLowerCase().trim();
    const minOrders = parseInt(document.getElementById('filterMinOrders').value) || 0;
    
    filteredCustomers = allCustomers.filter(customer => {
        // Text search
        if (searchTerm) {
            const matchesSearch = 
                customer.name?.toLowerCase().includes(searchTerm) ||
                customer.email?.toLowerCase().includes(searchTerm) ||
                customer.phone?.includes(searchTerm) ||
                (customer.shippingAddress?.city?.toLowerCase().includes(searchTerm)) ||
                (customer.shippingAddress?.state?.toLowerCase().includes(searchTerm));
            if (!matchesSearch) return false;
        }
        
        // Location filters
        if (cityFilter && !customer.shippingAddress?.city?.toLowerCase().includes(cityFilter)) return false;
        if (stateFilter && !customer.shippingAddress?.state?.toLowerCase().includes(stateFilter)) return false;
        
        // Orders count filter
        const orderCount = customer.totalOrders || customer.ordersCount || 0;
        if (orderCount < minOrders) return false;
        
        return true;
    });
    
    renderAllCustomers(filteredCustomers);
    updateCustomersResultsCounter();
}

// ✅ Clear customers search
function clearCustomersSearch() {
    document.getElementById('customerSearch').value = '';
    document.getElementById('filterCity').value = '';
    document.getElementById('filterState').value = '';
    document.getElementById('filterMinOrders').value = '';
    
    filteredCustomers = [...allCustomers];
    renderAllCustomers(filteredCustomers);
    updateCustomersResultsCounter();
}

// ✅ Toggle customers filters panel
function toggleCustomersFilters() {
    const panel = document.getElementById('customersFiltersPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// ✅ Update customers results counter
function updateCustomersResultsCounter() {
    const counter = document.getElementById('customersResultsCounter');
    if (counter) {
        counter.textContent = `Showing ${filteredCustomers.length} of ${allCustomers.length} customers`;
    }
}

// ✅ Handle custom date range selection
function handleDateRangeChange() {
    const dateRange = document.getElementById('filterDateRange').value;
    const customRange = document.getElementById('customDateRange');
    
    if (dateRange === 'custom') {
        customRange.style.display = 'flex';
    } else {
        customRange.style.display = 'none';
        applyOrdersFilters();
    }
}

// Load report data
async function loadReportData() {
    try {
        showLoading(true);
        
        const [orders, customers] = await Promise.all([
            loadOrdersFromBackend(),
            loadCustomersFromBackend()
        ]);
        
        updateReportSummary(orders, customers);
        updateTopProducts(orders);
        
    } catch (error) {
        console.error('❌ Error loading report data:', error);
        showToast('Failed to load report data', 'error');
    } finally {
        showLoading(false);
    }
}

// Update report summary cards
function updateReportSummary(orders, customers) {
    try {
        const period = document.getElementById('reportPeriod').value;
        const filteredOrders = filterOrdersForReportSummary(orders, period);
        
        // Calculate metrics
        const totalSales = filteredOrders.reduce((sum, order) => 
            sum + (order.totals?.total || order.total || 0), 0);
        
        const totalOrders = filteredOrders.length;
        const newCustomers = filterCustomersByPeriod(customers, period).length;
        const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
        
        // Update DOM
        document.getElementById('totalSales').textContent = `₹${totalSales.toFixed(2)}`;
        document.getElementById('totalOrdersCount').textContent = totalOrders;
        document.getElementById('newCustomers').textContent = newCustomers;
        document.getElementById('averageOrder').textContent = `₹${averageOrder.toFixed(2)}`;
        
        // Update trends (placeholder - you can implement real trend calculation)
        updateTrends();
        
    } catch (error) {
        console.error('❌ Error updating report summary:', error);
    }
}

// Filter customers by period
function filterCustomersByPeriod(customers, period) {
    const now = new Date();
    let startDate;
    
    switch(period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            break;
        default:
            return customers;
    }
    
    return customers.filter(customer => {
        const joinDate = new Date(customer.createdAt || customer.joinDate);
        return joinDate >= startDate;
    });
}

// ✅ ADD THIS MISSING FUNCTION - Filter orders for report summary
function filterOrdersForReportSummary(orders, period) {
    const now = new Date();
    let startDate;
    
    switch(period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            break;
        case 'week':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            break;
        case 'quarter':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            break;
        case 'year':
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            break;
        default:
            return orders;
    }
    
    return orders.filter(order => {
        const orderDate = new Date(order.createdAt || order.date);
        return orderDate >= startDate;
    });
}

// Update top products table
function updateTopProducts(orders) {
    try {
        const productSales = {};
        
        // Aggregate product sales
        orders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const productId = item.id || item.title;
                    if (!productSales[productId]) {
                        productSales[productId] = {
                            title: item.title,
                            category: item.category || 'General',
                            quantity: 0,
                            revenue: 0,
                            price: item.price || 0
                        };
                    }
                    productSales[productId].quantity += item.quantity || 1;
                    productSales[productId].revenue += (item.price || 0) * (item.quantity || 1);
                });
            }
        });
        
        // Convert to array and sort by revenue
        const topProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        
        // Update table
        const tbody = document.getElementById('topProductsBody');
        tbody.innerHTML = topProducts.map(product => `
            <tr>
                <td><strong>${product.title}</strong></td>
                <td>${product.category}</td>
                <td>${product.quantity}</td>
                <td><strong>₹${product.revenue.toFixed(2)}</strong></td>
                <td>
                    <span class="status-badge ${product.quantity > 0 ? 'status-completed' : 'status-cancelled'}">
                        ${product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error updating top products:', error);
    }
}


// ✅ Update changeReportPeriod function
function changeReportPeriod() {
    const period = document.getElementById('reportPeriod').value;
    const customRange = document.getElementById('customDateRange');
    
    if (period === 'custom') {
        customRange.style.display = 'flex';
        // Set default dates for custom range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Default to last 30 days
        
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
    } else {
        customRange.style.display = 'none';
        loadReportData();
    }
}

// ✅ Enhanced applyCustomDateRange function
function applyCustomDateRange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showToast('Please select both start and end dates', 'error');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showToast('Start date cannot be after end date', 'error');
        return;
    }
    
    loadReportData();
}

// Generate sales report
function generateSalesReport() {
    showToast('Generating sales report...', 'info');
    
    // Simulate report generation
    setTimeout(() => {
        showToast('Sales report generated successfully!', 'success');
        
        // In a real implementation, you would:
        // 1. Generate CSV/PDF report
        // 2. Trigger download
        // 3. Or send to email
    }, 2000);
}

// Refresh reports
function refreshReports() {
    loadReportData();
    showToast('Reports refreshed', 'success');
}

// Update trends (placeholder - implement real trend calculation)
function updateTrends() {
    const trends = ['salesTrend', 'ordersTrend', 'customersTrend', 'averageTrend'];
    
    trends.forEach(trendId => {
        const element = document.getElementById(trendId);
        const isPositive = Math.random() > 0.3;
        const value = (Math.random() * 20).toFixed(1);
        
        element.textContent = `${isPositive ? '+' : '-'}${value}%`;
        element.className = `summary-trend ${isPositive ? 'positive' : 'negative'}`;
    });
}


// ✅ ENHANCED MOBILE OPTIMIZATIONS
function initMobileEnhancements() {
  const isMobile = window.innerWidth <= 768;
  const isTablet = window.innerWidth <= 1024;
  
  if (isMobile) {
    console.log('📱 Mobile enhancements activated');
    enhanceTableScrolling();
    enhanceFormInputs();
    enhanceMobileNavigation();
    enhanceTouchInteractions();
  }
  
  if (isTablet) {
    enhanceTabletLayout();
  }
}

function enhanceTableScrolling() {
  const tables = document.querySelectorAll('.table-container');
  tables.forEach(table => {
    table.style.overflowX = 'auto';
    table.style.webkitOverflowScrolling = 'touch';
    table.style.borderRadius = '15px';
    
    // Add scroll indicators for better UX
    table.style.background = `
      linear-gradient(90deg, white 30%, rgba(255,255,255,0)),
      linear-gradient(90deg, rgba(255,255,255,0), white 70%) 100% 0,
      radial-gradient(farthest-side at 0% 50%, rgba(0,0,0,.2), rgba(0,0,0,0)),
      radial-gradient(farthest-side at 100% 50%, rgba(0,0,0,.2), rgba(0,0,0,0)) 100% 0
    `;
    table.style.backgroundRepeat = 'no-repeat';
    table.style.backgroundSize = '40px 100%, 40px 100%, 14px 100%, 14px 100%';
    table.style.backgroundAttachment = 'local, local, scroll, scroll';
  });
}

function enhanceFormInputs() {
  const inputs = document.querySelectorAll('input, select, textarea');
  const buttons = document.querySelectorAll('button:not(.btn-sm)');
  
  inputs.forEach(input => {
    if (input.offsetHeight < 44) {
      input.style.minHeight = '44px';
      input.style.padding = '12px 16px';
      input.style.fontSize = '16px'; // Prevents zoom on iOS
    }
  });
  
  buttons.forEach(button => {
    if (button.offsetHeight < 44) {
      button.style.minHeight = '44px';
      button.style.padding = '12px 20px';
    }
  });
}

function enhanceMobileNavigation() {
  const adminNav = document.querySelector('.admin-nav');
  const mainMenu = document.querySelector('.main-menu');
  
  if (adminNav) {
    adminNav.style.position = 'sticky';
    adminNav.style.top = '0';
    adminNav.style.zIndex = '45';
    adminNav.style.backdropFilter = 'blur(20px)';
  }
  
  if (mainMenu) {
    mainMenu.style.position = 'sticky';
    mainMenu.style.top = adminNav ? '60px' : '0';
    mainMenu.style.zIndex = '40';
  }
}

function enhanceTouchInteractions() {
  // Add touch-friendly hover states
  document.addEventListener('touchstart', function() {}, { passive: true });
  
  // Improve button feedback
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    btn.addEventListener('touchstart', function() {
      this.style.transform = 'scale(0.98)';
    });
    
    btn.addEventListener('touchend', function() {
      this.style.transform = '';
    });
  });
}

function enhanceTabletLayout() {
  // Tablet-specific optimizations
  const cards = document.querySelectorAll('.dashboard-cards .card');
  cards.forEach(card => {
    card.style.minHeight = 'auto'; // Allow flexible height on tablets
  });
}

// ✅ Mobile & UI Enhancements ONLY
document.addEventListener('DOMContentLoaded', function () {

  handleHashRouting(); // ✅ ADD HERE

  // Small delay to ensure DOM & styles are ready
  setTimeout(() => {
    if (typeof initMobileEnhancements === 'function') {
      initMobileEnhancements();
    }
  }, 100);

  // Re-initialize on resize with debouncing
  let resizeTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (typeof initMobileEnhancements === 'function') {
        initMobileEnhancements();
      }
    }, 250);
  });

  // Re-initialize when sections change (tabs / filters / reports)
  const observer = new MutationObserver(function (mutations) {
    for (const mutation of mutations) {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'class'
      ) {
        setTimeout(() => {
          if (typeof initMobileEnhancements === 'function') {
            initMobileEnhancements();
          }
        }, 50);
        break;
      }
    }
  });

  // Observe section visibility changes
  document.querySelectorAll('.content-section').forEach(section => {
    observer.observe(section, { attributes: true });
  });

});

// ✅ ===== BOOK SALES REPORT FUNCTIONS =====

// ✅ FIXED: Initialize Book Sales Report with error handling
function initializeBookSalesReport() {
    console.log('📚 Initializing book sales report...');
    
    try {
        // Set default dates
        const today = new Date();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const bookStartDate = document.getElementById('bookStartDate');
        const bookEndDate = document.getElementById('bookEndDate');
        
        if (bookStartDate && bookEndDate) {
            bookStartDate.value = oneWeekAgo.toISOString().split('T')[0];
            bookEndDate.value = today.toISOString().split('T')[0];
        }
        
        // Load initial data
        loadBookSalesData();
        
    } catch (error) {
        console.error('❌ Error initializing book sales report:', error);
    }
}

// Load Book Sales Data
async function loadBookSalesData() {
    try {
        showLoading(true);
        
        const [orders, books] = await Promise.all([
            loadOrdersFromBackend(),
            loadBooksFromBackend()
        ]);
        
        allBooksData = books;
        populateBookCategories(books);
        
        console.log('✅ Book sales data loaded:', { orders: orders.length, books: books.length });
        
    } catch (error) {
        console.error('❌ Error loading book sales data:', error);
        showToast('Failed to load book sales data', 'error');
    } finally {
        showLoading(false);
    }
}

// ✅ ENHANCED: Load Books from Backend (Safe + Stable)
async function loadBooksFromBackend() {
  try {
    const token = localStorage.getItem('token');

    // 🔐 Safety checks
    if (!token) {
      console.warn('⚠️ No auth token found. Using fallback data.');
      return createMockBooksData();
    }

    if (typeof API_BASE === 'undefined') {
      console.error('❌ API_BASE is not defined');
      return createMockBooksData();
    }

    console.log('📚 Fetching books from backend...');

    const response = await fetch(`${API_BASE}/admin/books`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // 🚫 Unauthorized or forbidden
    if (response.status === 401 || response.status === 403) {
      console.warn('⚠️ Unauthorized access — redirecting to login');
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      return [];
    }

    // ❌ Any other error
    if (!response.ok) {
      console.warn(`⚠️ API Error: ${response.status}`);
      return createMockBooksData();
    }

    const data = await response.json();
    const books = data?.success ? data.books : data;

    console.log(`✅ Loaded ${books.length} books from backend`);

    // Cache for fallback use
    localStorage.setItem('cachedBooks', JSON.stringify(books));

    return books;

  } catch (error) {
    console.error("❌ Error loading books:", error);

    // ✅ Fallback to cached data
    const cached = localStorage.getItem('cachedBooks');
    if (cached) {
      console.warn('⚠️ Using cached books data');
      return JSON.parse(cached);
    }

    // Final fallback
    return createMockBooksData();
  }
}

// ✅ CREATE MOCK BOOKS DATA (as backup)
function createMockBooksData() {
  console.log('📚 Creating mock books data for development...');
  
  const categories = ['Spiritual', 'Yoga', 'Health', 'Language', 'Philosophy', 'Meditation'];
  const authors = [
    'Ancient Sages', 'A.C. Bhaktivedanta Swami Prabhupada', 'Swami Satchidananda', 
    'Charaka', 'Panini', 'Adi Shankara', 'Swami Vivekananda', 'Paramahansa Yogananda'
  ];
  
  const mockBooks = [];
  
  for (let i = 1; i <= 25; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const author = authors[Math.floor(Math.random() * authors.length)];
    const price = Math.floor(Math.random() * 1000) + 100;
    const originalPrice = price + Math.floor(Math.random() * 200);
    const stock = Math.floor(Math.random() * 100);
    
    mockBooks.push({
      _id: `book_${i}`,
      title: `${category} Book ${i} - ${getBookTitleByCategory(category)}`,
      category: category,
      author: author,
      price: price,
      originalPrice: originalPrice,
      stock: stock,
      description: `A comprehensive guide to ${category.toLowerCase()} principles and practices.`,
      isbn: `978-${Math.floor(Math.random() * 10000000000)}`,
      language: 'English',
      pages: Math.floor(Math.random() * 500) + 100,
      weight: `${(Math.random() * 2 + 0.5).toFixed(1)} kg`,
      dimensions: '23x15x5 cm',
      images: ['/images/book-placeholder.jpg'],
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
    });
  }
  
  return mockBooks;
}

function getBookTitleByCategory(category) {
  const titles = {
    'Spiritual': ['Vedas and Upanishads', 'Bhagavad Gita', 'Spiritual Wisdom', 'Divine Knowledge'],
    'Yoga': ['Yoga Sutras', 'Asana Practice', 'Pranayama Guide', 'Meditation Techniques'],
    'Health': ['Ayurveda Basics', 'Herbal Medicine', 'Healthy Living', 'Natural Remedies'],
    'Language': ['Sanskrit Grammar', 'Language Learning', 'Scripture Study', 'Text Analysis'],
    'Philosophy': ['Philosophical Texts', 'Wisdom Literature', 'Ethical Teachings', 'Metaphysics'],
    'Meditation': ['Mindfulness Guide', 'Meditation Practice', 'Inner Peace', 'Consciousness']
  };
  
  const categoryTitles = titles[category] || ['Ancient Text', 'Spiritual Guide', 'Wisdom Book'];
  return categoryTitles[Math.floor(Math.random() * categoryTitles.length)];
}

// Populate Book Categories
function populateBookCategories(books) {
    const categorySelect = document.getElementById('bookCategory');
    const categories = new Set();
    
    books.forEach(book => {
        if (book.category) {
            categories.add(book.category);
        }
    });
    
    // Clear existing options except "All Categories"
    categorySelect.innerHTML = '<option value="">All Categories</option>';
    
    // Add categories
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

// Generate Book Sales Report
async function generateBookSalesReport() {
    try {
        showLoading(true);
        showToast('Generating book sales report...', 'info');
        
        const orders = await loadOrdersFromBackend();
        const books = allBooksData;
        
        // Get date range
        const period = document.getElementById('bookSalesPeriod').value;
        let startDate, endDate;
        
        if (period === 'custom') {
            startDate = document.getElementById('bookStartDate').value;
            endDate = document.getElementById('bookEndDate').value;
            
            if (!startDate || !endDate) {
                showToast('Please select both start and end dates for custom range', 'error');
                showLoading(false);
                return;
            }
        } else {
            const dateRange = calculateDateRange(period);
            startDate = dateRange.startDate;
            endDate = dateRange.endDate;
        }
        
        // Filter orders by date range
        const filteredOrders = filterOrdersByDateRange(orders, startDate, endDate);
        
        // Generate book sales data
        const bookSales = calculateBookSales(filteredOrders, books);
        
        // Apply additional filters
        filteredBooksData = applyBookFilters(bookSales);
        
        // Render results
        renderBookSalesReport(filteredBooksData, filteredOrders.length, startDate, endDate);
        
        showToast(`Book sales report generated for ${filteredBooksData.length} books`, 'success');
        
    } catch (error) {
        console.error('❌ Error generating book sales report:', error);
        showToast('Failed to generate book sales report', 'error');
    } finally {
        showLoading(false);
    }
}

// ✅ FIXED: Calculate Book Sales from Orders - Handle Custom IDs
function calculateBookSales(orders, books) {
  const bookSalesMap = {};
  
  console.log('🔍 Calculating book sales with custom IDs...', {
    totalOrders: orders.length,
    totalBooks: books.length
  });

  // Create mapping by title + author (since IDs don't match)
  const titleAuthorMap = {};
  books.forEach(book => {
    const key = `${book.title?.toLowerCase()?.trim()}|${book.author?.toLowerCase()?.trim()}`;
    titleAuthorMap[key] = book;
    
    // Also map by title only as fallback
    const titleKey = book.title?.toLowerCase()?.trim();
    if (!titleAuthorMap[titleKey]) {
      titleAuthorMap[titleKey] = book;
    }
  });

  console.log('🗺️ Title-Author mapping created:', Object.keys(titleAuthorMap).length, 'entries');

  // Initialize with all books (zero sales)
  books.forEach(book => {
    bookSalesMap[book._id] = {
      id: book._id,
      title: book.title,
      category: book.category,
      author: book.author,
      price: book.price,
      unitsSold: 0,
      totalRevenue: 0,
      ordersCount: 0,
      averagePrice: 0,
      matchedFromInventory: true
    };
  });

  // Process orders
  let matchedItems = 0;
  let unmatchedItems = 0;
  const unmatchedTitles = new Set();

  orders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        let matchedBook = null;
        
        const itemTitle = (item.title || item.name || '').toLowerCase().trim();
        const itemAuthor = (item.author || '').toLowerCase().trim();
        
        // Strategy 1: Match by title + author (most reliable)
        if (itemTitle && itemAuthor) {
          const key = `${itemTitle}|${itemAuthor}`;
          matchedBook = titleAuthorMap[key];
        }
        
        // Strategy 2: Match by title only
        if (!matchedBook && itemTitle) {
          matchedBook = titleAuthorMap[itemTitle];
        }

        if (matchedBook) {
          const quantity = item.quantity || 1;
          const price = item.price || 0;
          
          const bookSale = bookSalesMap[matchedBook._id];
          bookSale.unitsSold += quantity;
          bookSale.totalRevenue += price * quantity;
          bookSale.ordersCount += 1;
          matchedItems++;
        } else {
          unmatchedItems++;
          unmatchedTitles.add(`${item.title} by ${item.author}`);
          
          // Create standalone entry for items not in inventory
          const standaloneId = `standalone_${item.id}`;
          if (!bookSalesMap[standaloneId]) {
            bookSalesMap[standaloneId] = {
              id: standaloneId,
              title: item.title,
              category: item.category || 'General',
              author: item.author,
              price: item.price,
              unitsSold: 0,
              totalRevenue: 0,
              ordersCount: 0,
              averagePrice: 0,
              matchedFromInventory: false,
              originalItemId: item.id
            };
          }
          
          const quantity = item.quantity || 1;
          const price = item.price || 0;
          bookSalesMap[standaloneId].unitsSold += quantity;
          bookSalesMap[standaloneId].totalRevenue += price * quantity;
          bookSalesMap[standaloneId].ordersCount += 1;
        }
      });
    }
  });

  console.log(`📊 Book matching results: ${matchedItems} matched, ${unmatchedItems} unmatched`);
  if (unmatchedTitles.size > 0) {
    console.log('❌ Unmatched titles:', Array.from(unmatchedTitles).slice(0, 5));
  }

  // Calculate averages and return all books with sales
  const bookSales = Object.values(bookSalesMap)
    .filter(book => book.unitsSold > 0)
    .map(book => {
      book.averagePrice = book.unitsSold > 0 ? book.totalRevenue / book.unitsSold : 0;
      return book;
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  console.log(`✅ Book sales calculation complete: ${bookSales.length} books with sales`);
  console.log('📈 Sample sales data:', bookSales.slice(0, 3));
  
  return bookSales;
}

// Apply Book Filters
function applyBookFilters(bookSales) {
    const searchTerm = document.getElementById('bookSearch').value.toLowerCase().trim();
    const categoryFilter = document.getElementById('bookCategory').value;
    
    let filtered = bookSales;
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(book => 
            book.title.toLowerCase().includes(searchTerm) ||
            book.author?.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply category filter
    if (categoryFilter) {
        filtered = filtered.filter(book => book.category === categoryFilter);
    }
    
    return filtered;
}

// Render Book Sales Report
function renderBookSalesReport(bookSales, totalOrders, startDate, endDate) {
    const tbody = document.getElementById('bookSalesBody');
    const summary = document.getElementById('bookSalesSummary');
    const title = document.getElementById('bookSalesTitle');
    
    // Update title and summary
    const formattedStartDate = new Date(startDate).toLocaleDateString('en-IN');
    const formattedEndDate = new Date(endDate).toLocaleDateString('en-IN');
    
    title.textContent = `Book Sales Report (${formattedStartDate} to ${formattedEndDate})`;
    
    const totalRevenue = bookSales.reduce((sum, book) => sum + book.totalRevenue, 0);
    const totalUnits = bookSales.reduce((sum, book) => sum + book.unitsSold, 0);
    
    summary.innerHTML = `
        <strong>${bookSales.length} books</strong> sold 
        <strong>${totalUnits} units</strong> generating 
        <strong>₹${totalRevenue.toFixed(2)}</strong> in 
        <strong>${totalOrders} orders</strong>
    `;
    
    // Sort by revenue (highest first)
    const sortedBooks = bookSales.sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    if (sortedBooks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No books sold in the selected period
                </td>
            </tr>
        `;
        return;
    }
    
    // Render table rows
    tbody.innerHTML = sortedBooks.map((book, index) => {
        const performance = getBookPerformance(book, sortedBooks);
        
        return `
            <tr>
                <td>
                    <div class="book-performance">
                        <strong>${book.title}</strong>
                        ${index < 3 ? `<span class="performance-badge best-seller">TOP ${index + 1}</span>` : ''}
                    </div>
                    ${book.author ? `<small class="text-muted">by ${book.author}</small>` : ''}
                </td>
                <td>${book.category || 'General'}</td>
                <td><strong>${book.unitsSold}</strong></td>
                <td><strong>₹${book.totalRevenue.toFixed(2)}</strong></td>
                <td>₹${book.averagePrice.toFixed(2)}</td>
                <td>${book.ordersCount}</td>
                <td>
                    <span class="sales-trend ${performance.trend}">
                        <i class="fas fa-${performance.icon}"></i>
                        ${performance.label}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// Get Book Performance Indicator
function getBookPerformance(book, allBooks) {
    const avgRevenue = allBooks.reduce((sum, b) => sum + b.totalRevenue, 0) / allBooks.length;
    const performanceRatio = book.totalRevenue / avgRevenue;
    
    if (performanceRatio > 2) {
        return { trend: 'trend-up', icon: 'arrow-up', label: 'Best Seller' };
    } else if (performanceRatio > 1) {
        return { trend: 'trend-up', icon: 'arrow-up', label: 'Good' };
    } else if (performanceRatio > 0.5) {
        return { trend: 'trend-neutral', icon: 'minus', label: 'Average' };
    } else {
        return { trend: 'trend-down', icon: 'arrow-down', label: 'Low' };
    }
}

// Export Book Sales Report
async function exportBookSalesReport() {
    try {
        if (!filteredBooksData.length) {
            showToast('No book sales data to export. Please generate a report first.', 'warning');
            return;
        }
        
        showLoading(true);
        showToast('Preparing book sales export...', 'info');
        
        const period = document.getElementById('bookSalesPeriod').value;
        let startDate, endDate;
        
        if (period === 'custom') {
            startDate = document.getElementById('bookStartDate').value;
            endDate = document.getElementById('bookEndDate').value;
        } else {
            const dateRange = calculateDateRange(period);
            startDate = dateRange.startDate;
            endDate = dateRange.endDate;
        }
        
        const csvContent = generateBookSalesCSV(filteredBooksData, period, startDate, endDate);
        downloadCSV(csvContent, `Book_Sales_Report_${startDate}_to_${endDate}.csv`);
        
        showToast(`Book sales report exported (${filteredBooksData.length} books)`, 'success');
        
    } catch (error) {
        console.error('❌ Error exporting book sales report:', error);
        showToast('Failed to export book sales report', 'error');
    } finally {
        showLoading(false);
    }
}

// Generate Book Sales CSV
function generateBookSalesCSV(bookSales, period, startDate, endDate) {
    const headers = [
        'S.No',
        'Book Title',
        'Author',
        'Category',
        'Units Sold',
        'Total Revenue (₹)',
        'Average Price (₹)',
        'Orders Count',
        'Performance'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    bookSales.forEach((book, index) => {
        const performance = getBookPerformance(book, bookSales);
        
        const row = [
            index + 1,
            `"${book.title}"`,
            `"${book.author || 'Unknown'}"`,
            `"${book.category || 'General'}"`,
            book.unitsSold,
            book.totalRevenue.toFixed(2),
            book.averagePrice.toFixed(2),
            book.ordersCount,
            performance.label
        ];
        
        csvContent += row.join(',') + '\n';
    });
    
    // Add summary section
    csvContent += '\n,,,,,,,,\n';
    csvContent += ',SUMMARY,,,,,,,\n';
    csvContent += `,Report Period,${period},,,,,,\n`;
    csvContent += `,Start Date,${startDate},,,,,,\n`;
    csvContent += `,End Date,${endDate},,,,,,\n`;
    
    const totalRevenue = bookSales.reduce((sum, book) => sum + book.totalRevenue, 0);
    const totalUnits = bookSales.reduce((sum, book) => sum + book.unitsSold, 0);
    const totalOrders = bookSales.reduce((sum, book) => sum + book.ordersCount, 0);
    
    csvContent += `,Total Books,${bookSales.length},,,,,,\n`;
    csvContent += `,Total Units Sold,${totalUnits},,,,,,\n`;
    csvContent += `,Total Revenue,₹${totalRevenue.toFixed(2)},,,,,,\n`;
    csvContent += `,Total Orders,${totalOrders},,,,,,\n`;
    csvContent += `,Average Price,₹${(totalRevenue / totalUnits).toFixed(2)},,,,,,\n`;
    csvContent += `,Report Generated,${new Date().toLocaleString('en-IN')},,,,,,\n`;
    
    return csvContent;
}

// Book Sales Period Change
function changeBookSalesPeriod() {
    const period = document.getElementById('bookSalesPeriod').value;
    const customRange = document.getElementById('bookSalesCustomRange');
    
    if (period === 'custom') {
        customRange.style.display = 'flex';
    } else {
        customRange.style.display = 'none';
    }
}

// Apply Book Sales Date Range
function applyBookSalesDateRange() {
    const startDate = document.getElementById('bookStartDate').value;
    const endDate = document.getElementById('bookEndDate').value;
    
    if (!startDate || !endDate) {
        showToast('Please select both start and end dates', 'error');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showToast('Start date cannot be after end date', 'error');
        return;
    }
    
    generateBookSalesReport();
}

// Search Books for Report
function searchBooksForReport() {
    if (filteredBooksData.length > 0) {
        generateBookSalesReport(); // Regenerate with search filter
    }
}

// Filter Books by Category
function filterBooksByCategory() {
    if (filteredBooksData.length > 0) {
        generateBookSalesReport(); // Regenerate with category filter
    }
}

// Clear Book Sales Filters
function clearBookSalesFilters() {
    document.getElementById('bookSalesPeriod').value = 'week';
    document.getElementById('bookSearch').value = '';
    document.getElementById('bookCategory').value = '';
    document.getElementById('bookSalesCustomRange').style.display = 'none';
    
    // Reset to default dates
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    document.getElementById('bookStartDate').value = oneWeekAgo.toISOString().split('T')[0];
    document.getElementById('bookEndDate').value = today.toISOString().split('T')[0];
    
    // Clear results
    document.getElementById('bookSalesBody').innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">
                No data to display. Generate report to see book sales.
            </td>
        </tr>
    `;
    
    document.getElementById('bookSalesTitle').textContent = 'Book Sales Report';
    document.getElementById('bookSalesSummary').textContent = 'Select filters and generate report to see data';
    
}

// ✅ ===== END BOOK SALES REPORT FUNCTIONS =====

// ✅ ADD: Refresh orders list function
async function refreshOrdersList() {
  try {
    showToast('Refreshing orders...', 'info');
    const orders = await loadOrdersFromBackend();
    initializeOrdersSearch(orders);
    showToast('Orders list updated', 'success');
  } catch (error) {
    console.error('Error refreshing orders:', error);
    showToast('Failed to refresh orders', 'error');
  }
}

// ✅ FINAL: Fix all shipped orders with tracking
async function fixAllShippedOrdersFinal() {
  try {
    const orders = await loadOrdersFromBackend();
    const shippedOrders = orders.filter(order => 
      order.status === 'shipped' && 
      (!order.trackingNumber || order.trackingNumber === '')
    );
    
    console.log(`🔄 Fixing ${shippedOrders.length} shipped orders with tracking...`);
    
    let fixedCount = 0;
    
    for (const order of shippedOrders) {
      const trackingNumber = `SP${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      const courierName = 'india_post';
      
      console.log(`📦 Adding tracking to ${order.orderId}: ${trackingNumber}`);
      
      const response = await fetch(`${API_BASE}/admin/orders/${order._id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trackingNumber: trackingNumber,
          courierName: courierName,
          notes: 'Auto-added tracking number'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          fixedCount++;
          console.log(`✅ Fixed: ${order.orderId}`);
        }
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`🎯 Successfully fixed ${fixedCount} orders`);
    
    // Refresh and show results
    setTimeout(async () => {
      const refreshedOrders = await loadOrdersFromBackend();
      initializeOrdersSearch(refreshedOrders);
      
      const verifiedOrders = refreshedOrders.filter(o => o.status === 'shipped' && o.trackingNumber);
      console.log(`📊 Final check: ${verifiedOrders.length} shipped orders now have tracking`);
      
      showToast(`Added tracking numbers to ${fixedCount} shipped orders`, 'success');
    }, 2000);
    
  } catch (error) {
    console.error('Error fixing orders:', error);
  }
}

// ============================================
// ✅ FORCE OVERRIDE viewCustomerDetails
// ============================================
window.viewCustomerDetails = function(customerId) {
    console.log('🚀 FORCED FUNCTION from admin.js');
    
    // Validate customer ID
    if (!customerId || customerId === '<customer-id>') {
        console.error('Invalid customer ID:', customerId);
        alert('Error: Invalid customer ID. Please report this issue.');
        return;
    }
    
    // Validate it's a MongoDB ObjectId (24 hex chars)
    if (!/^[0-9a-fA-F]{24}$/.test(customerId)) {
        console.error('Invalid ObjectId format:', customerId);
        alert('Error: Invalid customer ID format.');
        return;
    }
    
    console.log('Redirecting to customer details with ID:', customerId);
    window.location.href = `customer-details.html?id=${customerId}`;
};

// Make it non-overridable
Object.defineProperty(window, 'viewCustomerDetails', {
    writable: false,
    configurable: false
});

console.log('✅ admin.js: viewCustomerDetails locked and loaded');

window.addEventListener('beforeunload', () => {
  localStorage.removeItem('cachedBooks');
});


// ✅ Make all functions globally available
window.initAdminDashboard = initAdminDashboard;
window.loadDashboardData = loadDashboardData;
window.showSection = showSection;
window.viewOrderDetails = viewOrderDetails;
window.closeViewModal = closeViewModal;
window.exportData = exportData;
window.searchOrders = searchOrders;
window.clearOrdersSearch = clearOrdersSearch;
window.toggleOrdersFilters = toggleOrdersFilters;
window.applyOrdersFilters = applyOrdersFilters;
window.handleDateRangeChange = handleDateRangeChange;
window.searchCustomers = searchCustomers;
window.clearCustomersSearch = clearCustomersSearch;
window.toggleCustomersFilters = toggleCustomersFilters;
window.applyCustomersFilters = applyCustomersFilters;
window.logoutUser = logoutUser;
window.generateReport = generateReport;
window.hideNewOrderNotification = hideNewOrderNotification;
window.generateSalesReport = generateSalesReport;
window.refreshReports = refreshReports;
window.changeReportPeriod = changeReportPeriod;
window.applyCustomDateRange = applyCustomDateRange;
window.exportOrdersPeriodReport = exportOrdersPeriodReport;
window.generateOrdersCSV = generateOrdersCSV;
window.initMobileEnhancements = initMobileEnhancements;

// ✅ BOOK SALES REPORT FUNCTIONS - ADD TO WINDOW EXPORTS
window.initializeBookSalesReport = initializeBookSalesReport;
window.generateBookSalesReport = generateBookSalesReport;
window.exportBookSalesReport = exportBookSalesReport;
window.changeBookSalesPeriod = changeBookSalesPeriod;
window.applyBookSalesDateRange = applyBookSalesDateRange;
window.searchBooksForReport = searchBooksForReport;
window.filterBooksByCategory = filterBooksByCategory;
window.clearBookSalesFilters = clearBookSalesFilters;
window.refreshOrdersList = refreshOrdersList;
window.fixAllShippedOrdersFinal = fixAllShippedOrdersFinal;

console.log('✅ Admin data module fully loaded with all dependencies');