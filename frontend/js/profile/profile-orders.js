// profile-orders.js
class ProfileOrders {
    constructor() {
        this.allOrders = [];
        this.filteredOrders = [];
        this.currentPage = 1;
        this.ordersPerPage = 5;
        this.utils = window.ProfileUtils;
        this.api = new window.ProfileAPI();
    }

    async loadHistory(user = null) {
        try {
            console.log(`=== loadHistory called at ${new Date().toLocaleTimeString()} ===`);

            const tbody = document.getElementById("historyBody");
            const emptyHistory = document.getElementById("empty-history");

            if (!tbody || !emptyHistory) {
                console.warn("⚠️ History elements not found");
                return;
            }

            // Show loading state
            emptyHistory.style.display = "block";
            emptyHistory.innerHTML = `<p style="text-align:center;">Loading orders...</p>`;
            tbody.innerHTML = "";

            let orders = [];

            // Get current user
            const currentUser = user || JSON.parse(localStorage.getItem("currentUser"));
            if (!currentUser) {
                emptyHistory.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-user" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p>Please login to view your orders</p>
                        <button class="btn" onclick="window.location.href='login.html'" style="margin-top: 15px;">
                            <i class="fas fa-sign-in-alt"></i> Login
                        </button>
                    </div>
                `;
                return;
            }

            // Try API first
            try {
                console.log("🔍 Attempting to fetch orders from API...");
                const response = await this.api.getUserOrders();

                if (response?.success && Array.isArray(response.orders)) {
                    orders = response.orders.map(order => this.utils.normalizeOrderStructure(order));
                    console.log(`✅ Loaded ${orders.length} orders from API`);
                } else {
                    console.log("⚠️ API returned empty or invalid orders:", response);
                }
            } catch (apiError) {
                console.warn("⚠️ API failed, using localStorage fallback", apiError);
            }

            // Fallback to localStorage
            if (!orders.length) {
                console.log("🔍 Falling back to localStorage orders...");
                orders = this.getOrdersFromLocalStorage(currentUser);
                console.log(`📦 Loaded ${orders.length} orders from localStorage`);
            }

            // Handle empty state
            if (!orders.length) {
                emptyHistory.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                        <i class="fas fa-shopping-cart" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p>No orders found yet</p>
                        <p style="font-size: 14px; margin-top: 10px;">Start shopping to see your orders here</p>
                        <button class="btn" onclick="window.location.href='index.html'" style="margin-top: 155px;">
                            <i class="fas fa-shopping-bag"></i> Start Shopping
                        </button>
                    </div>
                `;
                return;
            }

            // Sort newest → oldest
            this.allOrders = orders.sort((a, b) => {
                const dateA = a.date ? new Date(a.date) : new Date(0);
                const dateB = b.date ? new Date(b.date) : new Date(0);
                return dateB - dateA;
            });

            this.filteredOrders = [...this.allOrders];

            // Render
            emptyHistory.style.display = "none";
            this.renderOrders();

            // Show success message
            this.utils.showTopToast(`Loaded ${orders.length} orders`, "success");

        } catch (error) {
            console.error("❌ Error in loadHistory:", error);
            this.utils.showTopToast("Error loading order history", "error");
        }
    }

