console.log('🎨 Admin UI loading...');

// ============ 🏪 NEW POS SYSTEM (Using posModal from HTML) ============
// POS Global Variables
let posCart = [];
let posProducts = [];

// Open POS Modal
function openPOSModal() {
    console.log('🔄 Opening POS Modal...');
    const modal = document.getElementById('posModal');
    if (modal) {
        modal.style.display = 'flex';
        // Load products when modal opens
        loadPOSProducts();
        // Reset cart
        clearPOSCart();
        
        // Reset customer fields
        const nameInput = document.getElementById('posCustomerName');
        const phoneInput = document.getElementById('posCustomerPhone');
        const emailInput = document.getElementById('posCustomerEmail');
        const addressInput = document.getElementById('posCustomerAddress');
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (emailInput) emailInput.value = '';
        if (addressInput) addressInput.value = '';
        
        // Reset discount/shipping fields
        const discountValue = document.getElementById('posDiscountValue');
        const shippingValue = document.getElementById('posShipping');
        if (discountValue) discountValue.value = '0';
        if (shippingValue) shippingValue.value = '0';
        
        // Reset discount type to percentage
        const percentageRadio = document.querySelector('input[name="discountType"][value="percentage"]');
        if (percentageRadio) percentageRadio.checked = true;
        
        // Update totals
        updatePOSTotals();
    } else {
        console.error('❌ POS Modal not found!');
        showToast('POS system error: Modal not found', 'error');
    }
}

// Close POS Modal
function closePOSModal() {
    const modal = document.getElementById('posModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Load POS Products
async function loadPOSProducts() {
    try {
        showLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/books', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        posProducts = await response.json();
        renderPOSProducts(posProducts);
        showLoading(false);
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Failed to load products', 'error');
        showLoading(false);
    }
}

// Render Products in POS Grid
function renderPOSProducts(products) {
    const container = document.getElementById('posProductsList');
    if (!container) return;
    
    if (!products || products.length === 0) {
        container.innerHTML = '<div class="empty-state">No products found</div>';
        return;
    }
    
    container.innerHTML = products.map(p => `
        <div class="pos-product-card" onclick="addToPOSCart('${p._id}')">
            <div class="pos-product-name">${escapeHtml(p.title || p.name)}</div>
            <div class="pos-product-price">₹${parseFloat(p.price).toFixed(2)}</div>
            <div class="pos-product-stock">Stock: ${p.stock || 0}</div>
        </div>
    `).join('');
}

// Search Products in POS
function setupPOSSearch() {
    const searchInput = document.getElementById('posSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const search = e.target.value.toLowerCase();
            if (!posProducts) return;
            const filtered = posProducts.filter(p => 
                (p.title || p.name).toLowerCase().includes(search) || 
                (p.sku && p.sku.toLowerCase().includes(search))
            );
            renderPOSProducts(filtered);
        });
    }
}

// Add to Cart
function addToPOSCart(productId) {
    const product = posProducts.find(p => p._id === productId);
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }
    
    if (product.stock <= 0) {
        showToast('Out of stock!', 'error');
        return;
    }
    
    const existing = posCart.find(item => item.productId === productId);
    if (existing) {
        if (existing.quantity + 1 > product.stock) {
            showToast(`Only ${product.stock} available!`, 'error');
            return;
        }
        existing.quantity++;
        existing.total = existing.quantity * existing.price;
    } else {
        posCart.push({
            productId: product._id,
            name: product.title || product.name,
            price: product.price,
            quantity: 1,
            total: product.price,
            stock: product.stock
        });
    }
    renderPOSCart();
}

