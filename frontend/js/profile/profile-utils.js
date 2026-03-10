// profile-utils.js
class ProfileUtils {
    constructor() {
        this.patterns = {
            phone: /^[6-9]\d{9}$/,
            pincode: /^\d{6}$/,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            name: /^[a-zA-Z\s]{2,50}$/,
            text: /^[a-zA-Z0-9\s\-,.#]{2,100}$/
        };
        
        this.messages = {
            phone: "Please enter a valid 10-digit phone number starting with 6-9",
            pincode: "Please enter a valid 6-digit pincode",
            email: "Please enter a valid email address",
            name: "Name should be 2-50 characters with letters and spaces only",
            text: "Please enter valid text (2-100 characters)",
            required: "This field is required"
        };
    }

    validateField(value, type, isRequired = true) {
        if (isRequired && (!value || value.trim() === '')) {
            return { isValid: false, message: this.messages.required };
        }

        if (!isRequired && (!value || value.trim() === '')) {
            return { isValid: true, message: '' };
        }

        if (type && this.patterns[type] && !this.patterns[type].test(value)) {
            return { isValid: false, message: this.messages[type] };
        }

        return { isValid: true, message: '' };
    }

    validateFormInput(input, type, isRequired = true) {
        const validation = this.validateField(input.value, type, isRequired);
        
        // Remove existing error messages
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) existingError.remove();

        // Remove existing validation classes
        input.classList.remove('input-error', 'input-success');

        if (!validation.isValid) {
            input.classList.add('input-error');
            const errorElement = document.createElement('span');
            errorElement.className = 'error-message';
            errorElement.textContent = validation.message;
            input.parentNode.appendChild(errorElement);
            return false;
        } else {
            input.classList.add('input-success');
            return true;
        }
    }

    waitForElement(selector, callback, maxAttempts = 30, interval = 100) {
        let attempts = 0;
        const checkElement = setInterval(() => {
            let element;
            
            if (selector.startsWith('#')) {
                element = document.getElementById(selector.substring(1));
            } else if (selector.startsWith('.')) {
                element = document.querySelector(selector);
            } else {
                element = document.querySelector(selector);
            }
            
            if (element) {
                clearInterval(checkElement);
                callback(element);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkElement);
                console.warn(`Element "${selector}" not found after ${maxAttempts} attempts`);
                if (callback) callback(null);
            }
            attempts++;
        }, interval);
    }

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

    showTopToast(message, type = 'info') {
        const toast = document.getElementById("top-toast");
        if (!toast) {
            console.warn('Toast element not found');
            return;
        }

        toast.classList.remove('error', 'success', 'info');
        if (type !== 'info') toast.classList.add(type);
        toast.textContent = message;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }

    createEmptyOrderStructure() {
        return {
            orderId: `ORD-${Date.now()}`,
            id: `ORD-${Date.now()}`,
            userId: 'guest',
            date: new Date().toISOString(),
            status: 'Processing',
            paymentStatus: 'Paid',
            paymentMethod: 'bank',
            contact: { name: 'Customer', email: '', phone: '' },
            billingAddress: {},
            shippingAddress: {},
            items: [],
            totals: { originalSubtotal: 0, netSubtotal: 0, shipping: 0, discount: 0, total: 0 },
            shippingRegion: '',
            discountCode: ''
        };
    }

    normalizeOrderStructure(order) {
        if (!order || typeof order !== 'object') {
            console.warn('NormalizeOrderStructure: Received invalid order:', order);
            return this.createEmptyOrderStructure();
        }
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const apiOrder = order.order || order;
        
        return {
            orderId: apiOrder.orderId || apiOrder.id || apiOrder._id || `ORD-${Date.now()}`,
            id: apiOrder.orderId || apiOrder.id || apiOrder._id || `ORD-${Date.now()}`,
            userId: apiOrder.userId || 
                    apiOrder.userEmail || 
                    (apiOrder.contact && apiOrder.contact.email) || 
                    currentUser.email || 
                    'guest',
            date: apiOrder.date || apiOrder.createdAt || apiOrder.orderDate || new Date().toISOString(),
            status: (apiOrder.status || 'Processing').toLowerCase(),
            paymentStatus: (apiOrder.paymentStatus || apiOrder.payment_status || 'Paid').toLowerCase(),
            paymentMethod: apiOrder.paymentMethod || 'bank',
            contact: apiOrder.contact || {
                name: apiOrder.customerName || currentUser.name || 'Customer',
                email: apiOrder.customerEmail || currentUser.email || '',
                phone: apiOrder.customerPhone || currentUser.phone || ''
            },
            billingAddress: apiOrder.billingAddress || apiOrder.billing || {},
            shippingAddress: apiOrder.shippingAddress || apiOrder.shipping || apiOrder.deliveryAddress || {},
            items: Array.isArray(apiOrder.items) ? apiOrder.items : 
                   Array.isArray(apiOrder.products) ? apiOrder.products : 
                   [],
            totals: apiOrder.totals || apiOrder.summary || this.calculateOrderTotals(apiOrder)
        };
    }

    calculateOrderTotals(order) {
        const items = Array.isArray(order.items) ? order.items : [];
        
        if (order.totals && typeof order.totals === 'object') {
            return {
                originalSubtotal: order.totals.originalSubtotal || 0,
                netSubtotal: order.totals.netSubtotal || order.totals.subtotal || 0,
                discount: order.totals.discount || 0,
                shipping: order.totals.shipping || order.shipping || 0,
                total: order.totals.total || order.total || 0
            };
        }
        
        // Calculate from items
        const originalSubtotal = items.reduce((sum, item) => {
            const mrp = Number(item.originalPrice ?? item.mrp ?? item.price ?? 0);
            const qty = Number(item.quantity ?? 1);
            return sum + (mrp * qty);
        }, 0);

        const netSubtotal = items.reduce((sum, item) => {
            const selling = Number(item.price ?? item.sellingPrice ?? 0);
            const qty = Number(item.quantity ?? 1);
            return sum + (selling * qty);
        }, 0);

        const discount = Math.max(0, originalSubtotal - netSubtotal);
        const shipping = Number(order.shipping ?? 0);
        const total = netSubtotal + shipping;

        return {
            originalSubtotal: Number(originalSubtotal.toFixed(2)),
            netSubtotal: Number(netSubtotal.toFixed(2)),
            discount: Number(discount.toFixed(2)),
            shipping: Number(shipping.toFixed(2)),
            total: Number(total.toFixed(2))
        };
    }
}

// Export as global
window.ProfileUtils = new ProfileUtils();