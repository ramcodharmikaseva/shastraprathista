// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Music School Admin loaded');
    
    // Initialize form handler
    const form = document.getElementById('addStudentForm');
    if (form) {
        form.addEventListener('submit', handleAddStudent);
    }
    
    // Add initial class row
    setTimeout(() => {
        if (typeof addClassRow === 'function') {
            addClassRow().catch(error => {
                console.error('Error adding class row:', error);
                addFallbackClassRow();
            });
        } else {
            addFallbackClassRow();
        }
    }, 100);
    
    // Initialize modal events
    if (typeof initializeModalEvents === 'function') {
        initializeModalEvents();
    } else {
        setupModalCloseHandlers();
    }
    
    // Preview updates
    const baseFeeInput = document.getElementById('editBaseFee');
    if (baseFeeInput && typeof updateEditPreview === 'function') {
        baseFeeInput.addEventListener('input', updateEditPreview);
    }
    
    // Close modal buttons
    document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modals = ['editTeacherModal', 'editClassModal', 'studentModal'];
            modals.forEach(id => {
                const modal = document.getElementById(id);
                if (modal) modal.style.display = 'none';
            });
        });
    });
    
    // Button event listeners
    const addTeacherBtn = document.getElementById('addTeacherBtn');
    if (addTeacherBtn && typeof showAddTeacherModal === 'function') {
        addTeacherBtn.addEventListener('click', showAddTeacherModal);
    }
    
    const saveTeacherBtn = document.getElementById('saveTeacherBtn');
    if (saveTeacherBtn && typeof saveTeacherChanges === 'function') {
        saveTeacherBtn.addEventListener('click', saveTeacherChanges);
    }
    
    const saveGSTBtn = document.getElementById('saveGSTBtn');
    if (saveGSTBtn && typeof saveGSTSettings === 'function') {
        saveGSTBtn.addEventListener('click', saveGSTSettings);
    }
    
    const saveClassConfigBtn = document.getElementById('saveClassConfigBtn');
    if (saveClassConfigBtn && typeof saveClassConfigChanges === 'function') {
        saveClassConfigBtn.addEventListener('click', saveClassConfigChanges);
    }
    
    // Reports tab buttons
    const generateReportBtn = document.querySelector('#reports .btn-primary');
    if (generateReportBtn && generateReportBtn.textContent.includes('Apply Filters')) {
        // Replace the existing click handler to use our enhanced generateReport
        generateReportBtn.onclick = (e) => {
            e.preventDefault();
            if (typeof generateReport === 'function') {
                generateReport();
            } else {
                console.error('generateReport function not found');
                showToast('Report function not loaded properly', 'error');
            }
        };
    }
    
    // Add report card click handlers if they don't have onclick attributes
    document.querySelectorAll('.report-card').forEach(card => {
        if (!card.hasAttribute('onclick')) {
            const reportType = card.textContent.toLowerCase().includes('payment') ? 'payment' :
                              card.textContent.toLowerCase().includes('student') ? 'student' :
                              card.textContent.toLowerCase().includes('monthly') ? 'monthly' :
                              card.textContent.toLowerCase().includes('class') ? 'classwise' :
                              card.textContent.toLowerCase().includes('overdue') ? 'overdue' : 'full';
            
            card.addEventListener('click', () => {
                if (typeof downloadReport === 'function') {
                    downloadReport(reportType);
                } else {
                    console.error('downloadReport function not found');
                    showToast('Report function not loaded properly', 'error');
                }
            });
            
            // Add cursor pointer to indicate clickable
            card.style.cursor = 'pointer';
        }
    });
    
    // Load initial data
    if (typeof loadDashboardStats === 'function') {
        loadDashboardStats();
    }
    
    // Load tab-specific data
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
        const tabId = activeTab.id;
        initializeTab(tabId);
    }
});

