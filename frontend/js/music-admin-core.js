// ========== CONFIGURATION ==========
// Currently using music.js endpoints (no auth)
const API_BASE = `${window.location.origin}/api/music`;

// Should use musicAdmin.js endpoints (with auth)
const ADMIN_API_BASE = `${window.location.origin}/api/admin/music`;

// ========== UTILITY FUNCTIONS ==========

// Show toast message
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.warn('Toast element not found');
        alert(message);
        return;
    }
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Safe element click
function safeClick(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.click();
    } else {
        console.error(`Element with id "${elementId}" not found`);
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN');
    } catch {
        return dateString;
    }
}

// Helper function to format date for input type="date"
function formatDateForInput(dateValue) {
    if (!dateValue) return '';
    
    try {
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
        }
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return '';
    }
}

// Get status CSS class
function getStatusClass(status) {
    switch(status?.toLowerCase()) {
        case 'active': return 'status-active';
        case 'inactive': return 'status-inactive';
        case 'graduated': return 'status-success';
        case 'on_leave': return 'status-pending';
        default: return 'status-pending';
    }
}

// Get payment status CSS class
function getPaymentStatusClass(status) {
    switch(status?.toLowerCase()) {
        case 'paid': return 'status-paid';
        case 'pending': return 'status-pending';
        case 'overdue': return 'status-overdue';
        default: return 'status-pending';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ========== GST HELPER FUNCTIONS ==========

// Get current GST percentage
async function getGSTPercentage() {
    try {
        const response = await fetch(`${API_BASE}/gst-settings`);
        const data = await response.json();
        return data.gstPercentage || 18;
    } catch (error) {
        console.error('Error fetching GST:', error);
        return 18;
    }
}

// Calculate with GST
function calculateWithGST(amount, gstPercentage) {
    const gstAmount = (amount * gstPercentage / 100);
    return {
        baseAmount: amount,
        gstAmount: gstAmount,
        totalAmount: amount + gstAmount
    };
}

// Load class options from database - UPDATED with multiple endpoint fallbacks
async function loadClassDropdowns() {
    console.log('📚 Loading class options from database...');
    
    // Show loading state in dropdowns
    const classFilter = document.getElementById('classFilter');
    const reportFilter = document.getElementById('reportClassFilter');
    
    // Try multiple endpoints in order
    const endpoints = [
        `${API_BASE}/class-names`,           // New endpoint (may not exist yet)
        `${API_BASE}/class-configurations`,  // Existing endpoint that returns full configs
        `${API_BASE}/class-names-list`,      // Another possible endpoint
        `${API_BASE}/classes`                 // Another possible endpoint
    ];
    
    let classNames = [];
    let success = false;
    
    for (const endpoint of endpoints) {
        try {
            console.log(`Trying endpoint: ${endpoint}`);
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                console.log(`Endpoint ${endpoint} failed with status ${response.status}`);
                continue;
            }
            
            const data = await response.json();
            
            // Handle different response formats
            if (data.success && data.classNames) {
                // Format 1: { success: true, classNames: [...] }
                classNames = data.classNames;
                success = true;
                break;
            } else if (data.success && data.configurations) {
                // Format 2: { success: true, configurations: [...] }
                classNames = data.configurations.map(c => c.className);
                success = true;
                break;
            } else if (Array.isArray(data)) {
                // Format 3: Direct array of class objects
                classNames = data.map(c => c.className || c.name);
                success = true;
                break;
            } else if (data.classNames) {
                // Format 4: { classNames: [...] }
                classNames = data.classNames;
                success = true;
                break;
            }
        } catch (error) {
            console.log(`Endpoint ${endpoint} error:`, error.message);
            continue;
        }
    }
    
    if (success && classNames.length > 0) {
        // Remove any null/undefined values and sort
        classNames = classNames.filter(name => name).sort();
        
        console.log('✅ Loaded class names:', classNames);
        
        // Update View Students filter
        if (classFilter) {
            // Keep the "All Classes" option
            while (classFilter.options.length > 1) {
                classFilter.remove(1);
            }
            
            // Add all class names from database
            classNames.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                classFilter.appendChild(option);
            });
            
            console.log(`✅ Added ${classNames.length} classes to classFilter`);
        }
        
        // Update Reports filter
        if (reportFilter) {
            while (reportFilter.options.length > 1) {
                reportFilter.remove(1);
            }
            
            classNames.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                reportFilter.appendChild(option);
            });
            
            console.log(`✅ Added ${classNames.length} classes to reportFilter`);
        }
        
        // Store in localStorage for offline fallback
        try {
            localStorage.setItem('cachedClassNames', JSON.stringify(classNames));
            localStorage.setItem('classNamesCacheTime', Date.now().toString());
        } catch (e) {
            // Ignore localStorage errors
        }
        
    } else {
        console.warn('All endpoints failed, using fallback options');
        loadFallbackClassOptions();
    }
}

