console.log('🎨 Admin UI loading...');

// ✅ ROLE-BASED ACCESS CONTROL - Add this at the very beginning
async function checkAdminAccess() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login.html';
      return false;
    }
    
    // Get user profile to check role
    const response = await fetch('/api/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const userRole = data.profile.role;
      
      // ✅ Fixed: Allow both super_admin and admin
      if (userRole !== 'super_admin' && userRole !== 'admin') {
        // Redirect to appropriate admin portal based on role
        switch(userRole) {
          case 'music_admin':
          window.location.href = '/music-admin.html';
          break;
          case 'hall_admin':
          window.location.href = '/hall-admin.html';
          break;
          default:
          window.location.href = '/profile.html'; // Regular users go to profile
        }
        return false;
      }
      
      // Set user info in header if elements exist
      const adminNameElement = document.getElementById('adminName');
      const adminRoleElement = document.getElementById('adminRole');
      
      if (adminNameElement) {
        adminNameElement.textContent = data.profile.name;
      }
      if (adminRoleElement) {
        adminRoleElement.textContent = userRole.replace('_', ' ').toUpperCase();
        adminRoleElement.className = `role-badge role-${userRole}`;

        // Add badge colors
        if (userRole === 'super_admin') {
            adminRoleElement.style.backgroundColor = '#dc3545'; // Red
        } else if (userRole === 'admin') {
            adminRoleElement.style.backgroundColor = '#28a745'; // Green
        } else if (userRole === 'music_admin') {
            adminRoleElement.style.backgroundColor = '#007bff'; // Blue
        } else if (userRole === 'hall_admin') {
            adminRoleElement.style.backgroundColor = '#ffc107'; // Yellow
        }
      }
      
      return true; // Access granted
    } else {
      window.location.href = '/login.html';
      return false;
    }
  } catch (error) {
    console.error('Error checking admin access:', error);
    window.location.href = '/login.html';
    return false;
  }
}

// ✅ GLOBAL ADMIN STATE (Single Source of Truth)
if (!window.adminState) {
  window.adminState = {
    allOrders: [],
    filteredOrders: [],
    allCustomers: [],
    filteredCustomers: [],
    allBooks: []
  };
}

// ✅ Check access when page loads
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🔐 Checking admin access...');
  
  const hasAccess = await checkAdminAccess();
  if (!hasAccess) {
    return; // User will be redirected
  }
  
  console.log('✅ Access granted! Loading admin dashboard...');
  
});

// ✅ Correct global variable initialization
window.currentOrderId = null;


// ✅ Enhanced view order details function in admin-ui.js
async function viewOrderDetails(orderId) {
  try {
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

// ✅ Simplified Accessibility Manager for Admin
const AccessibilityManager = {
    initModalAccessibility(modal) {
        // Basic modal accessibility - trap focus
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }

                if (e.key === 'Escape') {
                    closeViewModal();
                }
            });
        }
    },

    announceToScreenReader(message) {
        // Simple screen reader announcement
        console.log('Screen Reader:', message);
    }
};

// ✅ Simplified Error Handler for Admin
const ErrorHandler = {
    handleError(error, userMessage = 'An error occurred') {
        console.error('Admin Error:', error);
        showToast(userMessage, 'error');
    }
};

// ✅ Simplified Performance Optimizer
const PerformanceOptimizer = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};