// Function to initialize specific tabs
function initializeTab(tabId) {
    console.log(`Initializing tab: ${tabId}`);
    
    switch(tabId) {
        case 'manageTeachers':
            if (typeof loadClassConfigurations === 'function') loadClassConfigurations();
            if (typeof loadTeachersMasterList === 'function') loadTeachersMasterList();
            if (typeof loadGSTSettings === 'function') loadGSTSettings();
            break;
            
        case 'viewStudents':
            if (typeof loadStudents === 'function') loadStudents();
            // Refresh class dropdowns when viewing students
            if (typeof loadClassDropdowns === 'function') {
                setTimeout(loadClassDropdowns, 100);
            }
            break;
            
        case 'managePayments':
            if (typeof loadPaymentDashboard === 'function') loadPaymentDashboard();
            if (typeof loadPaymentStats === 'function') loadPaymentStats();
            break;
            
        case 'reports':
            // Initialize reports tab
            if (typeof initReportsTab === 'function') {
                initReportsTab();
            } else {
                console.warn('initReportsTab function not found, using fallback');
                initReportsTabFallback();
            }
            
            // Load class filter options for reports
            if (typeof loadClassFilterOptions === 'function') {
                loadClassFilterOptions();
            }
            
            // Also refresh main class dropdowns
            if (typeof loadClassDropdowns === 'function') {
                setTimeout(loadClassDropdowns, 100);
            }
            break;
            
        case 'receipts':
            // Initialize receipts tab
            console.log('🎫 Initializing Receipts tab');
            
            // Populate financial year dropdown
            if (typeof populateFinancialYearDropdown === 'function') {
                populateFinancialYearDropdown();
            } else {
                // Fallback: populate with last 5 years
                populateFYDropdownFallback();
            }
            
            // Load receipt history
            setTimeout(() => {
                if (window.receiptHistory) {
                    console.log('Loading receipts from existing receiptHistory instance');
                    window.receiptHistory.loadReceipts();
                } else if (typeof ReceiptHistory !== 'undefined') {
                    console.log('Creating new receiptHistory instance');
                    window.receiptHistory = new ReceiptHistory();
                } else {
                    console.warn('ReceiptHistory class not available yet, will retry...');
                    // Retry after a delay
                    setTimeout(() => {
                        if (typeof ReceiptHistory !== 'undefined') {
                            window.receiptHistory = new ReceiptHistory();
                        } else {
                            console.error('ReceiptHistory class still not available');
                            // Show error message in UI
                            showReceiptsErrorMessage();
                        }
                    }, 1000);
                }
            }, 200);
            
            // Setup event listeners for receipts tab
            setupReceiptsTabEvents();
            break;
            
        case 'dashboard':
            if (typeof loadDashboardStats === 'function') loadDashboardStats();
            if (typeof loadRecentStudents === 'function') loadRecentStudents();
            break;
            
        case 'bulkUpload':
            // Initialize bulk upload area
            const uploadArea = document.getElementById('uploadArea');
            if (uploadArea) {
                setupDragAndDrop();
            }
            break;
            
        case 'addStudent':
            // Initialize add student form
            if (typeof loadClassOptions === 'function') {
                loadClassOptions();
            }
            // Add initial class row if empty
            if (typeof addClassRow === 'function' && document.getElementById('classesContainer')?.children.length === 0) {
                addClassRow();
            }
            break;
    }
}

