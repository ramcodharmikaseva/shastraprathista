console.log("✅ Admin utilities loaded");

// Remove all cache-related variables and functions
// Only keep validation, formatting, and utility functions

// Input validation for admin actions
function validateAdminAction(action, data) {
    const validActions = ['delete', 'update', 'export', 'bulk_delete', 'status_change'];

    if (!validActions.includes(action)) {
        console.error('Invalid admin action:', action);
        return false;
    }
  
    // Validate based on action type
    switch(action) {
        case 'delete':
            if (!data.orderId || typeof data.orderId !== 'string') {
                console.error('Invalid order ID for deletion');
                return false;
            }
            break;
          
        case 'update':
            if (!data.orderId || !data.field || !data.value) {
                console.error('Invalid update data');
                return false;
            }
            break;
          
        case 'bulk_delete':
            if (!Array.isArray(data.orderIds) || data.orderIds.length === 0) {
                console.error('Invalid bulk delete data');
                return false;
            }
            break;
          
        case 'status_change':
            const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
            if (!data.orderId || !validStatuses.includes(data.status)) {
                console.error('Invalid status change data');
                return false;
            }
            break;
    }
  
    return true;
}

// Enhanced error handling
function withErrorHandling(fn, errorMessage = 'An error occurred') {
    return async function(...args) {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            console.error(`${errorMessage}:`, error);
            showToast(errorMessage, 'error');
            return null;
        }
    };
}

function setupGlobalErrorHandling() {
    // Handle uncaught errors
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.error);
        showToast('An unexpected error occurred', 'error');
    });
    
    // Handle promise rejections
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled promise rejection:', e.reason);
        showToast('An unexpected error occurred', 'error');
        e.preventDefault();
    });
}

// Input sanitization
function sanitizeInput(input) {
    if (input === null || input === undefined) return '';
    
    // Convert to string
    let str = String(input);
    
    // Remove potentially dangerous characters
    const dangerousChars = /[<>"'`]/g;
    str = str.replace(dangerousChars, '');
    
    // Trim whitespace
    str = str.trim();
    
    return str;
}

function sanitizeForHTML(input) {
    const div = document.createElement('div');
    div.textContent = sanitizeInput(input);
    return div.innerHTML;
}

function sanitizeForCSV(input) {
    let str = sanitizeInput(input);
    // Escape quotes for CSV
    str = str.replace(/"/g, '""');
    // Wrap in quotes if contains comma
    if (str.includes(',')) {
        str = `"${str}"`;
    }
    return str;
}

// Validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(sanitizeInput(email));
}

function validatePhone(phone) {
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    return phoneRegex.test(sanitizeInput(phone));
}

function validateOrderId(orderId) {
    return /^[0-9a-fA-F]{24}$/.test(sanitizeInput(orderId));
}

function validateOrderData(order) {
    if (!order) return false;
    
    const requiredFields = ['orderId', 'customerEmail', 'items'];
    for (const field of requiredFields) {
        if (!order[field]) {
            console.warn(`Invalid order: missing ${field}`, order);
            return false;
        }
    }
    
    if (!Array.isArray(order.items) || order.items.length === 0) {
        console.warn('Invalid order: empty items', order);
        return false;
    }
    
    return true;
}

// Debounce function for search input
function debounce(func, wait) {
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

// Helper functions
function getRegionName(regionCode) {
    const regions = {
        'south': 'South India',
        'north': 'North India',
        'east': 'East India',
        'west': 'West India',
        'ne': 'Northeast India',
        'other_country': 'Other Country'
    };
    return regions[regionCode] || regionCode;
}

function refreshAllData() {
    console.log('🔄 Refreshing all data...');
    
    if (typeof refreshDashboardData === 'function') {
        refreshDashboardData();
        showToast('Data refreshed successfully', 'success');
    } else {
        console.warn('refreshDashboardData not available');
    }
}

function formatAddressForDisplay(addressData, contactInfo) {
    if (!addressData) {
        return '<div style="color: #6c757d;"><em>No address information available</em></div>';
    }
    
    const name = sanitizeInput(addressData.name || contactInfo?.name || '');
    const address = sanitizeInput(addressData.address || '');
    const city = sanitizeInput(addressData.city || '');
    const district = sanitizeInput(addressData.district || '');
    const state = sanitizeInput(addressData.state || '');
    const pincode = sanitizeInput(addressData.pincode || '');
    const country = sanitizeInput(addressData.country || 'India');
    const phone = sanitizeInput(addressData.phone || contactInfo?.phone || '');
    
    let addressHTML = '';
    if (name) addressHTML += `<div><strong>Name:</strong> ${name}</div>`;
    if (address) addressHTML += `<div><strong>Address:</strong> ${address}</div>`;
    if (city || district) {
        addressHTML += `<div><strong>City/District:</strong> ${city}${city && district ? ', ' : ''}${district}</div>`;
    }
    if (state || pincode) {
        addressHTML += `<div><strong>State/Pincode:</strong> ${state}${state && pincode ? ' - ' : ''}${pincode}</div>`;
    }
    if (country) addressHTML += `<div><strong>Country:</strong> ${country}</div>`;
    if (phone) addressHTML += `<div><strong>Phone:</strong> ${phone}</div>`;
    
    return addressHTML || '<div style="color: #6c757d;"><em>Incomplete address information</em></div>';
}

// Status color mapping
function getStatusColor(status) {
    const colors = {
        'pending': '#ffc107',
        'confirmed': '#17a2b8', 
        'processing': '#007bff',
        'shipped': '#6f42c1',
        'delivered': '#28a745',
        'cancelled': '#dc3545',
        'returned': '#fd7e14'
    };
    return colors[status] || '#6c757d';
}

// Date formatting
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'Invalid Date';
    }
}