// ✅ UPDATED: Render recent orders WITHOUT tracking
function renderRecentOrders(orders = window.adminState.allOrders) {
  const tbody = document.getElementById('recent-orders-body');
  if (!tbody) {
    console.error('❌ recent-orders-body element not found');
    return;
  }

  console.log('📋 Rendering recent orders WITHOUT tracking...');

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:40px; color:#888;">
          <i class="fas fa-inbox" style="font-size:48px; margin-bottom:15px; opacity:0.5;"></i>
          <div style="font-size:16px; margin-bottom:8px;">No orders found</div>
          <small>Orders will appear here once customers place them</small>
        </td>
      </tr>
    `;
    return;
  }

  // Sort by date (newest first) and take latest 5
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
    .slice(0, 5);

  tbody.innerHTML = recentOrders.map(order => {
    const orderDate = new Date(order.createdAt || order.date).toLocaleDateString();
    const status = order.status || 'pending';
    const statusClass = `status-${status}`;
    const totalAmount = order.totals?.total || order.total || 0;

    return `
      <tr>
        <td><strong>${order.orderId || order._id || 'N/A'}</strong></td>
        <td>
          <div>
            <strong>${order.customerName || 'Unknown Customer'}</strong>
            ${order.customerEmail ? `<br><small>${order.customerEmail}</small>` : ''}
          </div>
        </td>
        <td>${orderDate}</td>
        <td><strong>₹${totalAmount.toFixed(2)}</strong></td>
        <td>
          <span class="status-badge ${statusClass}">
            ${status.toUpperCase()}
          </span>
        </td>
        <!-- ❌ TRACKING REMOVED - Only View button -->
        <td>
          <button class="btn btn-sm btn-primary" onclick="viewOrderDetails('${order._id || order.orderId}')">
            <i class="fas fa-eye"></i> View
          </button>
        </td>
      </tr>
    `;
  }).join('');

  console.log('✅ Recent orders rendered successfully WITHOUT tracking');
}

// ✅ ORDERS MANAGEMENT FUNCTIONS
function initializeOrdersSearch(orders) {
    window.adminState.allOrders = orders;
    window.adminState.filteredOrders = [...orders];

    updateOrdersResultsCounter();
    renderAllOrders(window.adminState.filteredOrders);
}

// ✅ UPDATED: Render all orders WITHOUT Tracking column
// ✅ Render all orders (NO tracking column)
function renderAllOrders(orders = []) {
    const container = document.getElementById('orders-content');

    if (!container) {
        console.error('❌ orders-content element not found');
        return;
    }

    console.log('📋 Rendering all orders...');

    // Empty state
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Payment</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="8" class="empty-state">
                                <i class="fas fa-inbox"></i>
                                <div>No orders found</div>
                                <small>Orders will appear here once placed</small>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        return;
    }

    // Sort orders (latest first)
    const sortedOrders = [...orders].sort(
        (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
    );

    container.innerHTML = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedOrders.map(order => {
                        const orderDate = new Date(order.createdAt || order.date).toLocaleDateString('en-IN');
                        const status = order.status || 'pending';
                        const paymentStatus = order.paymentStatus || 'pending';
                        const totalAmount = order.totals?.total || order.total || 0;

                        const items = Array.isArray(order.items) ? order.items : [];
                        const itemsCount = items.length;

                        const itemTitles = items
                            .slice(0, 2)
                            .map(item => item.title || item.name || 'Item')
                            .join(', ');

                        const moreItems = items.length > 2 ? ` +${items.length - 2} more` : '';

                        return `
                            <tr>
                                <td><strong>${order.orderId || order._id || 'N/A'}</strong></td>

                                <td>
                                    <strong>${order.customerName || 'Unknown Customer'}</strong>
                                    ${order.customerEmail ? `<br><small>${order.customerEmail}</small>` : ''}
                                </td>

                                <td>${orderDate}</td>

                                <td title="${itemTitles}">
                                    ${itemsCount} item${itemsCount !== 1 ? 's' : ''}
                                    ${moreItems ? `<br><small>${moreItems}</small>` : ''}
                                </td>

                                <td><strong>₹${totalAmount.toFixed(2)}</strong></td>

                                <td>
                                    <span class="status-badge status-${status}">
                                        ${status.toUpperCase()}
                                    </span>
                                </td>

                                <td>
                                    <span class="status-badge status-${paymentStatus}">
                                        ${paymentStatus.toUpperCase()}
                                    </span>
                                </td>

                                <td>
                                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                        <button 
                                            class="btn btn-sm btn-primary"
                                            onclick="viewOrderDetails('${order._id || order.orderId}')">
                                            <i class="fas fa-eye"></i> View
                                        </button>

                                        ${status === 'pending' ? `
                                            <button 
                                                class="btn btn-sm btn-success"
                                                onclick="quickUpdateStatus('${order._id || order.orderId}', 'confirmed')">
                                                <i class="fas fa-check"></i> Confirm
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    console.log('✅ Orders rendered successfully');
}

function updateOrdersResultsCounter() {
    const counter = document.getElementById('ordersResultsCounter');
    if (counter) {
        counter.textContent =
          `Showing ${window.adminState.filteredOrders.length} of ${window.adminState.allOrders.length} orders`;
    }
}

// Quick status update function
async function quickUpdateStatus(orderId, newStatus) {
    try {
        const success = await updateOrderStatus(orderId, newStatus, 'order');
        if (success) {
            // Refresh the orders list
            const orders = await loadOrdersFromBackend();
            initializeOrdersSearch(orders);
        }
    } catch (error) {
        console.error('Error in quick status update:', error);
    }
}


// admin-ui.js (OPTIONAL helper)
function renderDashboardMetrics({ orders, revenue, customers, inventory }) {
  const ordersEl = document.getElementById("total-orders");
  const revenueEl = document.getElementById("total-revenue");
  const customersEl = document.getElementById("total-customers");
  const inventoryEl = document.getElementById("total-inventory");

  if (ordersEl) ordersEl.textContent = orders;
  if (revenueEl) revenueEl.textContent = `₹${revenue.toFixed(2)}`;
  if (customersEl) customersEl.textContent = customers;
  if (inventoryEl) inventoryEl.textContent = inventory;
}


// Initialize customers search and filtering
function initializeCustomersSearch(customers) {
    window.adminState.allCustomers = customers;
    window.adminState.filteredCustomers = [...customers];

    updateCustomersResultsCounter();
    renderAllCustomers(window.adminState.filteredCustomers);
}

// ✅ FIXED: Render all customers in customers management page
function renderAllCustomers(customers = window.adminState.filteredCustomers) {
    const container = document.getElementById('customers-content');
    if (!container) {
        console.error('❌ customers-content element not found');
        return;
    }

    console.log('📋 Rendering all customers:', customers.length);

    if (!customers || customers.length === 0) {
        container.innerHTML = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Location</th>
                            <th>Orders</th>
                            <th>Join Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="7" class="empty-state">
                                <i class="fas fa-users"></i>
                                <div>No customers found</div>
                                <small>Customer data will appear here once loaded</small>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        return;
    }

    // ✅ FIX: Use proper customer ID - Use _id instead of hardcoded string
    const customersHtml = customers.map(customer => {
        const joinDate = new Date(customer.createdAt || customer.joinDate).toLocaleDateString('en-IN');
        const ordersCount = customer.totalOrders || customer.ordersCount || 0;
        
        // ✅ FIXED: Handle location properly
        let location = 'Not specified';
        if (customer.defaultShippingAddress) {
            location = customer.defaultShippingAddress.city || 
                       customer.defaultShippingAddress.state || 
                       location;
        }
        
        // ✅ FIXED: Use customer._id instead of hardcoded string
        const customerId = customer._id || customer.id;
        
        if (!customerId || customerId === '<customer-id>') {
            console.error('❌ Invalid customer ID:', customer);
            return ''; // Skip this customer
        }
        
        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="customer-avatar" style="width:40px;height:40px;border-radius:50%;background:var(--secondary);color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;">
                            ${customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                            <strong>${customer.name || 'Unknown Customer'}</strong>
                            ${customerId ? `<br><small>ID: ${customerId.substring(0, 8)}...</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>${customer.email || 'No email'}</td>
                <td>${customer.phone || customer.phoneNumber || 'N/A'}</td>
                <td>${location}</td>
                <td>
                    <strong>${ordersCount}</strong> order${ordersCount !== 1 ? 's' : ''}
                    ${customer.totalSpent ? `<br><small>₹${customer.totalSpent.toFixed(2)} spent</small>` : ''}
                </td>
                <td>${joinDate}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-sm btn-primary"
                                onclick="viewCustomerDetails('${customer._id}')">
                            <i class="fas fa-eye"></i> View
                        </button>

                        <button class="btn btn-sm btn-info"
                                onclick="viewCustomerOrders('${customer._id}')">
                            <i class="fas fa-shopping-cart"></i> Orders
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Location</th>
                        <th>Orders</th>
                        <th>Join Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="customers-body">
                    ${customersHtml}
                </tbody>
            </table>
        </div>
    `;

    console.log('✅ All customers rendered successfully');
}

// Update customers results counter
function updateCustomersResultsCounter() {
    const counter = document.getElementById('customersResultsCounter');
    if (counter) {
        counter.textContent =
            `Showing ${window.adminState.filteredCustomers.length} of ${window.adminState.allCustomers.length} customers`;
    }
}

// ✅ FIXED: View customer orders function
function viewCustomerOrders(customerId) {
  // If not passed, try to read from URL (customer-details.html)
  if (!customerId) {
    const params = new URLSearchParams(window.location.search);
    customerId = params.get('id');
  }

  console.log('📦 viewCustomerOrders called with ID:', customerId);

  if (!customerId) {
    console.error('❌ ERROR: No customer ID found');
    alert('Customer ID not found');
    return;
  }

  // Validate MongoDB ObjectId
  if (!/^[0-9a-fA-F]{24}$/.test(customerId)) {
    console.error('❌ ERROR: Invalid customer ID format:', customerId);
    alert('Invalid customer ID');
    return;
  }

  // Redirect to admin orders filtered by customer
  window.location.href = `admin.html#orders&customer=${customerId}`;
}

// ✅ FIXED: View customer details function with proper validation
function viewCustomerDetails(customerId) {
    console.log('🚀 viewCustomerDetails called with ID:', customerId);

    if (!customerId || customerId === '<customer-id>') {
        alert('Error: Invalid customer ID');
        return;
    }

    if (!/^[0-9a-fA-F]{24}$/.test(customerId)) {
        alert('Error: Invalid customer ID format');
        return;
    }

    window.location.href = `customer-details.html?id=${customerId}`;
}

// ✅ Enhanced Admin Order Details Modal WITH MULTI-COURIER TRACKING
function renderOrderDetailsInModal(order) {
    try {
        console.log('🔍 Rendering admin order details for:', order.orderId || order.id);

        const modalContent = document.getElementById('viewOrderContent');
        if (!modalContent) {
            console.error('Modal content element not found');
            return;
        }

        // ✅ FIXED: Use the correct address property names
        const billingAddress = order.billingAddress || {};
        const shippingAddress = order.shippingAddress || {};

        // Format order date
        const orderDate = new Date(order.date || order.createdAt).toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Calculate totals
        const items = Array.isArray(order.items) ? order.items : [];
        let originalSubtotal = 0;
        let netSubtotal = 0;
        let discount = 0;

        items.forEach(item => {
            const mrp = Number(item.originalPrice ?? item.mrp ?? item.price ?? 0);
            const selling = Number(item.price ?? 0);
            const qty = Number(item.quantity ?? 1);
            const lineOriginal = mrp * qty;
            const lineNet = selling * qty;
            const lineDiscount = Math.max(0, lineOriginal - lineNet);

            originalSubtotal += lineOriginal;
            netSubtotal += lineNet;
            discount += lineDiscount;
        });

        const shipping = Number(order.totals?.shipping ?? 0);
        const totalAmount = Number(order.totals?.total ?? (netSubtotal + shipping));

        // Build items HTML
        const itemsHtml = items.length > 0
            ? items.map(item => `
                <div class="order-item">
                    <div class="item-info">
                        <span class="item-name">${item.title || 'Unknown Item'}</span>
                        <span class="item-author">${item.author || ''}</span>
                        <span class="item-quantity">Qty: ${item.quantity || 1}</span>
                    </div>
                    <div class="item-price">₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</div>
                </div>
            `).join('')
            : '<div class="order-item">No items found</div>';

        // ✅ FIXED: Address formatting function with correct property names
        const formatAddress = (address, type = '') => {
            if (!address || Object.keys(address).length === 0) {
                return '<p style="color: #999; font-style: italic;">No address information available</p>';
            }

            return `
                <p><strong>${address.fullName || address.name || 'N/A'}</strong></p>
                <p>${address.addressLine1 || address.address || 'N/A'}</p>
                ${address.addressLine2 ? `<p>${address.addressLine2}</p>` : ''}
                <p>${address.city || 'N/A'}, ${address.district || 'N/A'} - ${address.pincode || 'N/A'}</p>
                <p>${address.state || 'N/A'}, ${address.country || 'India'}</p>
                <p>Phone: ${address.phone || 'N/A'}</p>
                ${type === 'shipping' && order.shippingRegion ? `<p><strong>Shipping Region:</strong> ${order.shippingRegion}</p>` : ''}
            `;
        };

        // Status options for admin
        const statusOptions = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
        const paymentStatusOptions = ['pending', 'paid', 'failed', 'refunded'];

        // ✅ ENHANCED: Tracking Information with Multi-Courier Support
        const trackingNumber = order.trackingNumber || '';
        const courierName = order.courierName || '';
        
        // Courier options with tracking URLs
        const courierOptions = [
            { value: 'india_post', name: 'India Post', url: 'https://www.indiapost.gov.in/_layouts/15/DOP.Portal.Tracking/TrackConsignment.aspx' },
            { value: 'professional_courier', name: 'Professional Courier', url: 'https://www.tpcindia.com/TrackYourCourier.aspx' },
            { value: 'st_courier', name: 'ST Courier', url: 'https://www.stcourier.com/track-your-shipment' },
            { value: 'dtdc', name: 'DTDC', url: 'https://www.dtdc.in/tracking.asp' },
            { value: 'delhivery', name: 'Delhivery', url: 'https://www.delhivery.com/track/package/' },
            { value: 'bluedart', name: 'Blue Dart', url: 'https://www.bluedart.com/tracking' },
            { value: 'fedex', name: 'FedEx', url: 'https://www.fedex.com/en-in/tracking.html' },
            { value: 'dhl', name: 'DHL', url: 'https://www.dhl.com/in-en/home/tracking.html' },
            { value: 'ekart', name: 'Ekart Logistics', url: 'https://ekartlogistics.com/track/' },
            { value: 'xpressbees', name: 'XpressBees', url: 'https://www.xpressbees.com/track' },
            { value: 'other', name: 'Other Courier', url: '' }
        ];

        const trackingSection = `
            <!-- 📦 ENHANCED TRACKING INFORMATION SECTION - MULTI-COURIER SUPPORT -->
            <div class="order-section">
                <h4><i class="fas fa-shipping-fast"></i> Shipping & Tracking Information</h4>
                <div class="tracking-controls">
                    <!-- Courier Selection -->
                    <div class="form-group">
                        <label for="courierSelect">Courier Service:</label>
                        <select id="courierSelect" class="form-select">
                            <option value="">Select Courier Service</option>
                            ${courierOptions.map(courier => `
                                <option value="${courier.value}" ${courierName === courier.value ? 'selected' : ''}>
                                    ${courier.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- Tracking Number Input -->
                    <div class="form-group">
                        <label for="trackingNumberInput">Tracking Number:</label>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="text" 
                                   id="trackingNumberInput" 
                                   class="form-input" 
                                   placeholder="Enter tracking number"
                                   value="${trackingNumber}"
                                   style="font-family: monospace; font-weight: bold;">
                            <button class="btn btn-success" onclick="saveTrackingInfo('${order._id || order.orderId}')">
                                <i class="fas fa-save"></i> Save
                            </button>
                        </div>
                        <small class="form-text">Enter the tracking number provided by your courier service</small>
                    </div>
                    
                    <!-- Tracking Actions -->
                    <div class="tracking-actions" style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="markAsShippedWithTracking('${order._id || order.orderId}')">
                            <i class="fas fa-shipping-fast"></i> Mark as Shipped & Send Email
                        </button>
                        <button class="btn btn-info" onclick="copyTrackingNumber('${trackingNumber}')" ${!trackingNumber ? 'disabled' : ''}>
                            <i class="fas fa-copy"></i> Copy Tracking
                        </button>
                        ${trackingNumber && courierName ? `
                        <button class="btn btn-outline" onclick="openTrackingLink('${courierName}', '${trackingNumber}')">
                            <i class="fas fa-external-link-alt"></i> Track Package
                        </button>
                        ` : ''}
                    </div>
                    
                    <!-- Tracking Display -->
                    ${trackingNumber ? `
                    <div class="tracking-display" style="margin-top: 15px; padding: 15px; background: #e7f3ff; border-radius: 8px; border: 1px solid #b3d9ff;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <i class="fas fa-check-circle" style="color: #28a745; font-size: 20px;"></i>
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <div>
                                        <strong style="display: block; font-size: 14px; color: #155724;">Tracking Information</strong>
                                        <div style="display: flex; gap: 20px; margin-top: 5px;">
                                            ${courierName ? `
                                                <div>
                                                    <strong>Courier:</strong> 
                                                    <span style="color: #155724;">${courierOptions.find(c => c.value === courierName)?.name || courierName}</span>
                                                </div>
                                            ` : ''}
                                            <div>
                                                <strong>Tracking No:</strong> 
                                                <span style="font-family: monospace; font-weight: bold; font-size: 16px; color: #155724;">${trackingNumber}</span>
                                            </div>
                                        </div>
                                    </div>
                                    ${courierName ? `
                                    <button class="btn btn-sm btn-outline" onclick="openTrackingLink('${courierName}', '${trackingNumber}')" style="white-space: nowrap;">
                                        <i class="fas fa-external-link-alt"></i> Track
                                    </button>
                                    ` : ''}
                                </div>
                                ${order.shippedAt ? `
                                <div style="font-size: 12px; color: #6c757d;">
                                    <i class="fas fa-calendar-alt"></i> Shipped on: ${new Date(order.shippedAt).toLocaleDateString('en-IN')}
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    ` : `
                    <div class="tracking-display" style="margin-top: 15px; padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffeaa7;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <i class="fas fa-info-circle" style="color: #856404; font-size: 20px;"></i>
                            <div>
                                <strong style="color: #856404;">No tracking information added</strong>
                                <p style="margin: 5px 0 0 0; color: #856404; font-size: 14px;">
                                    Add courier service and tracking number, then mark as shipped to send shipping notification email to customer.
                                </p>
                            </div>
                        </div>
                    </div>
                    `}
                </div>
            </div>
        `;

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2 id="modal-title">Order Details - Admin</h2>
                <button class="close-btn" onclick="closeViewModal()" aria-label="Close order details">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="order-details-container" id="printable-content">
                <!-- Order Header -->
                <div class="order-summary">
                    <div class="order-header">
                        <h3>Order #${order.orderId || order.id || 'N/A'}</h3>
                        <span class="order-date">${orderDate}</span>
                    </div>

                    <!-- Customer Information -->
                    <div class="customer-info">
                        <h4>Customer Information</h4>
                        <div class="customer-details">
                            <p><strong>Name:</strong> ${order.customerName || order.contact?.name || 'N/A'}</p>
                            <p><strong>Email:</strong> ${order.customerEmail || order.contact?.email || 'N/A'}</p>
                            <p><strong>Phone:</strong> ${order.customerPhone || order.contact?.phone || 'N/A'}</p>
                            <p><strong>User ID:</strong> ${order.userId || 'Guest'}</p>
                        </div>
                    </div>

                    <!-- ✅ SIMPLIFIED: Admin Status Controls with ONLY Quick Action Buttons -->
                    <div class="admin-status-controls">
                        <div class="status-control-group">
                            <label>Order Status:</label>
                            <div class="current-status" style="margin: 10px 0; padding: 8px 12px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid var(--secondary);">
                                <strong>Current Status:</strong> 
                                <span class="status-badge status-${order.status}" style="margin-left: 8px;">
                                    ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </span>
                            </div>
                        </div>

                        <div class="status-control-group">
                            <label for="paymentStatus">Payment Status:</label>
                            <select id="paymentStatus" class="status-select" onchange="updateOrderStatus('${order._id || order.id}', this.value, 'payment')">
                                ${paymentStatusOptions.map(status => `
                                    <option value="${status}" ${order.paymentStatus === status ? 'selected' : ''}>
                                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <!-- ✅ QUICK ACTION BUTTONS (Now the primary control) -->
                        <div class="quick-action-buttons" style="margin-top: 15px;">
                            <h4 style="margin-bottom: 10px; color: var(--primary);">Change Order Status:</h4>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <button class="btn btn-sm btn-warning" onclick="quickStatusChange('${order._id || order.id}', 'pending')" ${order.status === 'pending' ? 'disabled' : ''}>
                                    <i class="fas fa-clock"></i> Pending
                                </button>
                                <button class="btn btn-sm btn-info" onclick="quickStatusChange('${order._id || order.id}', 'confirmed')" ${order.status === 'confirmed' ? 'disabled' : ''}>
                                    <i class="fas fa-check-circle"></i> Confirm
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="quickStatusChange('${order._id || order.id}', 'processing')" ${order.status === 'processing' ? 'disabled' : ''}>
                                    <i class="fas fa-cogs"></i> Processing
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="prepareForShipping('${order._id || order.id}')" ${order.status === 'shipped' ? 'disabled' : ''}>
                                    <i class="fas fa-shipping-fast"></i> Shipped
                                </button>
                                <button class="btn btn-sm btn-success" onclick="quickStatusChange('${order._id || order.id}', 'delivered')" ${order.status === 'delivered' ? 'disabled' : ''}>
                                    <i class="fas fa-box-open"></i> Delivered
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="quickStatusChange('${order._id || order.id}', 'cancelled')" ${order.status === 'cancelled' ? 'disabled' : ''}>
                                    <i class="fas fa-times-circle"></i> Cancel
                                </button>
                            </div>
                        </div>

                        <div class="status-control-group" style="margin-top: 15px;">
                            <label for="statusNotes">Status Notes:</label>
                            <textarea id="statusNotes" class="status-notes" placeholder="Add notes for status change..."></textarea>
                        </div>

                        <button class="btn btn-primary" onclick="saveStatusChanges('${order._id || order.id}')">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </div>

                <div class="order-sections">
                    <!-- Items Ordered -->
                    <div class="order-section">
                        <h4>Items Ordered</h4>
                        <div class="items-list">
                            ${itemsHtml}
                        </div>
                    </div>

                    <!-- Addresses -->
                    <div class="addresses-section">
                        <div class="address-column">
                            <h4>Shipping Address</h4>
                            <div class="address-details">
                                ${formatAddress(shippingAddress, 'shipping')}
                            </div>
                        </div>

                        <div class="address-column">
                            <h4>Billing Address</h4>
                            <div class="address-details">
                                ${formatAddress(billingAddress)}
                            </div>
                        </div>
                    </div>

                    ${trackingSection}

                    <!-- Order Summary -->
                    <div class="order-section">
                        <h4>Order Summary</h4>
                        <div class="order-totals">
                            <div class="total-row">
                                <span>Original Subtotal:</span>
                                <span>₹${originalSubtotal.toFixed(2)}</span>
                            </div>
                            ${discount > 0 ? `
                            <div class="total-row">
                                <span>Discount:</span>
                                <span>-₹${discount.toFixed(2)}</span>
                            </div>` : ''}
                            <div class="total-row">
                                <span>Net Subtotal:</span>
                                <span>₹${netSubtotal.toFixed(2)}</span>
                            </div>
                            <div class="total-row">
                                <span>Shipping:</span>
                                <span>₹${shipping.toFixed(2)}</span>
                            </div>
                            ${order.totals?.tax > 0 ? `
                            <div class="total-row">
                                <span>Tax:</span>
                                <span>₹${(order.totals.tax || 0).toFixed(2)}</span>
                            </div>` : ''}
                            <div class="total-row grand-total">
                                <span>Total Amount:</span>
                                <span>₹${totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Payment Information -->
                    <div class="order-section">
                        <h4>Payment Information</h4>
                        <div class="payment-info">
                            <p><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</p>
                            <p><strong>Payment Status:</strong> 
                                <span class="status-badge status-${order.paymentStatus?.toLowerCase() || 'pending'}">
                                    ${order.paymentStatus || 'Pending'}
                                </span>
                            </p>
                            ${order.discountCode ? `<p><strong>Discount Code:</strong> ${order.discountCode}</p>` : ''}
                        </div>
                    </div>

                    <!-- Status History -->
                    ${order.statusHistory && order.statusHistory.length > 0 ? `
                    <div class="order-section">
                        <h4>Status History</h4>
                        <div class="status-history">
                            ${order.statusHistory.map(history => `
                                <div class="history-item">
                                    <span class="history-status status-${history.status}">${history.status}</span>
                                    <span class="history-date">${new Date(history.updatedAt).toLocaleString()}</span>
                                    <span class="history-notes">${history.notes || ''}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeViewModal()">
                    <i class="fas fa-times"></i> Close
                </button>
                <button class="btn btn-info" onclick="printOrder('${order._id || order.id}')">
                    <i class="fas fa-print"></i> Print
                </button>
                <button class="btn btn-primary"
                        onclick="downloadAdminInvoice('${order._id || order.id}', event)">
                    <i class="fas fa-download"></i> Download Invoice
                </button>
            </div>
        `;

        // Initialize modal accessibility
        const modal = document.getElementById('viewOrderModal');
        if (modal) {
            AccessibilityManager.initModalAccessibility(modal);
        }

    } catch (error) {
        console.error('Error rendering admin order details:', error);
        ErrorHandler.handleError(error, "Failed to load order details");
    }
}

// ✅ Update Order Status (Admin)
async function updateOrderStatus(orderId, newStatus, type = 'order') {
    try {
        console.log(`Updating ${type} status for order ${orderId} to ${newStatus}`);

        const notes = document.getElementById('statusNotes')?.value || '';
        
        let updateData = {};
        if (type === 'order') {
            updateData = { status: newStatus, notes };
        } else if (type === 'payment') {
            updateData = { paymentStatus: newStatus, notes };
        }

        const success = await updateOrderStatusInBackend(orderId, updateData);
        
        if (success) {
            showToast(`${type === 'order' ? 'Order' : 'Payment'} status updated to ${newStatus}`, 'success');
            
            // Refresh the order details to show updated status
            const order = await getOrderDetails(orderId);
            renderOrderDetailsInModal(order);
            
            // Refresh orders list if needed
            if (typeof loadSectionData === 'function') {
                loadSectionData('orders');
            }
        }
        
    } catch (error) {
        console.error('Error updating order status:', error);
        showToast('Failed to update status', 'error');
    }
}

// ✅ Quick Status Change with Buttons
async function quickStatusChange(orderId, newStatus) {
    try {
        // If status is 'shipped', use the prepareForShipping function instead
        if (newStatus === 'shipped') {
            prepareForShipping(orderId);
            return;
        }

        const statusLabels = {
            'pending': 'Pending',
            'confirmed': 'Confirmed', 
            'processing': 'Processing',
            'shipped': 'Shipped',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled'
        };

        if (!confirm(`Are you sure you want to mark this order as ${statusLabels[newStatus]}?`)) {
            return;
        }

        const notes = document.getElementById('statusNotes')?.value || `Status changed to ${statusLabels[newStatus]} via quick action`;
        
        const updateData = {
            status: newStatus,
            notes: notes
        };

        console.log(`🔄 Quick status change: ${orderId} -> ${newStatus}`);

        // Show loading state
        const buttons = document.querySelectorAll('.quick-action-buttons .btn');
        buttons.forEach(btn => btn.disabled = true);

        const success = await updateOrderStatusInBackend(orderId, updateData);
        
        if (success) {
            showToast(`✅ Order status changed to ${statusLabels[newStatus]}`, 'success');
            
            // Refresh the order details to show updated status
            setTimeout(async () => {
                try {
                    const order = await getOrderDetails(orderId);
                    renderOrderDetailsInModal(order);
                } catch (refreshError) {
                    console.error('Error refreshing order:', refreshError);
                }
            }, 500);
            
            // Refresh orders list
            if (typeof loadSectionData === 'function') {
                setTimeout(() => loadSectionData('orders'), 1000);
            }
        }
        
    } catch (error) {
        console.error('Error in quick status change:', error);
        showToast('Failed to update order status', 'error');
    }
}

// ✅ Save All Status Changes
async function saveStatusChanges(orderId) {
  try {
    const paymentStatus = document.getElementById('paymentStatus')?.value;
    const notes = document.getElementById('statusNotes')?.value || '';

    if (!paymentStatus && !notes) {
      showToast('No changes to save', 'warning');
      return;
    }

    const updateData = {};
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (notes) updateData.notes = notes;

    const success = await updateOrderStatusInBackend(orderId, updateData);

    if (success) {
      showToast('All changes saved successfully', 'success');
      const order = await getOrderDetails(orderId);
      renderOrderDetailsInModal(order);
    }
  } catch (error) {
    console.error('Error saving status changes:', error);
    showToast('Failed to save changes', 'error');
  }
}

// ✅ Download Admin Invoice
async function downloadAdminInvoice(orderId, event) {
    const button = event?.currentTarget || null;
    let originalText = button?.innerHTML || '';

    if (button) {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        button.disabled = true;
    }

    try {
        showToast("Generating PDF invoice...", "info");
        const order = await getOrderDetails(orderId);
        generatePDFInvoice(order, orderId);
        showToast("PDF invoice downloaded successfully!", "success");
    } catch (error) {
        console.error("Error generating admin invoice:", error);
        showToast("Failed to generate PDF", "error");
    } finally {
        if (button) {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }
}

// ✅ FIXED: Save tracking information with better error handling
async function saveTrackingInfo(orderId) {
  try {
    const input = document.getElementById('trackingNumberInput');
    if (!input) return showToast('Tracking input not found', 'error');

    const trackingNumber = input.value.trim();

    const courierSelectEl = document.getElementById('courierSelect');
    if (!courierSelectEl) return showToast('Courier select not found', 'error');

    const courierSelect = courierSelectEl.value;

    if (!trackingNumber) {
      showToast('Please enter a tracking number', 'error');
      return;
    }

    if (!courierSelect) {
      showToast('Please select a courier service', 'error');
      return;
    }

    const updateData = {
      trackingNumber,
      courierName: courierSelect,
      notes: `Tracking updated: ${trackingNumber}`
    };

    const response = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) throw new Error('Failed to save tracking');

    const result = await response.json();

    if (result.success) {
      showToast('Tracking information saved', 'success');
      const order = await getOrderDetails(orderId);
      renderOrderDetailsInModal(order);
    } else {
      throw new Error(result.message || 'Save failed');
    }

  } catch (error) {
    console.error('Error saving tracking:', error);
    showToast('Failed to save tracking: ' + error.message, 'error');
  }
}

// Open tracking link based on courier
function openTrackingLink(courierName, trackingNumber) {
  const courierUrls = {
    'india_post': 'https://www.indiapost.gov.in/_layouts/15/DOP.Portal.Tracking/TrackConsignment.aspx',
    'professional_courier': 'https://www.tpcindia.com/TrackYourCourier.aspx',
    'st_courier': 'https://www.stcourier.com/track-your-shipment',
    'dtdc': 'https://www.dtdc.in/tracking.asp',
    'delhivery': 'https://www.delhivery.com/track/package/',
    'bluedart': 'https://www.bluedart.com/tracking',
    'fedex': 'https://www.fedex.com/en-in/tracking.html',
    'dhl': 'https://www.dhl.com/in-en/home/tracking.html',
    'ekart': 'https://ekartlogistics.com/track/',
    'xpressbees': 'https://www.xpressbees.com/track'
  };

  const url = courierUrls[courierName];
  if (url) {
    window.open(url, '_blank');
    showToast(`Opening ${courierName} tracking page...`, 'info');
  } else {
    showToast('Tracking URL not available for this courier', 'warning');
  }
}

// ✅ UPDATED: Mark as shipped with auto-refresh
async function markAsShippedWithTracking(orderId) {
  try {
    const trackingNumber = document.getElementById('trackingNumberInput')?.value.trim();
    const courierSelect = document.getElementById('courierSelect')?.value;
    
    if (!trackingNumber) {
      showToast('Please enter a tracking number first', 'error');
      return;
    }

    if (!courierSelect) {
      showToast('Please select a courier service', 'error');
      return;
    }

    const courierOptions = {
      'india_post': 'India Post',
      'professional_courier': 'Professional Courier',
      'st_courier': 'ST Courier',
      'dtdc': 'DTDC',
      'delhivery': 'Delhivery',
      'bluedart': 'Blue Dart',
      'fedex': 'FedEx',
      'dhl': 'DHL',
      'ekart': 'Ekart Logistics',
      'xpressbees': 'XpressBees',
      'other': 'Other Courier'
    };

    const courierDisplayName = courierOptions[courierSelect] || courierSelect;

    if (!confirm(`Mark order as shipped with ${courierDisplayName}?\nTracking: ${trackingNumber}\n\nThis will send a shipping email to the customer.`)) {
      return;
    }

    // ✅ Prepare data for shipping - this will set order.status = 'shipped'
    const shippingData = {
      status: 'shipped', // This triggers the shipped status
      trackingNumber: trackingNumber,
      courierName: courierSelect, // ✅ This saves to order.courierName
      notes: `Shipped via ${courierDisplayName} with tracking: ${trackingNumber}`
    };

    // ✅ USE THE STATUS UPDATE ENDPOINT (not /ship endpoint)
    const response = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shippingData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      showToast(`✅ Order shipped! ${courierDisplayName} - ${trackingNumber}`, 'success');
      
      // ✅ REFRESH ORDERS LIST
      setTimeout(async () => {
        try {
          const orders = await loadOrdersFromBackend();
          initializeOrdersSearch(orders);
          showToast('Orders list updated', 'success');
        } catch (refreshError) {
          console.error('Error refreshing orders:', refreshError);
        }
      }, 1000);
      
      // Close modal
      closeViewModal();
      
    } else {
      throw new Error(result.message || 'Failed to mark as shipped');
    }
    
  } catch (error) {
    console.error('Error marking as shipped:', error);
    showToast('Failed to mark order as shipped: ' + error.message, 'error');
  }
}

// ✅ Quick Ship Order - For orders list quick actions
async function quickShipOrder(orderId) {
    try {
        if (!confirm('Mark this order as shipped? You will need to add tracking information in the order details.')) {
            return;
        }

        const updateData = {
            status: 'shipped',
            notes: 'Order marked as shipped via quick action'
        };

        console.log(`🚚 Quick shipping order: ${orderId}`);

        const success = await updateOrderStatusInBackend(orderId, updateData);
        
        if (success) {
            showToast('Order marked as shipped!', 'success');
            
            // Refresh orders list
            setTimeout(async () => {
                try {
                    const orders = await loadOrdersFromBackend();
                    if (typeof initializeOrdersSearch === 'function') {
                        initializeOrdersSearch(orders);
                    }
                } catch (refreshError) {
                    console.error('Error refreshing orders:', refreshError);
                }
            }, 500);
        }
        
    } catch (error) {
        console.error('Error in quick ship order:', error);
        showToast('Failed to mark order as shipped', 'error');
    }
}

// ===== MISSING FUNCTIONS - ADD THESE =====

// ✅ Copy tracking number
function copyTrackingNumber(trackingNumber) {
    try {
        navigator.clipboard.writeText(trackingNumber);
        showToast('Tracking number copied to clipboard!', 'success');
    } catch (error) {
        console.error('Failed to copy tracking number:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = trackingNumber;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Tracking number copied!', 'success');
    }
}

// ✅ Settings tab navigation
function openSettingsTab(tabName, event) {
    try {
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(tab => tab.classList.remove('active'));
        
        // Remove active class from all tab links
        const tabLinks = document.querySelectorAll('.tab-link');
        tabLinks.forEach(link => link.classList.remove('active'));
        
        // Show selected tab content
        const selectedTab = document.getElementById(`${tabName}-tab`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Add active class to clicked tab link
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        }
    } catch (error) {
        console.error('Error switching settings tab:', error);
    }
}

// ✅ Edit shipping regions
function editShippingRegions() {
    showToast('Shipping regions editor coming soon!', 'info');
}

// ✅ Show add admin modal
function showAddAdminModal() {
    showToast('Add admin feature coming soon!', 'info');
}

// ✅ Prepare for Shipping - Opens tracking section and focuses inputs (FIXED)
function prepareForShipping(orderId) {
    try {
        // ✅ Find the Shipping & Tracking section safely
        const shippingSectionTitle = Array.from(
            document.querySelectorAll('.order-section h4')
        ).find(h4 => h4.textContent.includes('Shipping & Tracking'));

        if (shippingSectionTitle) {
            const section = shippingSectionTitle.closest('.order-section');

            // Smooth scroll
            section.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // Highlight effect
            section.style.boxShadow = '0 0 0 3px rgba(52, 152, 219, 0.35)';
            section.style.transition = 'box-shadow 0.3s ease';

            // Remove highlight after 3 seconds
            setTimeout(() => {
                section.style.boxShadow = '';
            }, 3000);
        }

        // ✅ Focus on tracking number input
        const trackingInput = document.getElementById('trackingNumberInput');
        if (trackingInput) {
            setTimeout(() => {
                trackingInput.focus();
                trackingInput.select();
            }, 400);
        }

        // ✅ Toast (2 params only — matches your showToast)
        showToast(
            'Select courier service, enter tracking number, then click "Mark as Shipped & Send Email"',
            'info'
        );

    } catch (error) {
        console.error('❌ Error preparing for shipping:', error);
        showToast('Failed to prepare shipping section', 'error');
    }
}

// ===== STILL MISSING FUNCTIONS - ADD THESE =====

// ✅ Close view modal
function closeViewModal() {
    const modal = document.getElementById('viewOrderModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ✅ Show section function
function showSection(sectionName) {
    console.log('Showing section:', sectionName);
    
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update active nav link
    const navLinks = document.querySelectorAll('.admin-nav a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(sectionName) || 
            link.getAttribute('href') === `#${sectionName}`) {
            link.classList.add('active');
        }
    });
    
    // Load section data if needed
    if (typeof loadSectionData === 'function') {
        loadSectionData(sectionName);
    }
}

// ✅ Print order function
function printOrder(orderId) {
    console.log('🖨️ Printing order:', orderId);
    // For now, trigger PDF download
    downloadAdminInvoice(orderId);
    showToast('Invoice downloaded. You can print the PDF.', 'info');
}

function hideNewOrderNotification() {
  const el = document.getElementById('newOrderNotification');
  if (el) el.style.display = 'none';
}


// ✅ Show toast notification (ONLY PLACE)
function showToast(message, type = "info") {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      z-index: 10000;
      display: none;
    `;
    document.body.appendChild(toast);
  }

  const colors = {
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8'
  };

  toast.style.backgroundColor = colors[type] || colors.info;
  toast.textContent = message;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

function showLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = show ? 'flex' : 'none';
  }
}

function filterOrdersByCustomer(customerId) {
  console.log('🔍 Filtering orders by customer:', customerId);

  const orders = window.adminState.allOrders || [];

  const customer = window.adminState.allCustomers?.find(c => c._id === customerId);
  const customerEmail = customer?.email;

  const filtered = orders.filter(o =>
    o.customerId === customerId ||
    o.userId === customerId ||
    o.customerEmail === customerEmail
  );

  window.adminState.filteredOrders = filtered;

  renderAllOrders(filtered); // use your real render function
}

function getCustomerEmailById(customerId) {
  const customer = window.adminState.allCustomers?.find(c => c._id === customerId);
  return customer?.email || null;
}

// ✅ Make sure to add these to window object too
window.closeViewModal = closeViewModal;
window.showSection = showSection;
window.printOrder = printOrder;

// ✅ Make them globally available
window.AccessibilityManager = AccessibilityManager;
window.ErrorHandler = ErrorHandler;
window.PerformanceOptimizer = PerformanceOptimizer;
window.renderOrderDetailsInModal = renderOrderDetailsInModal;
window.updateOrderStatus = updateOrderStatus;
window.quickStatusChange = quickStatusChange;
window.saveStatusChanges = saveStatusChanges;
window.downloadAdminInvoice = downloadAdminInvoice;
window.viewOrderDetails = viewOrderDetails;
window.currentOrderId = currentOrderId;
window.initializeOrdersSearch = initializeOrdersSearch;
window.renderAllOrders = renderAllOrders;
window.updateOrdersResultsCounter = updateOrdersResultsCounter;
window.quickUpdateStatus = quickUpdateStatus;
window.renderDashboardMetrics = renderDashboardMetrics;
window.initializeCustomersSearch = initializeCustomersSearch;
window.renderAllCustomers = renderAllCustomers;
window.updateCustomersResultsCounter = updateCustomersResultsCounter;
window.viewCustomerDetails = viewCustomerDetails;
window.viewCustomerOrders = viewCustomerOrders;
window.saveTrackingInfo = saveTrackingInfo;
window.openTrackingLink = openTrackingLink;
window.markAsShippedWithTracking = markAsShippedWithTracking;
window.quickShipOrder = quickShipOrder;
// ✅ Make sure to add these to window object
window.copyTrackingNumber = copyTrackingNumber;
window.openSettingsTab = openSettingsTab;
window.editShippingRegions = editShippingRegions;
window.showAddAdminModal = showAddAdminModal;
window.prepareForShipping = prepareForShipping;
window.hideNewOrderNotification = hideNewOrderNotification;
window.showToast = showToast;
window.showLoading = showLoading;

console.log('✅ Admin UI fully loaded with all functions!');