// Helper function to populate financial year dropdown (fallback)
function populateFYDropdownFallback() {
    const fySelect = document.getElementById('fy-select');
    if (!fySelect) return;
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentFY = currentMonth >= 4 
        ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` 
        : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
    
    // Generate last 5 financial years
    const years = [];
    const [startYear] = currentFY.split('-').map(Number);
    
    for (let i = 0; i < 5; i++) {
        const yearStart = startYear - i;
        const yearEnd = (yearStart + 1).toString().slice(-2);
        years.push(`${yearStart}-${yearEnd}`);
    }
    
    fySelect.innerHTML = years.map(year => 
        `<option value="${year}" ${year === currentFY ? 'selected' : ''}>${year}</option>`
    ).join('');
}

// Helper function to setup receipts tab events
function setupReceiptsTabEvents() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-receipts');
    if (refreshBtn) {
        // Remove existing listeners to avoid duplicates
        const newRefreshBtn = refreshBtn.cloneNode(true);
        refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
        
        newRefreshBtn.addEventListener('click', function() {
            console.log('Refreshing receipts...');
            if (window.receiptHistory) {
                window.receiptHistory.loadReceipts();
            } else if (typeof ReceiptHistory !== 'undefined') {
                window.receiptHistory = new ReceiptHistory();
            }
        });
    }
    
    // Search input with debounce
    const searchInput = document.getElementById('search-receipt');
    if (searchInput) {
        // Remove existing listeners
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        
        let searchTimeout;
        newSearchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (window.receiptHistory) {
                    window.receiptHistory.searchReceipt(e.target.value);
                }
            }, 500);
        });
    }
    
    // Financial year selector
    const fySelect = document.getElementById('fy-select');
    if (fySelect) {
        // Remove existing listeners
        const newFySelect = fySelect.cloneNode(true);
        fySelect.parentNode.replaceChild(newFySelect, fySelect);
        
        newFySelect.addEventListener('change', function(e) {
            console.log(`Changing financial year to: ${e.target.value}`);
            if (window.receiptHistory) {
                window.receiptHistory.loadReceipts(e.target.value);
            }
        });
    }
}

// Helper function to show error message in receipts tab
function showReceiptsErrorMessage() {
    const container = document.getElementById('receipt-history');
    if (container) {
        container.innerHTML = `
            <div class="error-message" style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <h3>Failed to load Receipt History</h3>
                <p>The receipt history module could not be loaded. Please check:</p>
                <ul style="list-style: none; padding: 0; margin-top: 10px;">
                    <li>✓ Ensure music-admin-receipt-history.js is properly linked</li>
                    <li>✓ Check browser console for errors</li>
                    <li>✓ Try refreshing the page</li>
                </ul>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 15px;">
                    <i class="fas fa-sync-alt"></i> Refresh Page
                </button>
            </div>
        `;
    }
}

// Also update the DOMContentLoaded event to preload receipt history
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded - initializing app');
    
    // Preload receipt history if on receipts tab
    const activeTab = document.querySelector('.tab-content.active')?.id || 'dashboard';
    
    // Initialize receipt history if needed
    if (activeTab === 'receipts' || document.getElementById('receipts')?.classList.contains('active')) {
        setTimeout(() => {
            if (typeof ReceiptHistory !== 'undefined' && !window.receiptHistory) {
                window.receiptHistory = new ReceiptHistory();
            }
        }, 500);
    }
    
    // Load initial data for active tab
    initializeTab(activeTab);
});

// Fallback for reports tab initialization
function initReportsTabFallback() {
    console.log('Using fallback reports initialization');
    
    // Set default dates to current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    
    if (fromDateInput) {
        fromDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
    }
    if (toDateInput) {
        toDateInput.value = lastDayOfMonth.toISOString().split('T')[0];
    }
    
    // Add sample class options if none exist
    const classFilter = document.getElementById('reportClassFilter');
    if (classFilter && classFilter.options.length <= 1) {
        const classes = ['Carnatic Vocal', 'Veena', 'Violin', 'Mridangam', 'Keyboard', 'Bharatanatyam'];
        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            classFilter.appendChild(option);
        });
    }
}

// Setup drag and drop for bulk upload
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadArea || !fileInput) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('highlight');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('highlight');
        });
    });
    
    uploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        if (typeof handleFileUpload === 'function') {
            handleFileUpload(fileInput);
        }
    });
    
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
}

// Enhanced showTab function to initialize tabs when switched
function showTab(tabName) {
    console.log(`Switching to tab: ${tabName}`);
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
        
        // Initialize the tab content
        initializeTab(tabName);
    }
    
    // Update active button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        
        // Get the tab name from onclick attribute or data attribute
        let btnTabName = '';
        if (btn.getAttribute('onclick')) {
            const match = btn.getAttribute('onclick').match(/['"]([^'"]+)['"]/);
            btnTabName = match ? match[1] : '';
        } else if (btn.dataset.tab) {
            btnTabName = btn.dataset.tab;
        }
        
        if (btnTabName === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Special handling for receipts tab to ensure proper loading
    if (tabName === 'receipts') {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            if (window.receiptHistory) {
                console.log('Loading receipts for current financial year...');
                window.receiptHistory.loadReceipts();
            } else {
                console.log('Initializing receipt history...');
                // If receiptHistory doesn't exist, create it
                if (typeof ReceiptHistory !== 'undefined') {
                    window.receiptHistory = new ReceiptHistory();
                } else {
                    console.error('ReceiptHistory class not loaded');
                    // Try to load the script dynamically
                    loadReceiptHistoryScript();
                }
            }
        }, 100);
    }
}

// Fallback function
function addFallbackClassRow() {
    const container = document.getElementById('classesContainer');
    if (!container || container.children.length > 0) return;
    
    const row = document.createElement('div');
    row.className = 'class-row';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1.5fr 1fr 1.5fr auto; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    row.innerHTML = `
        <select class="className" onchange="updateClassFee(this)" required style="height: 45px; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
            <option value="">Select Class</option>
            <option value="Carnatic Vocal - A" data-fee="250">Carnatic Vocal - A</option>
            <option value="Carnatic Vocal - B" data-fee="250">Carnatic Vocal - B</option>
            <option value="Carnatic Vocal - C" data-fee="250">Carnatic Vocal - C</option>
            <option value="Veena" data-fee="280">Veena</option>
            <option value="Violin" data-fee="250">Violin</option>
            <option value="Mridangam" data-fee="220">Mridangam</option>
            <option value="Keyboard" data-fee="300">Keyboard</option>
            <option value="Bharatanatyam" data-fee="320">Bharatanatyam</option>
        </select>
        <select class="instructor" style="height: 45px; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
            <option value="">Select Instructor</option>
            <option value="Smt. Karthiswari">Smt. Karthiswari</option>
            <option value="Smt. Radhika">Smt. Radhika</option>
            <option value="Sri. Murugan">Sri. Murugan</option>
            <option value="Sri. Gokulnath">Sri. Gokulnath</option>
            <option value="Sri. Annapparaj">Sri. Annapparaj</option>
            <option value="Sri. Padmasankar">Sri. Padmasankar</option>
        </select>
        <input type="number" class="monthlyFee" placeholder="Fee" readonly style="height: 45px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; background: #f8f9fa;">
        <input type="text" class="batchTiming" placeholder="Batch Timing" style="height: 45px; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
        <button type="button" onclick="removeClassRow(this)" class="btn" style="background:#e74c3c; color:white; padding:8px 12px; border:none; border-radius:6px; cursor:pointer; height:45px;">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(row);
}