// Render Cart
function renderPOSCart() {
    const container = document.getElementById('posCartItems');
    if (!container) return;
    
    if (posCart.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:2rem;">No items in cart</div>';
        updatePOSTotals();
        return;
    }
    
    container.innerHTML = posCart.map((item, idx) => `
        <div class="pos-cart-item">
            <div class="pos-cart-item-info">
                <div class="pos-cart-item-name">${escapeHtml(item.name)}</div>
                <div class="pos-cart-item-price">₹${item.price} × ${item.quantity}</div>
            </div>
            <div class="pos-cart-item-actions">
                <button onclick="updatePOSQty(${idx}, ${item.quantity - 1})" style="background:#e2e8f0;border:none;width:24px;border-radius:4px;cursor:pointer;">-</button>
                <input type="number" class="pos-cart-item-qty" value="${item.quantity}" 
                       onchange="updatePOSQty(${idx}, parseInt(this.value))" min="1" max="${item.stock}">
                <button onclick="updatePOSQty(${idx}, ${item.quantity + 1})" style="background:#e2e8f0;border:none;width:24px;border-radius:4px;cursor:pointer;">+</button>
                <button class="pos-cart-item-remove" onclick="removePOSItem(${idx})">✕</button>
            </div>
            <div class="pos-cart-item-total">₹${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('');
    
    updatePOSTotals();
}

// Update Quantity
function updatePOSQty(index, newQty) {
    if (newQty < 1) {
        removePOSItem(index);
        return;
    }
    const item = posCart[index];
    if (newQty > item.stock) {
        showToast(`Only ${item.stock} in stock`, 'error');
        return;
    }
    item.quantity = newQty;
    item.total = item.price * newQty;
    renderPOSCart();
}

// Remove Item
function removePOSItem(index) {
    posCart.splice(index, 1);
    renderPOSCart();
}

// Clear Cart
function clearPOSCart() {
    if (confirm('Clear entire cart?')) {
        posCart = [];
        renderPOSCart();
    }
}

// Update Totals
function updatePOSTotals() {
    const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountType = document.querySelector('input[name="discountType"]:checked')?.value;
    const discountValue = parseFloat(document.getElementById('posDiscountValue')?.value) || 0;
    const shipping = parseFloat(document.getElementById('posShipping')?.value) || 0;
    
    let discountAmount = 0;
    if (discountType === 'percentage') {
        discountAmount = (subtotal * discountValue) / 100;
    } else if (discountType === 'fixed') {
        discountAmount = Math.min(discountValue, subtotal);
    }
    
    const total = subtotal - discountAmount + shipping;
    
    const subtotalEl = document.getElementById('posSubtotal');
    const discountAmountEl = document.getElementById('posDiscountAmount');
    const shippingAmountEl = document.getElementById('posShippingAmount');
    const totalEl = document.getElementById('posTotal');
    
    if (subtotalEl) subtotalEl.innerText = `₹${subtotal.toFixed(2)}`;
    if (discountAmountEl) discountAmountEl.innerText = `-₹${discountAmount.toFixed(2)}`;
    if (shippingAmountEl) shippingAmountEl.innerText = `₹${shipping.toFixed(2)}`;
    if (totalEl) totalEl.innerText = `₹${total.toFixed(2)}`;
}

// Process POS Sale - Now reads customer info from the POS page
async function processPOSSale() {
    if (posCart.length === 0) {
        showToast('Cart is empty', 'error');
        return;
    }
    
    // Get customer details from the POS page fields
    const customerName = document.getElementById('posCustomerName')?.value.trim();
    const customerPhone = document.getElementById('posCustomerPhone')?.value.trim();
    const customerEmail = document.getElementById('posCustomerEmail')?.value.trim();
    const customerAddress = document.getElementById('posCustomerAddress')?.value.trim();
    
    // Validate required fields
    if (!customerName) {
        showToast('Please enter customer name', 'error');
        document.getElementById('posCustomerName')?.focus();
        return;
    }
    
    if (!customerPhone) {
        showToast('Please enter phone number', 'error');
        document.getElementById('posCustomerPhone')?.focus();
        return;
    }
    
    // Validate phone number (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(customerPhone)) {
        showToast('Please enter a valid 10-digit mobile number', 'error');
        document.getElementById('posCustomerPhone')?.focus();
        return;
    }
    
    const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountType = document.querySelector('input[name="discountType"]:checked')?.value;
    const discountValue = parseFloat(document.getElementById('posDiscountValue')?.value) || 0;
    const shipping = parseFloat(document.getElementById('posShipping')?.value) || 0;
    
    let discountAmount = 0;
    if (discountType === 'percentage') {
        discountAmount = (subtotal * discountValue) / 100;
    } else if (discountType === 'fixed') {
        discountAmount = Math.min(discountValue, subtotal);
    }
    
    const total = subtotal - discountAmount + shipping;
    
    // Generate receipt number
    const receiptNumber = generateReceiptNumber();
    
    // Show confirmation dialog
    const confirmMsg = `📋 ORDER SUMMARY\n\n` +
        `Receipt No: ${receiptNumber}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Customer: ${customerName}\n` +
        `Phone: ${customerPhone}\n` +
        `${customerAddress ? `Address: ${customerAddress}\n` : ''}` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Items: ${posCart.length}\n` +
        `Subtotal: ₹${subtotal.toFixed(2)}\n` +
        `${discountAmount > 0 ? `Discount: -₹${discountAmount.toFixed(2)}\n` : ''}` +
        `${shipping > 0 ? `Shipping: ₹${shipping.toFixed(2)}\n` : ''}` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `TOTAL: ₹${total.toFixed(2)}\n\n` +
        `Confirm sale?`;
    
    if (!confirm(confirmMsg)) return;
    
    try {
        showLoading(true);
        const token = localStorage.getItem('token');
        
        const orderData = {
            source: 'counter',
            receiptNumber: receiptNumber,
            customerName: customerName,
            customerPhone: customerPhone,
            customerEmail: customerEmail || '',
            customerAddress: customerAddress || '',
            items: posCart.map(item => ({
                id: item.productId,
                title: item.name,
                quantity: item.quantity,
                price: item.price,
                itemTotal: item.price * item.quantity
            })),
            totals: {
                subtotal: subtotal,
                discount: discountAmount,
                shipping: shipping,
                tax: 0,
                total: total
            },
            paymentMethod: 'cash',
            paymentStatus: 'paid',
            status: 'completed'
        };
        
        const response = await fetch('/api/orders/counter-sale', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Sale completed successfully!', 'success');
            
            // Print receipt
            printPOSReceipt({
                receiptNumber: receiptNumber,
                orderId: result.orderId,
                customerName: customerName,
                customerPhone: customerPhone,
                customerEmail: customerEmail,
                customerAddress: customerAddress,
                items: posCart,
                subtotal: subtotal,
                discount: discountAmount,
                shipping: shipping,
                total: total
            });
            
            // Reset everything
            clearPOSCart();
            
            // Reset customer fields
            const nameInput = document.getElementById('posCustomerName');
            const phoneInput = document.getElementById('posCustomerPhone');
            const emailInput = document.getElementById('posCustomerEmail');
            const addressInput = document.getElementById('posCustomerAddress');
            
            if (nameInput) nameInput.value = '';
            if (phoneInput) phoneInput.value = '';
            if (emailInput) emailInput.value = '';
            if (addressInput) addressInput.value = '';
            
            // Reset discount/shipping
            const discountValueInput = document.getElementById('posDiscountValue');
            const shippingInput = document.getElementById('posShipping');
            if (discountValueInput) discountValueInput.value = '0';
            if (shippingInput) shippingInput.value = '0';
            
            // Reset discount type to percentage
            const percentageRadio = document.querySelector('input[name="discountType"][value="percentage"]');
            if (percentageRadio) percentageRadio.checked = true;
            
            closePOSModal();
            loadPOSProducts(); // Refresh stock display
            
            // Refresh orders list
            if (typeof loadOrdersFromBackend === 'function') {
                const orders = await loadOrdersFromBackend();
                if (typeof initializeOrdersSearch === 'function') {
                    initializeOrdersSearch(orders);
                }
            }
        } else {
            showToast('Error: ' + (result.error || 'Unknown error'), 'error');
        }
        showLoading(false);
    } catch (error) {
        console.error('POS sale error:', error);
        showToast('Failed to process sale', 'error');
        showLoading(false);
    }
}

// Generate Receipt Number (SLR-2026-27/001 format)
function generateReceiptNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // Financial year: April to March
    let financialYearStart, financialYearEnd;
    if (month >= 4) {
        financialYearStart = year;
        financialYearEnd = year + 1;
    } else {
        financialYearStart = year - 1;
        financialYearEnd = year;
    }
    
    // Get counter from localStorage
    let counter = localStorage.getItem(`receipt_counter_${financialYearStart}`);
    if (!counter) {
        counter = 1;
    } else {
        counter = parseInt(counter) + 1;
    }
    
    // Save counter
    localStorage.setItem(`receipt_counter_${financialYearStart}`, counter);
    
    // Format: SLR-2026-27/001
    const receiptNumber = `SLR-${financialYearStart}-${financialYearEnd.toString().slice(-2)}/${counter.toString().padStart(3, '0')}`;
    
    return receiptNumber;
}