// Currency formatting
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '₹0.00';
    }
    
    return `₹${parseFloat(amount).toFixed(2)}`;
}

// Search and filter utilities
function filterOrders(orders, searchTerm, statusFilter, dateFilter) {
    if (!Array.isArray(orders)) return [];
    
    return orders.filter(order => {
        // Search term filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesSearch = 
                (order.orderId && order.orderId.toLowerCase().includes(term)) ||
                (order.customerName && order.customerName.toLowerCase().includes(term)) ||
                (order.customerEmail && order.customerEmail.toLowerCase().includes(term)) ||
                (order.customerPhone && order.customerPhone.includes(term));
            
            if (!matchesSearch) return false;
        }
        
        // Status filter
        if (statusFilter && statusFilter !== 'all') {
            if (order.status !== statusFilter) return false;
        }
        
        // Date filter (simplified - you can enhance this)
        if (dateFilter && dateFilter.from && dateFilter.to) {
            const orderDate = new Date(order.createdAt || order.date);
            const fromDate = new Date(dateFilter.from);
            const toDate = new Date(dateFilter.to);
            
            if (orderDate < fromDate || orderDate > toDate) return false;
        }
        
        return true;
    });
}

// Pagination utilities
function paginateItems(items, currentPage, itemsPerPage) {
    if (!Array.isArray(items)) return { items: [], totalPages: 0, totalItems: 0, currentPage: 1 };
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
        items: items.slice(startIndex, endIndex),
        totalPages: Math.ceil(items.length / itemsPerPage),
        totalItems: items.length,
        currentPage: currentPage
    };
}

// Export data utilities
function exportToCSV(data, headers, filename) {
    if (!Array.isArray(data) || data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    const csvHeaders = headers.join(',');
    const csvRows = data.map(item =>
        headers.map(header => {
            // header -> use key or header string mapping if necessary
            const value = item[header] !== undefined ? item[header] : '';
            return sanitizeForCSV(value);
        }).join(',')
    );

    const csvContent = [csvHeaders, ...csvRows].join('\n');
    downloadCSV(csvContent, filename);
    showToast(`Exported ${data.length} records`, 'success');
}

// ✅ FINAL FIX: Use data URLs instead of blob URLs
function downloadCSV(csvContent, filename) {
    const finalFilename = filename || `Order CSV.csv`;
    
    // Add BOM for UTF-8
    const bom = '\uFEFF';
    const content = bom + csvContent;
    
    // Create data URL (not blob URL)
    const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
    
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = finalFilename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`📥 Downloaded: ${finalFilename}`);
}

// Initialize utilities when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupGlobalErrorHandling();
    console.log('✅ Admin utilities initialized');
});

Object.assign(window, {
    validateAdminAction,
    sanitizeInput,
    sanitizeForHTML,
    sanitizeForCSV,
    validateEmail,
    validatePhone,
    validateOrderId,
    validateOrderData,
    debounce,
    withErrorHandling,
    getRegionName,
    formatDate,
    formatCurrency,
    getStatusColor,
    filterOrders,
    paginateItems,
    exportToCSV,
    refreshAllData,
    downloadCSV
});