// Modal close handlers
function setupModalCloseHandlers() {
    // Close on overlay click
    document.addEventListener('click', (event) => {
        const modals = {
            studentModal: 'closeModal',
            editTeacherModal: 'closeEditTeacherModal',
            editClassModal: 'closeEditClassModal'
        };
        
        for (const [modalId, closeFunc] of Object.entries(modals)) {
            const modal = document.getElementById(modalId);
            if (modal && event.target === modal) {
                if (typeof window[closeFunc] === 'function') {
                    window[closeFunc]();
                } else {
                    modal.style.display = 'none';
                }
            }
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const closeFuncs = ['closeModal', 'closeEditTeacherModal', 'closeEditClassModal'];
            closeFuncs.forEach(funcName => {
                if (typeof window[funcName] === 'function') {
                    window[funcName]();
                }
            });
        }
    });
    
    // Close buttons
    document.querySelectorAll('.modal-close, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = btn.closest('.modal-overlay');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Export functions for use in HTML
window.showTab = showTab;
window.initializeTab = initializeTab;
window.populateFYDropdownFallback = populateFYDropdownFallback;
window.setupReceiptsTabEvents = setupReceiptsTabEvents;
window.showReceiptsErrorMessage = showReceiptsErrorMessage;
window.initReportsTabFallback = initReportsTabFallback;
window.setupDragAndDrop = setupDragAndDrop;
window.addFallbackClassRow = addFallbackClassRow;
window.setupModalCloseHandlers = setupModalCloseHandlers;

// Make sure all report functions are available globally
// This ensures they're loaded even if music-admin-reports.js hasn't fully initialized
window.generateReport = window.generateReport || function() {
    console.warn('generateReport not fully loaded, using fallback');
    showToast('Report functions still loading. Please try again in a moment.', 'warning');
};

window.downloadReport = window.downloadReport || function(type) {
    console.warn('downloadReport not fully loaded');
    showToast('Report functions still loading. Please refresh the page.', 'warning');
};

// Check if report functions are loaded
setTimeout(() => {
    if (typeof generateReport !== 'function') {
        console.error('Report functions not loaded properly. Check script order.');
        // Try to load the reports script again
        const script = document.createElement('script');
        script.src = 'js/music-admin-reports.js';
        script.onload = () => console.log('Reports script reloaded');
        document.body.appendChild(script);
    } else {
        console.log('✅ Report functions loaded successfully');
    }
}, 500);