    renderOrders() {
        try {
            console.log("=== renderOrders called ===");
            
            const tbody = document.getElementById("historyBody");
            if (!tbody) {
                console.error("History body not found");
                return;
            }
            
            tbody.innerHTML = "";
            
            // Calculate pagination
            const totalPages = Math.ceil(this.filteredOrders.length / this.ordersPerPage);
            const startIndex = (this.currentPage - 1) * this.ordersPerPage;
            const endIndex = Math.min(startIndex + this.ordersPerPage, this.filteredOrders.length);
            const pageOrders = this.filteredOrders.slice(startIndex, endIndex);
            
            console.log("Page orders to render:", pageOrders.length);
            
            // Render orders for current page
            pageOrders.forEach(order => {
                const tr = document.createElement("tr");
                
                const orderId = order.orderId || order.id || 'N/A';
                const totals = order.totals || order.summary || {};
                const totalAmount = totals.total || order.total || 0;
                
                // Create items list
                let itemsList = '';
                if (order.items && order.items.length > 0) {
                    const maxItems = Math.min(order.items.length, 2);
                    order.items.slice(0, maxItems).forEach(item => {
                        const itemName = item.title || 'Item';
                        const truncatedName = itemName.length > 30 ? itemName.substring(0, 27) + '...' : itemName;
                        itemsList += `<li style="font-size: 13px;">${truncatedName} (Qty: ${item.quantity || 1})</li>`;
                    });
                    if (order.items.length > 2) {
                        itemsList += `<li style="font-size: 11px; color: #666;">+${order.items.length - 2} more items</li>`;
                    }
                } else {
                    itemsList = '<li style="font-size: 12px; color: #999;">No items</li>';
                }
                
                // Format date
                let orderDate = 'N/A';
                try {
                    orderDate = new Date(order.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    });
                } catch (e) {
                    orderDate = 'Invalid Date';
                }
                
                // Get status badge class
                const statusClass = `status-${order.status?.toLowerCase() || 'processing'}`;
                const statusText = order.status || 'Processing';
                
                // Check if order can be cancelled
                const canCancel = !['cancelled', 'delivered', 'shipped'].includes(order.status?.toLowerCase());
                
                tr.innerHTML = `
                    <td data-label="Order ID"><span class="order-id">${orderId}</span></td>
                    <td data-label="Date"><span class="order-date">${orderDate}</span></td>
                    <td data-label="Items">
                        <ul class="item-list" style="margin: 0; padding-left: 15px;">
                            ${itemsList}
                        </ul>
                    </td>
                    <td data-label="Total"><span class="order-total">₹${totalAmount.toFixed(2)}</span></td>
                    <td data-label="Status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                        ${canCancel ? `
                            <button class="cancel-btn" onclick="window.ProfileOrders.cancelOrder('${orderId}')">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        ` : ''}
                    </td>
                    <td data-label="Actions">
                        <div class="action-buttons">
                            <button class="details-btn" onclick="window.ProfileOrders.viewOrderDetails('${orderId}')">
                                <i class="fas fa-eye"></i> Details
                            </button>
                            <button class="invoice-btn" onclick="window.ProfileInvoice.downloadInvoice('${orderId}', event)">
                                <i class="fas fa-download"></i> Invoice
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            console.log("Rendered", pageOrders.length, "orders");
            
            // Render pagination
            this.renderPagination(totalPages);
            
        } catch (error) {
            console.error("Error in renderOrders:", error);
            this.utils.showTopToast("Error rendering orders", "error");
        }
    }

    renderPagination(totalPages) {
        try {
            const paginationContainer = document.getElementById("pagination");
            if (!paginationContainer) return;
            
            if (totalPages <= 1) {
                paginationContainer.innerHTML = "";
                return;
            }
            
            let paginationHTML = "";
            
            // Previous button
            if (this.currentPage > 1) {
                paginationHTML += `<button class="pagination-btn" onclick="window.ProfileOrders.changePage(${this.currentPage - 1})" aria-label="Previous page"><i class="fas fa-chevron-left"></i></button>`;
            }
            
            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                if (i === this.currentPage) {
                    paginationHTML += `<button class="pagination-btn active" aria-label="Current page, page ${i}" aria-current="page">${i}</button>`;
                } else {
                    paginationHTML += `<button class="pagination-btn" onclick="window.ProfileOrders.changePage(${i})" aria-label="Go to page ${i}">${i}</button>`;
                }
            }
            
            // Next button
            if (this.currentPage < totalPages) {
                paginationHTML += `<button class="pagination-btn" onclick="window.ProfileOrders.changePage(${this.currentPage + 1})" aria-label="Next page"><i class="fas fa-chevron-right"></i></button>`;
            }
            
            paginationContainer.innerHTML = paginationHTML;
        } catch (error) {
            console.error("Error rendering pagination:", error);
        }
    }

    changePage(page) {
        try {
            this.currentPage = page;
            this.renderOrders();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error("Error changing page:", error);
        }
    }

    filterOrders() {
        try {
            const searchInput = document.getElementById("orderSearch");
            if (!searchInput) return;
            
            const searchTerm = searchInput.value.toLowerCase();
            
            this.filteredOrders = this.allOrders.filter(order => {
                const orderId = (order.orderId || order.id || '').toLowerCase();
                const contactName = (order.contact?.name || '').toLowerCase();
                
                if (orderId.includes(searchTerm) || contactName.includes(searchTerm)) {
                    return true;
                }
                
                if (order.items && Array.isArray(order.items)) {
                    return order.items.some(item => {
                        const itemTitle = (item.title || '').toLowerCase();
                        return itemTitle.includes(searchTerm);
                    });
                }
                
                return false;
            });
            
            this.currentPage = 1;
            this.renderOrders();
            
        } catch (error) {
            console.error("Error filtering orders:", error);
        }
    }

    cancelOrder(orderId) {
        if (!confirm("Are you sure you want to cancel this order?")) {
            return;
        }

        try {
            this.utils.showTopToast("Cancelling order...", "info");
            
            const orderIndex = this.allOrders.findIndex(order => 
                order.orderId === orderId || order.id === orderId
            );
            
            if (orderIndex !== -1) {
                this.allOrders[orderIndex].status = 'Cancelled';
                this.filteredOrders = [...this.allOrders];
                this.renderOrders();
                this.utils.showTopToast("Order cancelled successfully", "success");
                
                // Update localStorage if needed
                const currentUser = JSON.parse(localStorage.getItem("currentUser") || '{}');
                if (currentUser.email) {
                    const userOrdersKey = `userOrders_${currentUser.email}`;
                    localStorage.setItem(userOrdersKey, JSON.stringify(this.allOrders));
                }
            } else {
                this.utils.showTopToast("Order not found", "error");
            }
        } catch (error) {
            console.error("Error cancelling order:", error);
            this.utils.showTopToast("Failed to cancel order", "error");
        }
    }

    async viewOrderDetails(orderId) {
        try {
            console.log("Viewing order details for:", orderId);

            const token = localStorage.getItem('token');
            if (!token) {
                this.utils.showTopToast("Please login to view order details", "error");
                return;
            }

            const modal = document.getElementById("orderModal");
            const modalContent = document.getElementById("orderModalContent");

            if (!modal || !modalContent) {
                this.utils.showTopToast("Modal not available", "error");
                return;
            }

            // Show loading state
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h2 id="modal-title">Order Details</h2>
                    <button class="close-btn" onclick="window.ProfileUI.closeModal()" aria-label="Close order details">
                    <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <p>Loading order details...</p>
                </div>
            `;
            
            modal.style.display = "block";

            // Fetch order details from API
            try {
                console.log("🔍 Fetching order details from API...");
                
                const result = await this.api.getOrder(orderId);
                
                if (!result.success) {
                    throw new Error(result.message || 'Failed to load order');
                }

                const order = this.utils.normalizeOrderStructure(result.order);
                this.renderOrderDetailsInModal(order, modalContent);

            } catch (apiError) {
                console.error("API Error fetching order:", apiError);
                
                // Show error in modal
                modalContent.innerHTML = `
                    <div class="modal-header">
                        <h2 id="modal-title">Order Details</h2>
                        <button class="close-btn" onclick="window.ProfileUI.closeModal()" aria-label="Close order details">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div style="text-align: center; padding: 40px; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p>Failed to load order details</p>
                        <p style="font-size: 14px; margin-top: 10px;">${apiError.message}</p>
                        <button class="btn" onclick="window.ProfileUI.closeModal()" style="margin-top: 15px;">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                `;
            }

        } catch (error) {
            console.error("Error in viewOrderDetails:", error);
            this.utils.showTopToast("Failed to load order details", "error");
            window.ProfileUI.closeModal();
        }
    }

    renderOrderDetailsInModal(order, modalContent) {
        const normalizedOrder = this.utils.normalizeOrderStructure(order);
        const billingAddress = normalizedOrder.billingAddress || {};
        const shippingAddress = normalizedOrder.shippingAddress || {};

        // Format order date
        const orderDate = new Date(normalizedOrder.date).toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Calculate totals
        const items = Array.isArray(normalizedOrder.items) ? normalizedOrder.items : [];
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

        const shipping = Number(normalizedOrder.totals?.shipping ?? 0);
        const totalAmount = Number(normalizedOrder.totals?.total ?? (netSubtotal + shipping));

        // Build items HTML
        const itemsHtml = items.length > 0
            ? items.map(item => `
                <div class="order-item">
                    <div class="item-info">
                        <span class="item-name">${item.title || 'Unknown Item'}</span>
                        <span class="item-quantity">Qty: ${item.quantity || 1}</span>
                    </div>
                    <div class="item-price">₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</div>
                </div>
            `).join('')
            : '<div class="order-item">No items found</div>';

        // Address formatting function
        const formatAddress = (address) => {
            if (!address || Object.keys(address).length === 0) {
                return '<p style="color: #999; font-style: italic;">No address information available</p>';
            }

            return `
                <p><strong>${address.fullName || address.name || 'N/A'}</strong></p>
                <p>${address.addressLine1 || address.address || 'N/A'}</p>
                <p>${address.city || 'N/A'}, ${address.district || 'N/A'} - ${address.pincode || 'N/A'}</p>
                <p>${address.state || 'N/A'}, ${address.country || 'India'}</p>
                <p>Phone: ${address.phone || 'N/A'}</p>
            `;
        };

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2 id="modal-title">Order Details</h2>
                <button class="close-btn" onclick="window.ProfileUI.closeModal()" aria-label="Close order details">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="order-details-container" id="printable-content">
                <div class="order-summary">
                    <div class="order-header">
                        <h3>Order #${normalizedOrder.orderId || normalizedOrder.id || 'N/A'}</h3>
                        <span class="order-date">${orderDate}</span>
                    </div>

                    <div class="order-status-info">
                        <div class="status-item">
                            <span class="status-label">Order Status:</span>
                            <span class="status-badge status-${normalizedOrder.status?.toLowerCase() || 'processing'}">
                                ${normalizedOrder.status || 'Processing'}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="order-sections">
                    <div class="order-section">
                        <h4>Items Ordered</h4>
                        <div class="items-list">${itemsHtml}</div>
                    </div>

                    <div class="addresses-section">
                        <div class="address-column">
                            <h4>Shipping Address</h4>
                            <div class="address-details">
                                ${formatAddress(shippingAddress)}
                            </div>
                        </div>

                        <div class="address-column">
                            <h4>Billing Address</h4>
                            <div class="address-details">
                                ${formatAddress(billingAddress)}
                            </div>
                        </div>
                    </div>

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
                            <div class="total-row grand-total">
                                <span>Total Amount:</span>
                                <span>₹${totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="window.ProfileUI.closeModal()">
                    <i class="fas fa-times"></i> Close
                </button>
                <button class="btn" onclick="window.ProfileInvoice.downloadInvoice('${normalizedOrder.orderId || normalizedOrder.id}', event)">
                    <i class="fas fa-download"></i> Download PDF
                </button>
            </div>
        `;
    }

    getOrdersFromLocalStorage(currentUser) {
        console.log("🔍 Getting orders from localStorage for:", currentUser?.email);
        
        if (!currentUser || !currentUser.email) {
            console.log("❌ No user provided to getOrdersFromLocalStorage");
            return [];
        }
        
        let orders = [];
        
        const possibleSources = [
            { key: `userOrders_${currentUser.email}`, type: 'user-specific' },
            { 
                key: 'allOrders', 
                type: 'all orders',
                filter: (order) => {
                    const normalized = this.utils.normalizeOrderStructure(order);
                    return normalized.userId === currentUser.email || 
                           (order.contact && order.contact.email === currentUser.email);
                }
            },
            { 
                key: 'orders', 
                type: 'legacy orders',
                filter: (order) => {
                    const normalized = this.utils.normalizeOrderStructure(order);
                    return normalized.userId === currentUser.email ||
                           (order.contact && order.contact.email === currentUser.email);
                }
            }
        ];

        for (const source of possibleSources) {
            try {
                const storedData = localStorage.getItem(source.key);
                if (storedData) {
                    let parsedOrders = JSON.parse(storedData);
                    
                    if (Array.isArray(parsedOrders)) {
                        if (source.filter) {
                            parsedOrders = parsedOrders.filter(source.filter);
                        }
                        
                        const normalizedOrders = parsedOrders.map(order => this.utils.normalizeOrderStructure(order));
                        
                        if (normalizedOrders.length > 0) {
                            console.log(`📂 Found ${normalizedOrders.length} orders in ${source.type}`);
                            orders.push(...normalizedOrders);
                        }
                    }
                }
            } catch (error) {
                console.warn(`Error reading from ${source.key}:`, error);
            }
        }

        // Remove duplicates
        const uniqueOrders = [];
        const seenOrderIds = new Set();
        
        orders.forEach(order => {
            const orderId = order.orderId || order.id;
            if (orderId && !seenOrderIds.has(orderId)) {
                seenOrderIds.add(orderId);
                uniqueOrders.push(order);
            }
        });

        console.log(`✅ Total unique orders found: ${uniqueOrders.length}`);
        return uniqueOrders;
    }
}

// Export as global
window.ProfileOrders = new ProfileOrders();