// Print Receipt with Professional Header (matching online invoice)
function printPOSReceipt(data) {
    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    if (!receiptWindow) return;
    
    receiptWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - ${data.receiptNumber}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Courier New', monospace;
                    padding: 20px;
                    font-size: 11px;
                    line-height: 1.4;
                    color: #000;
                }
                .header {
                    text-align: center;
                    margin-bottom: 15px;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #000;
                }
                .trust-name {
                    font-size: 14px;
                    font-weight: bold;
                    color: #8B0000;
                    letter-spacing: 1px;
                    margin-bottom: 3px;
                }
                .subtitle {
                    font-size: 11px;
                    font-style: italic;
                    font-weight: bold;
                    color: #0000FF;
                    margin-bottom: 8px;
                }
                .address {
                    font-size: 9px;
                    margin-bottom: 3px;
                }
                .receipt-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 10px 0;
                    text-align: center;
                    letter-spacing: 2px;
                }
                .receipt-no {
                    text-align: center;
                    font-size: 10px;
                    font-weight: bold;
                    margin: 5px 0;
                    padding: 3px;
                    background: #f0f0f0;
                }
                .divider {
                    border-top: 1px dashed #000;
                    margin: 8px 0;
                }
                .divider-solid {
                    border-top: 1px solid #000;
                    margin: 8px 0;
                }
                .customer-info {
                    margin: 10px 0;
                    padding: 8px;
                    background: #f9f9f9;
                    border: 1px solid #ddd;
                    font-size: 9px;
                }
                .customer-info strong {
                    font-size: 10px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 10px 0;
                }
                th, td {
                    text-align: left;
                    padding: 5px 3px;
                    border-bottom: 1px dotted #ccc;
                }
                th {
                    font-weight: bold;
                    background: #f5f5f5;
                    font-size: 9px;
                }
                .text-right {
                    text-align: right;
                }
                .text-center {
                    text-align: center;
                }
                .total-row {
                    font-weight: bold;
                    font-size: 11px;
                    margin-top: 5px;
                }
                .grand-total {
                    font-size: 12px;
                    font-weight: bold;
                    border-top: 2px solid #000;
                    padding-top: 5px;
                    margin-top: 5px;
                }
                .footer {
                    text-align: center;
                    margin-top: 15px;
                    padding-top: 8px;
                    border-top: 1px solid #000;
                    font-size: 9px;
                }
                .signature {
                    margin-top: 20px;
                    display: flex;
                    justify-content: space-between;
                }
                @media print {
                    body {
                        padding: 10px;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <!-- Header Section - Matching Online Invoice -->
            <div class="header">
                <div class="trust-name">SMT LINGAMMAL RAMARAJU SHASTRAPRATHISTA TRUST</div>
                <div class="subtitle">"RAMCO DHARMIKA SEVA"</div>
                <div class="address">No.1, P.A.C. Ramasamy Raja Road, Rajapalayam - 626 117,</div>
                <div class="address">Tamilnadu, India.</div>
                <div class="address">email: shastraprathista@gmail.com | Mob: 88704 12345</div>
            </div>
            
            <div class="receipt-title">CASH SALE RECEIPT</div>
            <div class="receipt-no">Receipt No: ${data.receiptNumber}</div>
            <div class="text-center" style="font-size: 9px; margin-bottom: 5px;">Date: ${new Date().toLocaleString()}</div>
            
            <div class="divider-solid"></div>
            
            <!-- Customer Information -->
            <div class="customer-info">
                <strong>Customer Details:</strong><br>
                Name: ${escapeHtml(data.customerName)}<br>
                Phone: ${data.customerPhone}<br>
                ${data.customerEmail ? `Email: ${escapeHtml(data.customerEmail)}<br>` : ''}
                ${data.customerAddress ? `Address: ${escapeHtml(data.customerAddress)}<br>` : ''}
            </div>
            
            <div class="divider"></div>
            
            <!-- Items Table -->
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Item</th>
                        <th class="text-right">Qty</th>
                        <th class="text-right">Price</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.items.map((item, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${escapeHtml(item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name)}</td>
                            <td class="text-right">${item.quantity}</td>
                            <td class="text-right">₹${item.price.toFixed(2)}</td>
                            <td class="text-right">₹${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="divider"></div>
            
            <!-- Totals Section -->
            <div style="margin-top: 5px;">
                <div style="display: flex; justify-content: space-between; font-size: 10px;">
                    <span>Subtotal:</span>
                    <span>₹${data.subtotal.toFixed(2)}</span>
                </div>
                ${data.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: #d32f2f;">
                    <span>Discount:</span>
                    <span>-₹${data.discount.toFixed(2)}</span>
                </div>
                ` : ''}
                ${data.shipping > 0 ? `
                <div style="display: flex; justify-content: space-between; font-size: 10px;">
                    <span>Shipping:</span>
                    <span>₹${data.shipping.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="divider" style="margin: 5px 0;"></div>
                <div class="total-row" style="display: flex; justify-content: space-between;">
                    <span>GRAND TOTAL:</span>
                    <span>₹${data.total.toFixed(2)}</span>
                </div>
            </div>
            
            <div class="divider-solid"></div>
            
            <!-- Payment Details -->
            <div style="margin: 8px 0; font-size: 9px;">
                <strong>Payment Mode:</strong> Cash<br>
                <strong>Status:</strong> Paid ✓
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <div>Thank you for your purchase!</div>
                <div style="font-size: 8px; margin-top: 3px;">Books HSN - 4901 (GST Exempt)</div>
                <div style="font-size: 8px; margin-top: 3px;">www.shastraprathista.in</div>
            </div>
            
            <!-- Signature Lines -->
            <div class="signature">
                <div style="font-size: 9px;">Customer Signature</div>
                <div style="font-size: 9px;">Authorized Signatory</div>
            </div>
            
            <!-- Print Instructions -->
            <div class="no-print" style="text-align: center; margin-top: 20px; padding: 10px; background: #f0f0f0;">
                <button onclick="window.print()" style="padding: 5px 15px; margin: 5px; cursor: pointer;">🖨️ Print Receipt</button>
                <button onclick="window.close()" style="padding: 5px 15px; margin: 5px; cursor: pointer;">✖️ Close</button>
            </div>
            
            <script>
                // Auto-print when loaded
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);
}

// Escape HTML helper (make sure this exists)
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Phone number validation (only digits, max 10)
function setupPhoneValidation() {
    const phoneInput = document.getElementById('posCustomerPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
        });
    }
}

// Setup event listeners for POS modal
document.addEventListener('DOMContentLoaded', function() {
    // Connect the counter sale button
    const counterSaleBtn = document.getElementById('newCounterSaleBtn');
    if (counterSaleBtn) {
        // Remove any existing listeners and set new one
        counterSaleBtn.onclick = function(e) {
            e.preventDefault();
            openPOSModal();
        };
        console.log('✅ Counter sale button connected to posModal');
    } else {
        console.log('⚠️ Counter sale button not found');
    }
    
    // Setup POS search
    setupPOSSearch();
    
    // Setup phone validation
    setupPhoneValidation();
    
    // Setup discount/shipping listeners
    const discountValue = document.getElementById('posDiscountValue');
    const shippingValue = document.getElementById('posShipping');
    const discountRadios = document.querySelectorAll('input[name="discountType"]');
    
    if (discountValue) {
        discountValue.addEventListener('input', updatePOSTotals);
    }
    if (shippingValue) {
        shippingValue.addEventListener('input', updatePOSTotals);
    }
    discountRadios.forEach(radio => {
        radio.addEventListener('change', updatePOSTotals);
    });
    
    // Close modal when clicking outside
    const modal = document.getElementById('posModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closePOSModal();
            }
        });
    }
    
    console.log('✅ POS event listeners initialized');
});