// Enhanced fallback function with your new class names
function loadFallbackClassOptions() {
    console.log('📋 Loading fallback class options');
    
    const fallbackClasses = [
        'Carnatic Vocal - A',
        'Carnatic Vocal - B', 
        'Carnatic Vocal - C',
        'Veena',
        'Mridangam',
        'Violin',
        'Keyboard',
        'Bharatanatyam'
    ];
    
    const classFilter = document.getElementById('classFilter');
    if (classFilter) {
        while (classFilter.options.length > 1) classFilter.remove(1);
        fallbackClasses.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            classFilter.appendChild(option);
        });
        console.log(`✅ Added ${fallbackClasses.length} fallback classes to classFilter`);
    }
    
    const reportFilter = document.getElementById('reportClassFilter');
    if (reportFilter) {
        while (reportFilter.options.length > 1) reportFilter.remove(1);
        fallbackClasses.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            reportFilter.appendChild(option);
        });
        console.log(`✅ Added ${fallbackClasses.length} fallback classes to reportFilter`);
    }
}

// Add a manual refresh function
async function refreshClassDropdowns() {
    console.log('🔄 Manually refreshing class dropdowns...');
    
    // Clear any cached data for this session
    const classFilter = document.getElementById('classFilter');
    const reportFilter = document.getElementById('reportClassFilter');
    
    // Reset to just "All Classes"
    if (classFilter) {
        while (classFilter.options.length > 1) {
            classFilter.remove(1);
        }
    }
    
    if (reportFilter) {
        while (reportFilter.options.length > 1) {
            reportFilter.remove(1);
        }
    }
    
    // Reload from API
    await loadClassDropdowns();
    showToast('Class list refreshed');
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for API_BASE to be defined
    setTimeout(() => {
        loadClassDropdowns();
    }, 500);
});

// Also call when switching to View Students or Reports tabs
function refreshClassDropdownsOnTab(tabName) {
    if (tabName === 'viewStudents' || tabName === 'reports') {
        loadClassDropdowns();
    }
}

// ========== TAB NAVIGATION ==========

function showTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Activate corresponding tab button
    const tabNames = {
        'dashboard': 'dashboard',
        'addStudent': 'add student',
        'viewStudents': 'view students',
        'managePayments': 'manage payments',
        'bulkUpload': 'bulk upload',
        'reports': 'reports',
        'manageTeachers': 'teachers & fees'
    };
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const btnText = btn.textContent.toLowerCase();
        if (btnText.includes(tabNames[tabId] || tabId.toLowerCase())) {
            btn.classList.add('active');
        }
    });
    
    // Load data if needed
    switch(tabId) {
        case 'viewStudents':
            loadStudents();
            break;
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'managePayments':
            loadPaymentDashboard();
            break;
        case 'manageTeachers':
            loadClassConfigurations();
            loadTeachersMasterList();
            loadGSTSettings();
            break;
        case 'reports':
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const fromDate = document.getElementById('fromDate');
            const toDate = document.getElementById('toDate');
            if (fromDate) fromDate.value = firstDay.toISOString().split('T')[0];
            if (toDate) toDate.value = today.toISOString().split('T')[0];
            break;
    }
}

// ========== DASHBOARD FUNCTIONS ==========

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/dashboard-stats`);
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats || {};
            
            // Update stats cards
            const statsContainer = document.getElementById('statsContainer');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalStudents || 0}</div>
                        <div class="stat-label">Total Students</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.activeStudents || 0}</div>
                        <div class="stat-label">Active Students</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.pendingPayments || 0}</div>
                        <div class="stat-label">Pending Payments</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">₹${stats.totalCollection || 0}</div>
                        <div class="stat-label">This Month Collection</div>
                    </div>
                `;
            }
            
            // Update recent students
            const recentContainer = document.getElementById('recentStudents');
            if (recentContainer) {
                let recentHTML = '<div style="display: flex; flex-direction: column; gap: 10px;">';
                (data.recentStudents || []).forEach(student => {
                    recentHTML += `
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; cursor: pointer;" onclick="viewStudent('${student.studentId}')">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>${escapeHtml(student.name)}</strong><br>
                                    <small>${escapeHtml(student.studentId)}</small>
                                </div>
                                <span class="status-badge ${getStatusClass(student.status)}">
                                    ${student.status || 'pending'}
                                </span>
                            </div>
                        </div>
                    `;
                });
                recentHTML += '</div>';
                recentContainer.innerHTML = recentHTML;
            }
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showToast('Failed to load dashboard stats', 'error');
    }
}

// ========== REFRESH FUNCTIONS ==========

function refreshStats() {
    loadDashboardStats();
    showToast('Dashboard refreshed successfully');
}

function viewPendingPayments() {
    showTab('managePayments');
    setTimeout(() => {
        const pendingSection = document.querySelector('.payment-card');
        if (pendingSection) {
            pendingSection.scrollIntoView({ behavior: 'smooth' });
        }
    }, 100);
}

