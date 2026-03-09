// frontend/js/music-admin-receipt-history.js

class ReceiptHistory {
    constructor() {
        // If you want to use public routes (no login required)
        this.API_BASE = '/api/music';
        
        // OR if you want to use admin routes (requires login)
        // this.API_BASE = '/api/music-admin';
        
        this.currentFY = this.getCurrentFinancialYear();
        this.init();
    }

    getCurrentFinancialYear() {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return month >= 4 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;
    }

    async init() {
        await this.populateFinancialYears();
        await this.loadReceipts();
        this.setupEventListeners();
    }

    async populateFinancialYears() {
        try {
            const fySelect = document.getElementById('fy-select');
            if (!fySelect) return;

            // Show loading state
            fySelect.innerHTML = '<option value="">Loading years...</option>';

            const response = await fetch(`${this.API_BASE}/receipts/financial-years`);
            const data = await response.json();
            
            const years = data.years || [this.currentFY];
            
            // Create options
            fySelect.innerHTML = years.map(year => 
                `<option value="${year}" ${year === this.currentFY ? 'selected' : ''}>${year}</option>`
            ).join('');
            
        } catch (error) {
            console.error('Error loading financial years:', error);
            // Fallback to current year only
            const fySelect = document.getElementById('fy-select');
            if (fySelect) {
                fySelect.innerHTML = `<option value="${this.currentFY}" selected>${this.currentFY}</option>`;
            }
        }
    }

    async loadReceipts(financialYear = this.currentFY) {
        // Prevent multiple simultaneous loads
        if (this.loading) return;
        
        this.loading = true;
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.API_BASE}/receipts/financial-year/${financialYear}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle different response structures
            const receipts = data.receipts || data || [];
            
            // Use requestAnimationFrame to prevent long tasks
            requestAnimationFrame(() => {
                this.renderReceipts(receipts);
                this.updateStats(receipts);
                this.loading = false;
                this.showLoading(false);
            });
            
        } catch (error) {
            console.error('Error loading receipts:', error);
            this.showError('Failed to load receipts. Please try again.');
            this.loading = false;
            this.showLoading(false);
        }
    }

    renderReceipts(receipts) {
        const container = document.getElementById('receipt-history');
        if (!container) return;

        if (!receipts || receipts.length === 0) {
            container.innerHTML = '<p class="no-data">📭 No receipts found for this financial year</p>';
            return;
        }

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        const table = document.createElement('table');
        table.className = 'receipts-table';
        
        // Create header
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Receipt No</th>
                    <th>Date</th>
                    <th>Student ID</th>
                    <th>Student Name</th>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>GST</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        // Create rows
        receipts.forEach(receipt => {
            const receiptData = receipt.receiptData || {};
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td><strong>${receipt.receiptNumber || 'N/A'}</strong></td>
                <td>${receipt.receiptDate ? new Date(receipt.receiptDate).toLocaleDateString('en-IN') : 'N/A'}</td>
                <td>${receiptData.studentId || receipt.studentId || 'N/A'}</td>
                <td>${receiptData.studentName || 'N/A'}</td>
                <td>${this.formatMonth(receiptData.paymentMonth)}</td>
                <td>₹${(receiptData.totalAmount || 0).toFixed(2)}</td>
                <td>${receiptData.gstPercentage || 0}%</td>
                <td class="actions-cell">
                    <button class="btn-small btn-pdf" data-receipt="${receipt.receiptNumber}">
                        📥 PDF
                    </button>
                    <button class="btn-small btn-print" data-receipt="${receipt.receiptNumber}">
                        🖨️ Print
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        fragment.appendChild(table);
        
        // Clear container and append fragment
        container.innerHTML = '';
        container.appendChild(fragment);
        
        // Attach event listeners to buttons
        this.attachButtonListeners();
    }
    
    attachButtonListeners() {
        document.querySelectorAll('.btn-pdf').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const receiptNo = btn.dataset.receipt;
                window.open(`${this.API_BASE}/receipts/pdf/${encodeURIComponent(receiptNo)}`, '_blank');
            });
        });
        
        document.querySelectorAll('.btn-print').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const receiptNo = btn.dataset.receipt;
                this.printReceipt(receiptNo);
            });
        });
    }
    
    formatMonth(monthStr) {
        if (!monthStr) return 'N/A';
        try {
            const [year, month] = monthStr.split('-');
            const date = new Date(year, month - 1, 1);
            return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        } catch {
            return monthStr;
        }
    }
    
    updateStats(receipts) {
        const totalReceipts = receipts.length;
        const totalAmount = receipts.reduce((sum, r) => sum + (r.receiptData?.totalAmount || 0), 0);
        
        const statsContainer = document.getElementById('receipt-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-box">
                    <span class="stat-label">Total Receipts</span>
                    <span class="stat-value">${totalReceipts}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Total Collection</span>
                    <span class="stat-value">₹${totalAmount.toFixed(2)}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Financial Year</span>
                    <span class="stat-value">${this.currentFY}</span>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Financial year selector
        const fySelect = document.getElementById('fy-select');
        if (fySelect) {
            fySelect.addEventListener('change', (e) => {
                this.loadReceipts(e.target.value);
            });
        }

        // Search input with debounce
        const searchInput = document.getElementById('search-receipt');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.searchReceipt(e.target.value);
                }, 300); // Reduced from 500ms to 300ms
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-receipts');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadReceipts();
            });
        }
    }

    async searchReceipt(query) {
        if (!query || query.trim() === '') {
            this.loadReceipts();
            return;
        }

        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.API_BASE}/receipts/search?q=${encodeURIComponent(query.trim())}`);
            
            if (response.ok) {
                const data = await response.json();
                const receipts = data.receipts || [];
                this.renderReceipts(receipts);
            } else {
                this.showError('No receipts found matching your search');
            }
        } catch (error) {
            console.error('Error searching receipts:', error);
            this.showError('Error searching receipts');
        } finally {
            this.showLoading(false);
        }
    }
    
    printReceipt(receiptNumber) {
        const printWindow = window.open(`${this.API_BASE}/receipts/pdf/${receiptNumber}`);
        if (printWindow) {
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            };
        }
    }
    
    showLoading(show) {
        const container = document.getElementById('receipt-history');
        if (!container) return;
        
        if (show && container.children.length === 0) {
            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading receipts...</div>';
        }
    }
    
    showError(message) {
        const container = document.getElementById('receipt-history');
        if (container) {
            container.innerHTML = `<div class="error-message">❌ ${message}</div>`;
        }
    }
}

// Initialize when DOM is ready - use requestIdleCallback for better performance
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('receipt-history')) {
            // Use requestIdleCallback to not block critical rendering
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    window.receiptHistory = new ReceiptHistory();
                }, { timeout: 2000 });
            } else {
                setTimeout(() => {
                    window.receiptHistory = new ReceiptHistory();
                }, 100);
            }
        }
    });
} else {
    // DOM already loaded
    if (document.getElementById('receipt-history')) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                window.receiptHistory = new ReceiptHistory();
            }, { timeout: 2000 });
        } else {
            window.receiptHistory = new ReceiptHistory();
        }
    }
}