// ============ END POS SYSTEM FIX ============

// ============ 🏪 COUNTER ORDERS MANAGEMENT ============

// Load counter orders
async function loadCounterOrders(filter = 'all') {
    try {
        showLoading(true);
        const token = localStorage.getItem('token');
        
        let url = '/api/orders/counter-orders';
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        console.log('🔥 loadCounterOrders response:', result);
        
        if (result.success) {
            // Update summary cards
            const revenueEl = document.getElementById('counterTotalRevenue');
            const ordersEl = document.getElementById('counterTotalOrders');
            const itemsEl = document.getElementById('counterTotalItems');
            
            if (revenueEl) revenueEl.innerText = `₹${result.totalRevenue.toFixed(2)}`;
            if (ordersEl) ordersEl.innerText = result.total;
            if (itemsEl) itemsEl.innerText = result.totalItems;
            
            // Filter orders based on selection
            let filteredOrders = result.orders;
            if (filter !== 'all') {
                const now = new Date();
                filteredOrders = result.orders.filter(order => {
                    const orderDate = new Date(order.createdAt);
                    if (filter === 'today') {
                        return orderDate.toDateString() === now.toDateString();
                    } else if (filter === 'week') {
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return orderDate >= weekAgo;
                    } else if (filter === 'month') {
                        const monthAgo = new Date();
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        return orderDate >= monthAgo;
                    }
                    return true;
                });
            }
            
            console.log('📊 Filtered orders count:', filteredOrders.length);
            renderCounterOrders(filteredOrders);
        } else {
            showToast('Failed to load counter orders', 'error');
        }
        showLoading(false);
    } catch (error) {
        console.error('Error loading counter orders:', error);
        showToast('Failed to load counter orders', 'error');
        showLoading(false);
    }
}