function viewOverduePayments() {
    showTab('managePayments');
    setTimeout(() => {
        const overdueSection = document.querySelectorAll('.payment-card')[1];
        if (overdueSection) {
            overdueSection.scrollIntoView({ behavior: 'smooth' });
        }
    }, 100);
}

function viewPaidPayments() {
    showTab('managePayments');
    setTimeout(() => {
        const paidSection = document.querySelectorAll('.payment-card')[2];
        if (paidSection) {
            paidSection.scrollIntoView({ behavior: 'smooth' });
        }
    }, 100);
}

// ========== MODAL FUNCTIONS ==========

// Modal close functions
function closeEditTeacherModal() {
    const modal = document.getElementById('editTeacherModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeEditClassModal() {
    const modal = document.getElementById('editClassModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeModal() {
    const modal = document.getElementById('studentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showModalTab(tabName) {
    console.log('📌 Switching to tab:', tabName);
    
    // Hide all tab contents
    document.querySelectorAll('.modal-tab-content').forEach(tab => {
        if (tab.style) tab.style.display = 'none';
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show the selected tab
    const targetTab = document.getElementById(`modal${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);
    if (targetTab) {
        targetTab.style.display = 'block';
    }
    
    // Mark active button
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tabName.toLowerCase())) {
            btn.classList.add('active');
        }
    });
    
    // SPECIAL HANDLING FOR EDIT TAB
    if (tabName === 'edit') {
        console.log('🎵 Edit tab activated - initializing class dropdown...');
        
        // Function to initialize classes
        function initEditClasses() {
            const classSelect = document.getElementById('editClasses');
            const studentId = document.getElementById('editStudentId')?.value;
            
            console.log('🔍 Checking editClasses:', classSelect ? 'Found' : 'Not found', 'Student ID:', studentId);
            
            if (classSelect && studentId && typeof window.initializeEditModalClasses === 'function') {
                console.log('✅ Calling initializeEditModalClasses');
                window.initializeEditModalClasses();
                return true;
            }
            return false;
        }
        
        // Try immediately
        if (!initEditClasses()) {
            console.log('⏳ Elements not ready, will retry...');
            let attempts = 0;
            const maxAttempts = 15;
            
            const timer = setInterval(() => {
                attempts++;
                console.log(`Retry attempt ${attempts}/${maxAttempts}`);
                
                if (initEditClasses() || attempts >= maxAttempts) {
                    clearInterval(timer);
                    if (attempts >= maxAttempts) {
                        console.error('❌ Failed to initialize edit classes after', maxAttempts, 'attempts');
                        
                        // Show manual retry button as fallback
                        const classSelect = document.getElementById('editClasses');
                        if (classSelect && classSelect.options.length === 0) {
                            classSelect.innerHTML = '<option value="" disabled>Click to load classes</option>';
                            
                            const retryBtn = document.createElement('button');
                            retryBtn.textContent = '🔄 Load Classes';
                            retryBtn.className = 'btn btn-sm btn-secondary';
                            retryBtn.style.marginTop = '10px';
                            retryBtn.onclick = function() {
                                this.disabled = true;
                                this.textContent = 'Loading...';
                                if (typeof window.initializeEditModalClasses === 'function') {
                                    window.initializeEditModalClasses();
                                }
                                setTimeout(() => {
                                    this.disabled = false;
                                    this.textContent = '🔄 Load Classes';
                                }, 2000);
                            };
                            
                            // Add button after the select
                            if (!document.getElementById('manual-retry-btn')) {
                                retryBtn.id = 'manual-retry-btn';
                                classSelect.parentNode.appendChild(retryBtn);
                            }
                        }
                    }
                }
            }, 300);
        }
    }
}

function initializeModalEvents() {
    // Close modal when clicking outside
    document.addEventListener('click', function(event) {
        const modal = document.getElementById('studentModal');
        if (modal && event.target === modal) {
            closeModal();
        }
        
        const teacherModal = document.getElementById('editTeacherModal');
        if (teacherModal && event.target === teacherModal) {
            closeEditTeacherModal();
        }
        
        const classModal = document.getElementById('editClassModal');
        if (classModal && event.target === classModal) {
            closeEditClassModal();
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
            closeEditTeacherModal();
            closeEditClassModal();
        }
    });
}

// Make core utility functions globally available
window.showTab = showTab;
window.showToast = showToast;
window.formatDate = formatDate;
window.getStatusClass = getStatusClass;
window.getPaymentStatusClass = getPaymentStatusClass;
window.escapeHtml = escapeHtml;
window.refreshStats = refreshStats;
window.viewPendingPayments = viewPendingPayments;
window.viewOverduePayments = viewOverduePayments;
window.viewPaidPayments = viewPaidPayments;
window.closeModal = closeModal;
window.closeEditTeacherModal = closeEditTeacherModal;
window.closeEditClassModal = closeEditClassModal;
window.showModalTab = showModalTab;
window.initializeModalEvents = initializeModalEvents;