// Render counter orders table
function renderCounterOrders(orders) {
    const tbody = document.getElementById('counterOrdersBody');
    if (!tbody) {
        console.error('❌ counterOrdersBody element not found');
        return;
    }
    
    console.log('📋 Rendering counter orders:', orders ? orders.length : 0);
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <div>No counter orders found</div>
                    <small>Create a counter sale to see orders here</small>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort orders by date (newest first)
    const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    tbody.innerHTML = sortedOrders.map(order => {
        // Debug each order
        console.log('Rendering order:', order.orderId, 'Receipt:', order.receiptNumber);
        
        const formattedDate = new Date(order.createdAt).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <tr>
                <td><strong>${order.receiptNumber || order.orderId}</strong></td>
                <td>${escapeHtml(order.customerName || 'Unknown')}</td>
                <td>${order.customerPhone || '-'}</td>
                <td>${formattedDate}</td>
                <td>${order.items?.length || 0} item(s)</td>
                <td><strong>₹${(order.totals?.total || 0).toFixed(2)}</strong></td>
                <td><span class="status-badge status-paid">${order.paymentMethod?.toUpperCase() || 'CASH'}</span></td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-sm btn-primary" onclick="viewCounterOrder('${order._id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-sm btn-info" onclick="reprintCounterReceipt('${order._id}')">
                            <i class="fas fa-print"></i> Reprint
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    console.log('✅ Counter orders rendered successfully, rows:', sortedOrders.length);
}

// View counter order details - NEW RECEIPT STYLE VIEW
async function viewCounterOrder(orderId) {
    // Call the new receipt-style detail function
    showCounterOrderDetails(orderId);
}

// Show counter order details in receipt-style modal (WIDER VERSION) - WITH FORCED RECALCULATION
function showCounterOrderDetails(orderId) {
    // Fetch the counter order details
    fetch(`/api/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to fetch order');
        return res.json();
    })
    .then(result => {
        if (!result.success) throw new Error('Order not found');
        const order = result.order;
        
        // ✅ FORCE RECALCULATE totals to fix any database errors
        const subtotal = order.totals?.subtotal || 0;
        const discount = order.totals?.discount || 0;
        const shipping = order.totals?.shipping || 0;
        // 👇 THIS IS THE KEY FIX - Recalculate, don't trust stored total
        const calculatedTotal = subtotal - discount + shipping;
        
        // Use calculated total instead of stored total
        const displayTotal = calculatedTotal;
        
        // Create receipt-styled modal - WIDER
        const modalHtml = `
            <div id="counterReceiptModal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 800px; width: 90%;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 15px;">
                        <h2 style="margin: 0; color: #333;">🧾 Counter Sale Receipt</h2>
                        <button onclick="closeCounterReceiptModal()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #666;">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 20px 0;">
                        <!-- Receipt Content -->
                        <div id="receiptPrintArea" style="font-family: 'Courier New', monospace; font-size: 13px;">
                            <!-- Header -->
                            <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px dashed #333; padding-bottom: 15px;">
                                <h3 style="margin: 0; color: #8B0000; font-size: 18px;">SMT LINGAMMAL RAMARAJU SHASTRA PRATHISTA TRUST</h3>
                                <p style="margin: 8px 0; font-size: 13px; font-weight: bold;">"RAMCO DHARMIKA SEVA"</p>
                                <p style="margin: 5px 0; font-size: 12px;">No.1, P.A.C. Ramasamy Raja Road, Rajapalayam - 626 117</p>
                                <p style="margin: 5px 0; font-size: 12px;">email: shastraprathista@gmail.com | Mob: 88704 12345</p>
                            </div>
                            
                            <h4 style="text-align: center; margin: 20px 0; font-size: 16px;">CASH SALE RECEIPT</h4>
                            
                            <div style="margin: 20px 0; display: flex; justify-content: space-between; flex-wrap: wrap;">
                                <div><strong>Receipt No:</strong> ${order.receiptNumber || order.orderId}</div>
                                <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                            </div>
                            
                            <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                                <strong style="font-size: 14px;">Customer Details:</strong><br>
                                <strong>Name:</strong> ${order.customerName || 'N/A'}<br>
                                <strong>Phone:</strong> ${order.customerPhone || 'N/A'}<br>
                                ${order.customerEmail ? `<strong>Email:</strong> ${order.customerEmail}<br>` : ''}
                                ${order.customerAddress ? `<strong>Address:</strong> ${order.customerAddress}<br>` : ''}
                            </div>
                            
                            <!-- Items Table - WIDER -->
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                <thead>
                                    <tr style="border-bottom: 2px solid #333; background: #f0f0f0;">
                                        <th style="text-align: left; padding: 10px;">#</th>
                                        <th style="text-align: left; padding: 10px;">Item</th>
                                        <th style="text-align: center; padding: 10px;">Qty</th>
                                        <th style="text-align: right; padding: 10px;">Price (₹)</th>
                                        <th style="text-align: right; padding: 10px;">Total (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(order.items || []).map((item, idx) => `
                                        <tr style="border-bottom: 1px solid #ddd;">
                                            <td style="padding: 10px;">${idx + 1}</td>
                                            <td style="padding: 10px;"><strong>${item.title || item.name}</strong></td>
                                            <td style="text-align: center; padding: 10px;">${item.quantity}</td>
                                            <td style="text-align: right; padding: 10px;">${parseFloat(item.price).toFixed(2)}</td>
                                            <td style="text-align: right; padding: 10px;">${(item.quantity * item.price).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot>
                                    <tr style="border-top: 2px solid #333;">
                                        <td colspan="4" style="text-align: right; padding: 10px;"><strong>Subtotal:</strong></td>
                                        <td style="text-align: right; padding: 10px;"><strong>₹${subtotal.toFixed(2)}</strong></td>
                                    </tr>
                                    ${discount > 0 ? `
                                    <tr>
                                        <td colspan="4" style="text-align: right; padding: 8px; color: #d32f2f;"><strong>Discount:</strong></td>
                                        <td style="text-align: right; padding: 8px; color: #d32f2f;"><strong>-₹${discount.toFixed(2)}</strong></td>
                                    </tr>
                                    ` : ''}
                                    ${shipping > 0 ? `
                                    <tr>
                                        <td colspan="4" style="text-align: right; padding: 8px;"><strong>Shipping:</strong></td>
                                        <td style="text-align: right; padding: 8px;"><strong>₹${shipping.toFixed(2)}</strong></td>
                                    </tr>
                                    ` : ''}
                                    <tr style="border-top: 2px solid #333; background: #f5f5f5;">
                                        <td colspan="4" style="text-align: right; padding: 12px; font-size: 16px;"><strong>GRAND TOTAL:</strong></td>
                                        <td style="text-align: right; padding: 12px; font-size: 16px;"><strong>₹${displayTotal.toFixed(2)}</strong></td>
                                    </tr>
                                </tfoot>
                            </table>
                            
                            <div style="margin: 20px 0; padding: 15px; background: #e8f5e9; border-radius: 8px;">
                                <strong>Payment Mode:</strong> ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'CASH'} &nbsp;&nbsp;|&nbsp;&nbsp;
                                <strong>Status:</strong> <span style="color: #2e7d32;">✓ PAID</span>
                            </div>
                            
                            <div style="text-align: center; margin-top: 30px; border-top: 2px dashed #333; padding-top: 20px;">
                                <p style="font-size: 13px;">Thank you for your purchase!</p>
                                <p style="font-size: 11px; color: #666;">Books HSN - 4901 (GST Exempt)</p>
                                <p style="font-size: 11px;">www.shastraprathista.in</p>
                                <br><br>
                                <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                                    <p>_________________________</p>
                                    <p>_________________________</p>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 11px;">
                                    <p>Customer Signature</p>
                                    <p>Authorized Signatory</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #eee; padding-top: 15px;">
                        <button onclick="printCounterReceipt()" class="btn btn-primary" style="padding: 10px 20px;">
                            <i class="fas fa-print"></i> 🖨️ Print Receipt
                        </button>
                        <button onclick="closeCounterReceiptModal()" class="btn btn-secondary" style="padding: 10px 20px;">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('counterReceiptModal');
        if (existingModal) existingModal.remove();
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Store order data for printing (with corrected total)
        window.currentReceiptOrder = {
            ...order,
            displayTotal: displayTotal,
            correctedTotal: displayTotal
        };
    })
    .catch(err => {
        console.error('Error fetching counter order:', err);
        showToast('Failed to load order details', 'error');
    });
}

// Close counter receipt modal - FIXED
function closeCounterReceiptModal() {
    const modal = document.getElementById('counterReceiptModal');
    if (modal) {
        modal.remove();  // Use remove() instead of style.display
    }
}

// Print function for counter receipt - WIDER VERSION
function printCounterReceipt() {
    const receiptContent = document.getElementById('receiptPrintArea');
    if (!receiptContent) {
        showToast('Receipt content not found', 'error');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - ${window.currentReceiptOrder?.receiptNumber || 'Counter Sale'}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Courier New', monospace;
                    margin: 0;
                    padding: 30px;
                    background: white;
                }
                .receipt {
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    padding: 20px;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 15px;
                    }
                    .receipt {
                        max-width: 100%;
                        padding: 0;
                    }
                    button, .no-print {
                        display: none;
                    }
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th, td {
                    padding: 8px;
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                ${receiptContent.innerHTML}
            </div>
            <div class="no-print" style="text-align: center; margin-top: 20px; padding: 15px; background: #f0f0f0;">
                <button onclick="window.print()" style="padding: 10px 20px; margin: 5px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 5px;">
                    🖨️ Print
                </button>
                <button onclick="window.close()" style="padding: 10px 20px; margin: 5px; cursor: pointer; background: #666; color: white; border: none; border-radius: 5px;">
                    ✖️ Close
                </button>
            </div>
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Reprint counter receipt - UPDATED with proper width
async function reprintCounterReceipt(orderId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const order = result.order;
            
            // Generate receipt HTML directly for printing
            const receiptHtml = generateCounterReceiptHTML(order);
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Reprint Receipt - ${order.receiptNumber || order.orderId}</title>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        body {
                            font-family: 'Courier New', monospace;
                            margin: 0;
                            padding: 30px;
                            background: white;
                        }
                        .receipt {
                            max-width: 800px;
                            width: 90%;
                            margin: 0 auto;
                            background: white;
                            padding: 20px;
                        }
                        @media print {
                            body {
                                margin: 0;
                                padding: 15px;
                            }
                            .receipt {
                                max-width: 100%;
                                padding: 0;
                            }
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        th, td {
                            padding: 8px;
                        }
                    </style>
                </head>
                <body>
                    <div class="receipt">
                        ${receiptHtml}
                    </div>
                    <div class="no-print" style="text-align: center; margin-top: 20px; padding: 15px; background: #f0f0f0;">
                        <button onclick="window.print()" style="padding: 10px 20px; margin: 5px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 5px;">
                            🖨️ Print
                        </button>
                        <button onclick="window.close()" style="padding: 10px 20px; margin: 5px; cursor: pointer; background: #666; color: white; border: none; border-radius: 5px;">
                            ✖️ Close
                        </button>
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 500);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
            showToast('Reprinting receipt...', 'success');
        }
    } catch (error) {
        console.error('Error reprinting receipt:', error);
        showToast('Failed to reprint receipt', 'error');
    }
}

// Generate counter receipt HTML for reprint - WITH FORCED RECALCULATION
function generateCounterReceiptHTML(order) {
    // Extract totals properly
    const subtotal = order.totals?.subtotal || 0;
    const discount = order.totals?.discount || 0;
    const shipping = order.totals?.shipping || 0;
    // ✅ FORCE RECALCULATE - don't use stored total
    const total = subtotal - discount + shipping;
    
    return `
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px dashed #333; padding-bottom: 15px;">
            <h3 style="margin: 0; color: #8B0000; font-size: 18px;">SMT LINGAMMAL RAMARAJU SHASTRA PRATHISTA TRUST</h3>
            <p style="margin: 8px 0; font-size: 13px; font-weight: bold;">"RAMCO DHARMIKA SEVA"</p>
            <p style="margin: 5px 0; font-size: 12px;">No.1, P.A.C. Ramasamy Raja Road, Rajapalayam - 626 117</p>
            <p style="margin: 5px 0; font-size: 12px;">email: shastraprathista@gmail.com | Mob: 88704 12345</p>
        </div>
        
        <h4 style="text-align: center; margin: 20px 0; font-size: 16px;">CASH SALE RECEIPT</h4>
        
        <div style="margin: 20px 0; display: flex; justify-content: space-between; flex-wrap: wrap;">
            <div><strong>Receipt No:</strong> ${order.receiptNumber || order.orderId}</div>
            <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString('en-IN')}</div>
        </div>
        
        <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px;">
            <strong style="font-size: 14px;">Customer Details:</strong><br>
            <strong>Name:</strong> ${order.customerName || 'N/A'}<br>
            <strong>Phone:</strong> ${order.customerPhone || 'N/A'}<br>
            ${order.customerEmail ? `<strong>Email:</strong> ${order.customerEmail}<br>` : ''}
            ${order.customerAddress ? `<strong>Address:</strong> ${order.customerAddress}<br>` : ''}
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
                <tr style="border-bottom: 2px solid #333; background: #f0f0f0;">
                    <th style="text-align: left; padding: 10px;">Item</th>
                    <th style="text-align: center; padding: 10px;">Qty</th>
                    <th style="text-align: right; padding: 10px;">Price (₹)</th>
                    <th style="text-align: right; padding: 10px;">Total (₹)</th>
                 </tr>
            </thead>
            <tbody>
                ${(order.items || []).map(item => `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px;"><strong>${item.title || item.name}</strong></td>
                        <td style="text-align: center; padding: 10px;">${item.quantity}</td>
                        <td style="text-align: right; padding: 10px;">${parseFloat(item.price).toFixed(2)}</td>
                        <td style="text-align: right; padding: 10px;">${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr style="border-top: 2px solid #333;">
                    <td colspan="3" style="text-align: right; padding: 10px;"><strong>Subtotal:</strong></td>
                    <td style="text-align: right; padding: 10px;"><strong>₹${subtotal.toFixed(2)}</strong></td>
                </tr>
                ${discount > 0 ? `
                <tr>
                    <td colspan="3" style="text-align: right; padding: 8px; color: #d32f2f;"><strong>Discount:</strong></td>
                    <td style="text-align: right; padding: 8px; color: #d32f2f;"><strong>-₹${discount.toFixed(2)}</strong></td>
                </tr>
                ` : ''}
                ${shipping > 0 ? `
                <tr>
                    <td colspan="3" style="text-align: right; padding: 8px;"><strong>Shipping:</strong></td>
                    <td style="text-align: right; padding: 8px;"><strong>₹${shipping.toFixed(2)}</strong></td>
                </tr>
                ` : ''}
                <tr style="border-top: 2px solid #333; background: #f5f5f5;">
                    <td colspan="3" style="text-align: right; padding: 12px; font-size: 16px;"><strong>GRAND TOTAL:</strong></td>
                    <td style="text-align: right; padding: 12px; font-size: 16px;"><strong>₹${total.toFixed(2)}</strong></td>
                </tr>
            </tfoot>
        </table>
        
        <div style="margin: 20px 0; padding: 15px; background: #e8f5e9; border-radius: 8px;">
            <strong>Payment:</strong> ${order.paymentMethod?.toUpperCase() || 'CASH'} | <strong>Status:</strong> <span style="color: #2e7d32;">✓ PAID</span>
        </div>
        
        <div style="text-align: center; margin-top: 30px; border-top: 2px dashed #333; padding-top: 20px;">
            <p>Thank you for your purchase!</p>
            <p>www.shastraprathista.in</p>
            <br><br>
            <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                <p>_________________________</p>
                <p>_________________________</p>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <p>Customer Signature</p>
                <p>Authorized Signatory</p>
            </div>
        </div>
    `;
}

// Filter counter orders
function filterCounterOrders() {
    const filter = document.getElementById('counterOrderFilter')?.value || 'all';
    loadCounterOrders(filter);
}

// Refresh counter orders
function refreshCounterOrders() {
    loadCounterOrders(document.getElementById('counterOrderFilter')?.value || 'all');
}

// Search counter orders
function searchCounterOrders() {
    const searchTerm = document.getElementById('counterOrderSearch')?.value.toLowerCase();
    const rows = document.querySelectorAll('#counterOrdersBody tr');
    
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Export counter orders to Excel
function exportCounterOrders() {
    const table = document.querySelector('#counterOrdersBody');
    if (!table) return;
    
    const rows = table.querySelectorAll('tr');
    let csv = 'Receipt No,Customer Name,Phone,Date & Time,Items,Total,Payment\n';
    
    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length > 0 && cols[0].innerText !== 'No counter orders found') {
            const receiptNo = cols[0]?.innerText.replace(/\n/g, ' ') || '';
            const customerName = cols[1]?.innerText || '';
            const phone = cols[2]?.innerText || '';
            const dateTime = cols[3]?.innerText || '';
            const items = cols[4]?.innerText || '';
            const total = cols[5]?.innerText || '';
            const payment = cols[6]?.innerText || '';
            
            csv += `"${receiptNo}","${customerName}","${phone}","${dateTime}","${items}","${total}","${payment}"\n`;
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `counter_orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export completed!', 'success');
}

// Add event listener for search
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('counterOrderSearch');
    if (searchInput) {
        searchInput.addEventListener('input', searchCounterOrders);
    }
});

// ============ END COUNTER ORDERS MANAGEMENT ============

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

// Update the DOMContentLoaded event
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔐 Checking admin access...');
    
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) {
        return; // User will be redirected
    }
    
    console.log('✅ Access granted! Loading admin dashboard...');
    
    // ✅ Check if current section is counter orders and add floating button
    const activeSection = document.querySelector('.content-section.active');
    if (activeSection && activeSection.id === 'counter-orders') {
        addFloatingCounterButton();
    }
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
                            <i class="fas fa-shipping-fast"></i> Mark as Shipped
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

// ✅ Show section function WITH FLOATING BUTTON
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
    
    // 🔥 LOAD DATA FOR SPECIFIC SECTIONS 🔥
    if (sectionName === 'counter-orders') {
        console.log('🔄 Loading counter orders...');
        if (typeof loadCounterOrders === 'function') {
            loadCounterOrders('all');
        } else {
            console.error('❌ loadCounterOrders function not found!');
        }
        // ✅ Add floating button for counter orders section
        addFloatingCounterButton();
    } else {
        // ✅ Remove floating button for other sections
        removeFloatingCounterButton();
    }
    
    if (sectionName === 'orders') {
        if (typeof loadOrdersFromBackend === 'function') {
            loadOrdersFromBackend();
        }
    }
    
    if (sectionName === 'customers') {
        if (typeof loadCustomersFromBackend === 'function') {
            loadCustomersFromBackend();
        }
    }
    
    if (sectionName === 'reports') {
        if (typeof loadReportsData === 'function') {
            loadReportsData();
        }
    }
    
    // Update active nav link
    const navLinks = document.querySelectorAll('.admin-nav a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        const onclick = link.getAttribute('onclick');
        
        if ((href && href === `#${sectionName}`) || 
            (onclick && onclick.includes(sectionName))) {
            link.classList.add('active');
        }
    });
    
    // Load section data if needed
    if (typeof loadSectionData === 'function') {
        loadSectionData(sectionName);
    }
}

// ============ FLOATING COUNTER SALE BUTTON ============
// Add floating button directly to body with forced positioning
function addFloatingCounterButton() {
    // Check if button already exists
    if (document.getElementById('floatingCounterBtn')) return;
    
    const button = document.createElement('button');
    button.id = 'floatingCounterBtn';
    button.innerHTML = `
        <i class="fas fa-shopping-cart"></i>
        <span>New Counter Sale</span>
    `;
    button.onclick = () => openPOSModal();
    
    // Apply styles directly with JavaScript (bypasses any CSS conflicts)
    button.style.cssText = `
        position: fixed !important;
        bottom: 30px !important;
        right: 30px !important;
        z-index: 999999 !important;
        background: linear-gradient(135deg, #28a745, #1e7e34) !important;
        color: white !important;
        border: none !important;
        border-radius: 50px !important;
        padding: 15px 25px !important;
        font-size: 16px !important;
        font-weight: bold !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
        transition: all 0.3s ease !important;
        font-family: inherit !important;
    `;
    
    // Add hover effect
    button.onmouseenter = () => {
        button.style.transform = 'translateY(-3px)';
        button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
        button.style.background = 'linear-gradient(135deg, #34ce57, #28a745)';
    };
    button.onmouseleave = () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
        button.style.background = 'linear-gradient(135deg, #28a745, #1e7e34)';
    };
    
    // Append directly to body
    document.body.appendChild(button);
}

// Remove floating button
function removeFloatingCounterButton() {
    const button = document.getElementById('floatingCounterBtn');
    if (button) button.remove();
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


// Make POS functions globally available
window.openPOSModal = openPOSModal;
window.closePOSModal = closePOSModal;
window.addToPOSCart = addToPOSCart;
window.updatePOSQty = updatePOSQty;
window.removePOSItem = removePOSItem;
window.clearPOSCart = clearPOSCart;
window.processPOSSale = processPOSSale;
window.updatePOSTotals = updatePOSTotals;
window.generateReceiptNumber = generateReceiptNumber;
window.setupPhoneValidation = setupPhoneValidation;

window.loadCounterOrders = loadCounterOrders;
window.filterCounterOrders = filterCounterOrders;
window.refreshCounterOrders = refreshCounterOrders;
window.exportCounterOrders = exportCounterOrders;
window.viewCounterOrder = viewCounterOrder;
window.reprintCounterReceipt = reprintCounterReceipt;

// Add these to the existing window exports
window.showCounterOrderDetails = showCounterOrderDetails;
window.printCounterReceipt = printCounterReceipt;
window.closeCounterReceiptModal = closeCounterReceiptModal;
window.generateCounterReceiptHTML = generateCounterReceiptHTML;

console.log('✅ Admin UI fully loaded with all functions including POS System!');