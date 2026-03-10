// ========== CONFIGURATION ==========
const API_BASE = `${window.location.origin}/api/music`;  // Single source of truth

// ========== UTILITY FUNCTIONS ==========

// Show toast message
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.warn('Toast element not found');
        alert(message); // Fallback
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
        // If it's already a string in YYYY-MM-DD format, return it
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
        }
        
        // Convert to Date object
        const date = new Date(dateValue);
        
        // Check if date is valid
        if (isNaN(date.getTime())) return '';
        
        // Format as YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error('Error formatting date:', e);
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

// ========== GST HELPER FUNCTIONS ==========
// 👈 ADD THESE RIGHT HERE

// Get current GST percentage
async function getGSTPercentage() {
    try {
        const response = await fetch(`${API_BASE}/gst-settings`);
        const data = await response.json();
        return data.gstPercentage || 18;
    } catch (error) {
        console.error('Error fetching GST:', error);
        return 18; // Default to 18%
    }
}

// Calculate total with GST
function calculateWithGST(amount, gstPercentage) {
    const gstAmount = (amount * gstPercentage / 100);
    return {
        baseAmount: amount,
        gstAmount: gstAmount,
        totalAmount: amount + gstAmount
    };
}

// ========== TAB NAVIGATION ==========

// Find this function in your code (around line 260)
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
        'reports': 'reports'
    };
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const btnText = btn.textContent.toLowerCase();
        if (btnText.includes(tabNames[tabId] || tabId.toLowerCase())) {
            btn.classList.add('active');
        }
    });
    
    // Load data if needed
    if (tabId === 'viewStudents') {
        loadStudents();
    } else if (tabId === 'dashboard') {
        loadDashboardStats();
    } else if (tabId === 'managePayments') {
        loadPaymentDashboard();
    } else if (tabId === 'reports') {
        // Set default dates for reports
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const fromDate = document.getElementById('fromDate');
        const toDate = document.getElementById('toDate');
        if (fromDate) fromDate.value = firstDay.toISOString().split('T')[0];
        if (toDate) toDate.value = today.toISOString().split('T')[0];
    }
    else if (tabId === 'manageTeachers') {
        loadClassConfigurations(); // Load class configs
        loadTeachersMasterList(); // 👈 ADD THIS LINE to show teachers list
        loadGSTSettings(); // Load GST settings
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
                    const joinDate = new Date(student.joinDate).toLocaleDateString();
                    recentHTML += `
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${student.name || 'Unknown'}</strong><br>
                                <small>${student.className || 'No class'} • ID: ${student.studentId || 'N/A'}</small>
                            </div>
                            <span class="status-badge ${getStatusClass(student.status)}">
                                ${student.status || 'pending'}
                            </span>
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

// New function to update fee when class is selected
function updateClassFee(select) {
    const selectedOption = select.options[select.selectedIndex];
    const fee = selectedOption.getAttribute('data-fee') || 0;
    const row = select.closest('.class-row');
    const feeInput = row.querySelector('.monthlyFee');
    
    if (feeInput) {
        feeInput.value = fee;
    }
    
    updateTotalFee();
}

// Also update the handleAddStudent function to use the auto-populated fee
// No changes needed there as it already reads from the fee input

function removeClassRow(btn) {
    const row = btn.closest('.class-row');
    if (row && document.querySelectorAll('.class-row').length > 1) {
        row.remove();
        updateTotalFee();
    } else {
        showToast('At least one class is required', 'warning');
    }
}

function updateTotalFee() {
    let total = 0;
    document.querySelectorAll('.class-row').forEach(row => {
        const feeInput = row.querySelector('.monthlyFee');
        const fee = parseInt(feeInput?.value) || 0;
        total += fee;
    });
    
    const totalDisplay = document.getElementById('totalMonthlyFee');
    if (totalDisplay) {
        totalDisplay.textContent = total;
    }
}

// ========== STUDENT MANAGEMENT ==========

async function handleAddStudent(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    let originalText = '';
    if (submitBtn) {
        originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        submitBtn.disabled = true;
    }
    
    try {
        // Basic Details
        const name = document.getElementById('name')?.value?.trim();
        const email = document.getElementById('email')?.value?.trim();
        const phone = document.getElementById('phone')?.value?.trim();
        const dateOfBirth = document.getElementById('dateOfBirth')?.value || null;
        const gender = document.getElementById('gender')?.value || '';
        
        if (!name || !email || !phone) {
            throw new Error('Please fill all required basic details');
        }
        
        // Validate email format
        if (!isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }
        
        // Validate phone (10 digits, starts with 6-9)
        const cleanPhone = phone.replace(/\D/g, '');
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
            throw new Error('Phone number must be 10 digits starting with 6-9');
        }
        
        // ===== MULTIPLE CLASSES =====
        const classes = [];
        let totalMonthlyFee = 0;
        
        document.querySelectorAll('.class-row').forEach(row => {
            const className = row.querySelector('.className')?.value;
            const instructor = row.querySelector('.instructor')?.value;
            const monthlyFee = parseInt(row.querySelector('.monthlyFee')?.value) || 0;
            const batchTiming = row.querySelector('.batchTiming')?.value || '';
            
            if (className && monthlyFee > 0) {
                classes.push({
                    className,
                    instructor: instructor || 'Not Assigned',
                    monthlyFee,
                    batchTiming
                });
                totalMonthlyFee += monthlyFee;
            }
        });
        
        if (classes.length === 0) {
            throw new Error('Please add at least one class with valid fee');
        }
        
        // ===== ADDRESS =====
        const address = {
            street: document.getElementById('street')?.value || '',
            city: document.getElementById('city')?.value || '',
            state: document.getElementById('state')?.value || '',
            pincode: document.getElementById('pincode')?.value || ''
        };
        
        // ===== GUARDIAN =====
        const guardianName = document.getElementById('guardianName')?.value || '';
        const guardianPhone = document.getElementById('guardianPhone')?.value || '';
        const notes = document.getElementById('notes')?.value || '';
        
        // ===== FINAL OBJECT =====
        const studentData = {
            name,
            email,
            phone: cleanPhone,
            dateOfBirth,
            gender,
            address,
            guardianName,
            guardianPhone: guardianPhone.replace(/\D/g, ''),
            notes,
            classes,
            totalMonthlyFee
        };
        
        console.log('🚀 Sending student:', studentData);
        
        const response = await fetch(`${API_BASE}/add-student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData)
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to add student');
        }
        
        showToast(`✅ Student added successfully! Total Monthly Fee: ₹${totalMonthlyFee}`);
        
        // Reset form
        form.reset();
        const container = document.getElementById('classesContainer');
        if (container) {
            container.innerHTML = '';
            addClassRow();
        }
        updateTotalFee();
        
        // Refresh data
        loadDashboardStats();
        loadStudents();
        showTab('viewStudents');
        
    } catch (error) {
        console.error('Error adding student:', error);
        showToast(error.message || 'Error adding student', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// Helper function to validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ========== LOAD STUDENTS ==========

async function loadStudents() {
    try {
        const status = document.getElementById('statusFilter')?.value || '';
        const className = document.getElementById('classFilter')?.value || '';
        const search = document.getElementById('searchInput')?.value || '';
        
        let url = `${API_BASE}/students?limit=100`;
        if (status) url += `&status=${status}`;
        if (className) url += `&className=${encodeURIComponent(className)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('studentsTableContainer');
            if (!container) return;
            
            if (!data.students || data.students.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 50px; background: #f8f9fa; border-radius: 8px;">
                        <i class="fas fa-users" style="font-size: 48px; color: #bdc3c7; margin-bottom: 20px;"></i>
                        <h3 style="color: #7f8c8d;">No students found</h3>
                        <p>Try adjusting your filters or add a new student</p>
                        <button class="btn btn-primary" onclick="showTab('addStudent')">
                            <i class="fas fa-plus"></i> Add Student
                        </button>
                    </div>
                `;
                return;
            }
            
            let tableHTML = `
                <table class="students-table">
                    <thead>
                        <tr>
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Classes</th>
                            <th>Total Fee (₹)</th>
                            <th>Status</th>
                            <th>Join Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.students.forEach(student => {
                const joinDate = student.joinDate ? new Date(student.joinDate).toLocaleDateString() : 'N/A';
                const safeName = (student.name || '').replace(/'/g, "\\'");
                
                let classListHTML = '';
                let totalFee = 0;
                
                // Multi-Class Format
                if (student.classes && student.classes.length > 0) {
                    classListHTML = student.classes.map(cls => `
                        <div style="margin-bottom:4px;">
                            <strong>${cls.className || 'Unknown'}</strong><br>
                            <small style="color:#7f8c8d;">
                                ${cls.instructor || 'No instructor'} | ₹${cls.monthlyFee || 0}
                            </small>
                        </div>
                    `).join('');
                    totalFee = student.totalMonthlyFee || 0;
                }
                // Single-Class Format (Fallback)
                else if (student.className) {
                    classListHTML = `
                        <div style="margin-bottom:4px;">
                            <strong>${student.className}</strong><br>
                            <small style="color:#7f8c8d;">
                                ${student.instructor || 'No instructor'} | ₹${student.monthlyFee || 0}
                            </small>
                        </div>
                    `;
                    totalFee = student.monthlyFee || 0;
                } else {
                    classListHTML = `<span style="color:#e74c3c;">No classes</span>`;
                }
                
                tableHTML += `
                    <tr>
                        <td><strong>${student.studentId || 'N/A'}</strong></td>
                        <td>
                            ${student.name || 'Unknown'}<br>
                            <small style="color: #7f8c8d;">${student.email || ''}</small>
                        </td>
                        <td>${classListHTML}</td>
                        <td><strong>₹${totalFee}</strong></td>
                        <td>
                            <span class="status-badge ${getStatusClass(student.status)}">
                                ${student.status || 'pending'}
                            </span>
                        </td>
                        <td>${joinDate}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="action-btn" style="background: #3498db; color: white;" 
                                        onclick="viewStudent('${student.studentId}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="action-btn" style="background: #27ae60; color: white;" 
                                        onclick="editStudent('${student.studentId}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn" style="background: #e74c3c; color: white;" 
                                        onclick="deleteStudent('${student.studentId}', '${safeName}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            tableHTML += `
                    </tbody>
                </table>
                <div style="margin-top: 20px; color: #7f8c8d;">
                    Showing ${data.students.length} of ${data.total || data.students.length} students
                </div>
            `;
            
            container.innerHTML = tableHTML;
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Failed to load students', 'error');
    }
}

// ========== STUDENT SEARCH & FILTER ==========

function searchStudents() {
    const searchTerm = document.getElementById('searchInput')?.value || '';
    if (searchTerm.length === 0 || searchTerm.length > 2) {
        loadStudents();
    }
}

function resetFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const classFilter = document.getElementById('classFilter');
    const searchInput = document.getElementById('searchInput');
    
    if (statusFilter) statusFilter.value = '';
    if (classFilter) classFilter.value = '';
    if (searchInput) searchInput.value = '';
    
    loadStudents();
}

// ========== STUDENT CRUD OPERATIONS ==========
async function viewStudent(studentId) {
    if (!studentId) {
        showToast('Invalid student ID', 'error');
        return;
    }
    
    try {
        // Using plural /students/ endpoint consistently
        const response = await fetch(`${API_BASE}/students/${studentId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showToast('Student not found', 'error');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            const student = data.student;
            
            // Format dates
            const dob = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'Not provided';
            const joinDate = student.joinDate ? new Date(student.joinDate).toLocaleDateString() : 'N/A';
            const lastPayment = student.lastPaymentDate ? 
                new Date(student.lastPaymentDate).toLocaleDateString() : 'No payments yet';
            const nextDue = student.nextPaymentDue ? 
                new Date(student.nextPaymentDue).toLocaleDateString() : 'Not set';
            
            // Calculate age
            let age = 'N/A';
            if (student.dateOfBirth) {
                const birthDate = new Date(student.dateOfBirth);
                const today = new Date();
                age = today.getFullYear() - birthDate.getFullYear();
            }
            
            // Get payment history
            let paymentHistoryHTML = '<p style="color: #7f8c8d; text-align: center;">Loading payment history...</p>';
            try {
                const paymentResponse = await fetch(`${API_BASE}/payments/student/${studentId}`);
                const paymentData = await paymentResponse.json();
                
                if (paymentData.success && paymentData.payments?.length > 0) {
                    paymentHistoryHTML = '<div style="margin-top: 20px;">';
                    paymentData.payments.slice(0, 5).forEach(payment => {
                        const paymentDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A';
                        paymentHistoryHTML += `
                            <div class="payment-history-item">
                                <div style="display: flex; justify-content: space-between;">
                                    <div>
                                        <strong>${payment.month || 'N/A'}</strong><br>
                                        <small>Paid on: ${paymentDate}</small>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 1.2rem; font-weight: bold; color: #2c3e50;">₹${payment.amount || 0}</div>
                                        <span style="font-size: 0.8em; background: #e8f4fc; padding: 2px 8px; border-radius: 10px;">
                                            ${payment.paymentMethod || 'Cash'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    if (paymentData.payments.length > 5) {
                        paymentHistoryHTML += `<p style="text-align: center; color: #7f8c8d;">... and ${paymentData.payments.length - 5} more payments</p>`;
                    }
                    paymentHistoryHTML += '</div>';
                } else {
                    paymentHistoryHTML = '<p style="color: #7f8c8d; text-align: center;">No payment history found</p>';
                }
            } catch (error) {
                console.error('Error loading payment history:', error);
                paymentHistoryHTML = '<p style="color: #e74c3c; text-align: center;">Failed to load payment history</p>';
            }
            
            // Class details HTML
            let classDetailsHTML = '';
            if (student.classes && student.classes.length > 0) {
                classDetailsHTML = student.classes.map(cls => {
                    // Format class name for display (remove "Carnatic " prefix if needed)
                    let displayClassName = cls.className || 'Unknown';
                    if (displayClassName === 'Carnatic Veena') displayClassName = 'Veena';
                    if (displayClassName === 'Carnatic Violin') displayClassName = 'Violin';
                    
                    return `
                    <div style="margin-bottom:12px;padding:10px;background:#ffffff;border-radius:8px;border:1px solid #eee;">
                        <strong style="color:#2c3e50;">${displayClassName}</strong><br>
                        <small>Instructor: ${cls.instructor || 'Not Assigned'}</small><br>
                        <small>Batch: ${cls.batchTiming || 'Not Scheduled'}</small><br>
                        <strong style="color:#27ae60;">₹${cls.monthlyFee || 0}</strong>
                    </div>
                `}).join('');
            } else if (student.className) {
                // Single class format
                let displayClassName = student.className;
                if (displayClassName === 'Carnatic Veena') displayClassName = 'Veena';
                if (displayClassName === 'Carnatic Violin') displayClassName = 'Violin';
                
                classDetailsHTML = `
                    <div style="margin-bottom:12px;padding:10px;background:#ffffff;border-radius:8px;border:1px solid #eee;">
                        <strong style="color:#2c3e50;">${displayClassName}</strong><br>
                        <small>Instructor: ${student.instructor || 'Not Assigned'}</small><br>
                        <small>Batch: ${student.batchTiming || 'Not Scheduled'}</small><br>
                        <strong style="color:#27ae60;">₹${student.monthlyFee || 0}</strong>
                    </div>
                `;
            } else {
                classDetailsHTML = '<span style="color:#e74c3c;">No classes assigned</span>';
            }
            
            // Build modal content
            const modalContent = `
                <div class="modal-tabs">
                    <button class="modal-tab-btn active" onclick="showModalTab('details')">Details</button>
                    <button class="modal-tab-btn" onclick="showModalTab('payments')">Payments</button>
                    <button class="modal-tab-btn" onclick="showModalTab('edit')">Edit</button>
                </div>
                
                <div id="modalDetailsTab" class="modal-tab-content">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 25px;">
                        <div>
                            <h4 style="color: #34495e; margin-bottom: 10px;">Personal Information</h4>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                <div style="margin-bottom: 8px;">
                                    <strong>Student ID:</strong> ${student.studentId || 'N/A'}
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>Full Name:</strong> ${student.name || 'N/A'}
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>Email:</strong> ${student.email || 'N/A'}
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>Phone:</strong> ${student.phone || 'N/A'}
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>Date of Birth:</strong> ${dob} ${age !== 'N/A' ? `(${age} years)` : ''}
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>Gender:</strong> ${student.gender || 'Not specified'}
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h4 style="color: #34495e; margin-bottom: 10px;">Academic Information</h4>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                ${classDetailsHTML}
                                <div style="margin-top:10px;">
                                    <strong>Total Monthly Fee:</strong>
                                    <span style="font-size:1.3rem; color:#27ae60;">
                                        ₹${student.totalMonthlyFee || student.monthlyFee || 0}
                                    </span>
                                </div>
                                <div style="margin-top:10px;">
                                    <strong>Status:</strong>
                                    <span class="status-badge ${getStatusClass(student.status)}">
                                        ${student.status || 'pending'}
                                    </span>
                                </div>
                                <div style="margin-top:8px;">
                                    <strong>Join Date:</strong> ${joinDate}
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h4 style="color: #34495e; margin-bottom: 10px;">Payment Information</h4>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                <div style="margin-bottom: 8px;">
                                    <strong>Last Payment:</strong> ${lastPayment}
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>Next Due Date:</strong> ${nextDue}
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>Payment Status:</strong> 
                                    <span class="payment-status-badge ${getPaymentStatusClass(student.paymentStatus)}">
                                        ${student.paymentStatus || 'Pending'}
                                    </span>
                                </div>
                                <div style="margin-top: 15px;">
                                    <button class="btn btn-primary" onclick="markPaymentForStudent('${student.studentId}', '${student.name}')">
                                        <i class="fas fa-rupee-sign"></i> Mark Payment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <h4 style="color: #34495e; margin: 20px 0 10px 0;">Address Information</h4>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        ${student.address?.street ? `<div><strong>Street:</strong> ${student.address.street}</div>` : ''}
                        ${student.address?.city ? `<div><strong>City:</strong> ${student.address.city}</div>` : ''}
                        ${student.address?.state ? `<div><strong>State:</strong> ${student.address.state}</div>` : ''}
                        ${student.address?.pincode ? `<div><strong>Pincode:</strong> ${student.address.pincode}</div>` : ''}
                        ${!student.address?.street && !student.address?.city ? 
                            '<div style="color: #7f8c8d;">No address information provided</div>' : ''}
                    </div>
                    
                    ${student.guardianName || student.guardianPhone ? `
                        <h4 style="color: #34495e; margin: 20px 0 10px 0;">Guardian Information</h4>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            ${student.guardianName ? `<div><strong>Name:</strong> ${student.guardianName}</div>` : ''}
                            ${student.guardianPhone ? `<div><strong>Phone:</strong> ${student.guardianPhone}</div>` : ''}
                        </div>
                    ` : ''}
                    
                    ${student.notes ? `
                        <h4 style="color: #34495e; margin: 20px 0 10px 0;">Additional Notes</h4>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            ${student.notes}
                        </div>
                    ` : ''}
                </div>
                
                <div id="modalPaymentsTab" class="modal-tab-content" style="display: none;">
                    <h4 style="color: #34495e; margin-bottom: 15px;">Payment History for ${student.name}</h4>
                    ${paymentHistoryHTML}
                    
                    <div style="margin-top: 20px; text-align: center;">
                        <button class="btn btn-secondary" onclick="viewAllPayments('${student.studentId}')">
                            <i class="fas fa-list"></i> View All Payments
                        </button>
                        <button class="btn btn-primary" onclick="markPaymentForStudent('${student.studentId}', '${student.name}')" style="margin-left: 10px;">
                            <i class="fas fa-plus"></i> Add New Payment
                        </button>
                    </div>
                </div>
                
                <div id="modalEditTab" class="modal-tab-content" style="display: none;">
                    <h4 style="color: #34495e; margin-bottom: 20px;">Edit Student Information</h4>
                    <form id="editStudentForm" onsubmit="updateStudent('${student.studentId}'); return false;">
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="editName">Full Name *</label>
                                <input type="text" id="editName" value="${student.name || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="editEmail">Email Address *</label>
                                <input type="email" id="editEmail" value="${student.email || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="editPhone">Phone Number *</label>
                                <input type="tel" id="editPhone" value="${student.phone || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="editDateOfBirth">Date of Birth</label>
                                <input type="date" id="editDateOfBirth" value="${formatDateForInput(student.dateOfBirth)}">
                            </div>
                            
                            <div class="form-group">
                                <label for="editGender">Gender</label>
                                <select id="editGender">
                                    <option value="">Select Gender</option>
                                    <option value="male" ${student.gender === 'male' ? 'selected' : ''}>Male</option>
                                    <option value="female" ${student.gender === 'female' ? 'selected' : ''}>Female</option>
                                    <option value="other" ${student.gender === 'other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="editStatus">Status</label>
                                <select id="editStatus">
                                    <option value="active" ${student.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${student.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    <option value="graduated" ${student.status === 'graduated' ? 'selected' : ''}>Graduated</option>
                                    <option value="on_leave" ${student.status === 'on_leave' ? 'selected' : ''}>On Leave</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- CLASSES SECTION - EDITABLE -->
                        <h4 style="margin: 25px 0 15px 0; color: #34495e;">
                            <i class="fas fa-music"></i> Classes Attending
                            <button type="button" class="btn btn-secondary" onclick="addEditClassRow()" style="margin-left: 15px; padding: 5px 10px; font-size: 0.9rem;">
                                <i class="fas fa-plus"></i> Add Another Class
                            </button>
                        </h4>
                        
                        <div id="editClassesContainer">
                            <!-- Classes will be loaded here dynamically -->
                        </div>
                        
                        <div style="margin-top: 15px; background: #f0f7ff; padding: 10px; border-radius: 8px;">
                            <strong>Total Monthly Fee: ₹<span id="editTotalMonthlyFee">${student.totalMonthlyFee || student.monthlyFee || 0}</span></strong>
                        </div>
                        
                        <div class="form-group" style="margin-top: 20px;">
                            <label for="editNotes">Additional Notes</label>
                            <textarea id="editNotes" rows="3">${student.notes || ''}</textarea>
                        </div>
                        
                        <div style="display: flex; gap: 15px; margin-top: 20px;">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="showModalTab('details')">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </form>
                </div>
            `;
            
            // Set modal content and show
            const modalTitleElement = document.getElementById('modalTitle');
            const modalContentElement = document.getElementById('modalContent');
            const studentModalElement = document.getElementById('studentModal');

            if (modalTitleElement) {
                modalTitleElement.textContent = `Student: ${student.name}`;
            }

            if (modalContentElement) {
                modalContentElement.innerHTML = modalContent;
            }

            if (studentModalElement) {
                studentModalElement.style.display = 'flex';
            }
            
        } else {
            showToast('Failed to load student details', 'error');
        }
    } catch (error) {
        console.error('Error viewing student:', error);
        showToast('Failed to load student details: ' + error.message, 'error');
    }
}

function editStudent(studentId) {
    viewStudent(studentId);
    // Wait for modal to load, then switch to edit tab
    setTimeout(() => {
        showModalTab('edit');
    }, 500);
}

// Update fee when class selection changes
function updateEditClassFee(select) {
    const selectedOption = select.options[select.selectedIndex];
    const fee = selectedOption.getAttribute('data-fee') || 0;
    const row = select.closest('.class-row');
    const feeInput = row.querySelector('.editMonthlyFee');
    
    if (feeInput) {
        feeInput.value = fee;
    }
    
    updateEditTotalFee();
}

// Update total fee in edit mode
function updateEditTotalFee() {
    let total = 0;
    document.querySelectorAll('.class-row').forEach(row => {
        const feeInput = row.querySelector('.editMonthlyFee');
        const fee = parseInt(feeInput?.value) || 0;
        total += fee;
    });
    
    const totalDisplay = document.getElementById('editTotalMonthlyFee');
    if (totalDisplay) {
        totalDisplay.textContent = total;
    }
}

// Updated updateStudent function to handle multiple classes
async function updateStudent(studentId) {
    // Collect classes from edit form
    const classes = [];
    let totalMonthlyFee = 0;
    
    document.querySelectorAll('#editClassesContainer .class-row').forEach(row => {
        const className = row.querySelector('.editClassName')?.value;
        const instructor = row.querySelector('.editInstructor')?.value;
        const monthlyFee = parseInt(row.querySelector('.editMonthlyFee')?.value) || 0;
        const batchTiming = row.querySelector('.editBatchTiming')?.value || '';
        
        if (className && monthlyFee > 0) {
            classes.push({
                className,
                instructor: instructor || 'Not Assigned',
                monthlyFee,
                batchTiming
            });
            totalMonthlyFee += monthlyFee;
        }
    });
    
    if (classes.length === 0) {
        showToast('Student must have at least one class', 'error');
        return;
    }
    
    const updateData = {
        name: document.getElementById('editName')?.value,
        email: document.getElementById('editEmail')?.value,
        phone: document.getElementById('editPhone')?.value,
        dateOfBirth: document.getElementById('editDateOfBirth')?.value || null,
        gender: document.getElementById('editGender')?.value || undefined,
        status: document.getElementById('editStatus')?.value || 'active',
        notes: document.getElementById('editNotes')?.value || undefined,
        classes: classes,
        totalMonthlyFee: totalMonthlyFee
    };
    
    // Validate required fields
    if (!updateData.name || !updateData.email || !updateData.phone) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/update-student/${studentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Student information updated successfully!');
            loadStudents();
            loadDashboardStats();
            // Refresh the view
            viewStudent(studentId);
        } else {
            showToast(data.message || 'Failed to update student', 'error');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        showToast('Failed to update student', 'error');
    }
}

async function deleteStudent(studentId, studentName) {
    if (!studentId) return;
    
    if (confirm(`Are you sure you want to delete student: ${studentName} (${studentId})?`)) {
        try {
            const response = await fetch(`${API_BASE}/delete-student/${studentId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast(`Student ${studentName} deleted successfully`);
                loadStudents();
                loadDashboardStats();
            } else {
                showToast(data.message || 'Failed to delete student', 'error');
            }
        } catch (error) {
            console.error('Error deleting student:', error);
            showToast('Failed to delete student', 'error');
        }
    }
}

function loadEditClasses(student) {
    const container = document.getElementById('editClassesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // If student has multiple classes
    if (student.classes && student.classes.length > 0) {
        student.classes.forEach(cls => {
            addEditClassRow(cls.className, cls.instructor, cls.monthlyFee, cls.batchTiming);
        });
    } 
    // Fallback for single class format
    else if (student.className) {
        addEditClassRow(student.className, student.instructor, student.monthlyFee, student.batchTiming);
    } else {
        // Add one empty row if no classes
        addEditClassRow();
    }
}

// Function to add a class row in edit mode
async function addEditClassRow(className = '', instructor = '', monthlyFee = '', batchTiming = '') {
    const container = document.getElementById('editClassesContainer');
    if (!container) return;
    
    const row = document.createElement('div');
    row.className = 'class-row';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1.5fr 1fr 1.5fr auto; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    // Fetch teachers from backend
    const teachers = await fetchTeachers();
    
    // Build instructor options
    let instructorOptions = '<option value="">Select Instructor</option>';
    if (Array.isArray(teachers)) {
        teachers.forEach(teacher => {
            instructorOptions += `<option value="${teacher.name}" ${instructor === teacher.name ? 'selected' : ''}>${teacher.name}</option>`;
        });
    }
    
    row.innerHTML = `
        <select class="editClassName" onchange="updateEditClassFee(this)" required>
            <option value="">Select Class</option>
            <option value="Carnatic Vocal" data-fee="250" ${className === 'Carnatic Vocal' ? 'selected' : ''}>Carnatic Vocal</option>
            <option value="Veena" data-fee="280" ${className === 'Veena' ? 'selected' : ''}>Veena</option>
            <option value="Violin" data-fee="250" ${className === 'Violin' ? 'selected' : ''}>Violin</option>
            <option value="Mridangam" data-fee="300" ${className === 'Mridangam' ? 'selected' : ''}>Mridangam</option>
            <option value="Mirdhangam" data-fee="300" ${className === 'Mirdhangam' ? 'selected' : ''}>Mirdhangam</option>
            <option value="Keyboard" data-fee="450" ${className === 'Keyboard' ? 'selected' : ''}>Keyboard</option>
            <option value="Bharatanatyam" data-fee="300" ${className === 'Bharatanatyam' ? 'selected' : ''}>Bharatanatyam</option>
        </select>

        <select class="editInstructor">
            ${instructorOptions}
        </select>

        <input type="number" class="editMonthlyFee" placeholder="Fee" min="0" value="${monthlyFee}" readonly style="background: #f0f0f0;" />

        <input type="text" class="editBatchTiming" placeholder="Batch Timing" value="${batchTiming}" />

        <button type="button" onclick="removeEditClassRow(this)" class="btn" style="background:#e74c3c;color:white; padding: 8px;">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(row);
    setTimeout(() => updateEditTotalFee(), 0);
}

// Function to remove class row in edit mode
function removeEditClassRow(btn) {
    const row = btn.closest('.class-row');
    const container = document.getElementById('editClassesContainer');
    
    if (container.children.length > 1) {
        row.remove();
        updateEditTotalFee();
    } else {
        showToast('Student must have at least one class', 'warning');
    }
}

// ========== PAYMENT MANAGEMENT ==========

async function loadPaymentDashboard() {
    try {
        // Helper functions
        const getStudentFee = (student) => {
            return student.totalMonthlyFee || student.monthlyFee || 0;
        };
        
        const getClassNames = (student) => {
            if (student.classes && student.classes.length > 0) {
                return student.classes.map(c => c.className).join(', ');
            }
            return student.className || 'No classes';
        };
        
        // ===== Pending Payments =====
        const pendingResponse = await fetch(`${API_BASE}/payments/pending`);
        const pendingData = await pendingResponse.json();
        
        if (pendingData.success) {
            const pendingCount = document.getElementById('pendingCount');
            if (pendingCount) pendingCount.textContent = pendingData.count || 0;
            
            const pendingList = document.getElementById('pendingList');
            if (pendingList) {
                let pendingHTML = '';
                (pendingData.students || []).slice(0, 5).forEach(student => {
                    const classNames = getClassNames(student);
                    const totalFee = getStudentFee(student);
                    
                    pendingHTML += `
                        <div class="payment-item" onclick="viewStudent('${student.studentId}')" style="cursor: pointer;">
                            <div class="payment-info">
                                <strong>${student.name || 'Unknown'}</strong><br>
                                <small>${student.studentId || 'N/A'} • ${classNames}</small>
                            </div>
                            <div class="payment-amount">₹${totalFee}</div>
                        </div>
                    `;
                });
                
                if (!pendingData.students || pendingData.students.length === 0) {
                    pendingHTML = '<p style="text-align:center;color:#7f8c8d;">No pending payments</p>';
                }
                
                pendingList.innerHTML = pendingHTML;
            }
        }
        
        // ===== Overdue Payments =====
        const overdueResponse = await fetch(`${API_BASE}/payments/overdue`);
        const overdueData = await overdueResponse.json();
        
        if (overdueData.success) {
            const overdueCount = document.getElementById('overdueCount');
            if (overdueCount) overdueCount.textContent = overdueData.count || 0;
            
            const overdueList = document.getElementById('overdueList');
            if (overdueList) {
                let overdueHTML = '';
                (overdueData.students || []).slice(0, 5).forEach(student => {
                    const dueDate = student.nextPaymentDue
                        ? new Date(student.nextPaymentDue).toLocaleDateString()
                        : 'Not set';
                    
                    const classNames = getClassNames(student);
                    const totalFee = getStudentFee(student);
                    
                    overdueHTML += `
                        <div class="payment-item" onclick="viewStudent('${student.studentId}')" style="cursor: pointer;">
                            <div class="payment-info">
                                <strong>${student.name || 'Unknown'}</strong><br>
                                <small>${student.studentId || 'N/A'} • ${classNames} • Due: ${dueDate}</small>
                            </div>
                            <div class="payment-amount">₹${totalFee}</div>
                        </div>
                    `;
                });
                
                if (!overdueData.students || overdueData.students.length === 0) {
                    overdueHTML = '<p style="text-align:center;color:#7f8c8d;">No overdue payments</p>';
                }
                
                overdueList.innerHTML = overdueHTML;
            }
        }
        
        // ===== Paid This Month =====
        const currentMonth = new Date().toISOString().slice(0, 7);
        const paidResponse = await fetch(`${API_BASE}/payments/paid?month=${currentMonth}`);
        const paidData = await paidResponse.json();
        
        if (paidData.success) {
            const paidCount = document.getElementById('paidCount');
            if (paidCount) paidCount.textContent = paidData.count || 0;
            
            const paidList = document.getElementById('paidList');
            if (paidList) {
                let paidHTML = '';
                (paidData.payments || []).slice(0, 5).forEach(payment => {
                    paidHTML += `
                        <div class="payment-item" onclick="viewStudent('${payment.studentId}')" style="cursor: pointer;">
                            <div class="payment-info">
                                <strong>${payment.studentName || 'Unknown'}</strong><br>
                                <small>${payment.studentId || 'N/A'} • ${payment.month || ''}</small>
                            </div>
                            <div class="payment-amount">₹${payment.amount || 0}</div>
                        </div>
                    `;
                });
                
                if (!paidData.payments || paidData.payments.length === 0) {
                    paidHTML = '<p style="text-align:center;color:#7f8c8d;">No payments this month</p>';
                }
                
                paidList.innerHTML = paidHTML;
            }
        }
        
        loadPaymentHistory();
        
    } catch (error) {
        console.error('Error loading payment dashboard:', error);
        showToast('Failed to load payment data', 'error');
    }
}

async function loadPaymentHistory() {
    try {
        const response = await fetch(`${API_BASE}/payments/history?limit=20`);
        const data = await response.json();
        
        if (data.success) {
            const historyContainer = document.getElementById('paymentHistory');
            if (!historyContainer) return;
            
            let historyHTML = '<div style="background: white; border-radius: 8px; overflow: hidden;">';
            (data.payments || []).forEach(payment => {
                const paymentDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A';
                historyHTML += `
                    <div style="padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" 
                         onclick="viewStudent('${payment.studentId}')">
                        <div>
                            <strong>${payment.studentName || 'Unknown'}</strong><br>
                            <small>${payment.studentId || 'N/A'} • ${payment.month || ''} • ${paymentDate}</small>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: bold; color: #2c3e50;">₹${payment.amount || 0}</div>
                            <span class="payment-status-badge status-paid" style="font-size: 0.8em;">
                                ${payment.paymentMethod || 'Cash'}
                            </span>
                        </div>
                    </div>
                `;
            });
            historyHTML += '</div>';
            historyContainer.innerHTML = historyHTML;
        }
    } catch (error) {
        console.error('Error loading payment history:', error);
    }
}

function markPaymentForStudent(studentId, studentName) {
    closeModal();
    showTab('managePayments');
    
    const paymentStudentId = document.getElementById('paymentStudentId');
    if (paymentStudentId) {
        paymentStudentId.value = studentId;
    }
    
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0');
    
    const paymentMonth = document.getElementById('paymentMonth');
    if (paymentMonth) {
        paymentMonth.value = currentMonth;
    }
    
    // Trigger amount display
    setTimeout(() => showAutoAmount(), 100);
    
    showToast(`Full monthly fee will be collected for ${studentName}`);
}

async function showAutoAmount() {
    const studentId = document.getElementById('paymentStudentId')?.value?.trim();
    const display = document.getElementById('autoAmountDisplay');
    
    if (!display) return;
    
    if (!studentId) {
        display.innerHTML = '';
        return;
    }
    
    try {
        // Get GST percentage
        const gstPercentage = await getGSTPercentage();
        
        // Get student details
        const response = await fetch(`${API_BASE}/students/${studentId}`);
        const data = await response.json();
        
        if (data.success) {
            const student = data.student;
            const baseAmount = student.totalMonthlyFee || student.monthlyFee || 0;
            
            if (baseAmount > 0) {
                const { gstAmount, totalAmount } = calculateWithGST(baseAmount, gstPercentage);
                display.innerHTML = `
                    <div style="background: #e8f4fc; padding: 10px; border-radius: 6px; margin-top: 10px;">
                        <div><strong>Base Fee:</strong> ₹${baseAmount}</div>
                        <div><strong>GST (${gstPercentage}%):</strong> ₹${gstAmount.toFixed(2)}</div>
                        <div><strong style="color: #27ae60;">Total Payable:</strong> ₹${totalAmount.toFixed(2)}</div>
                    </div>
                `;
            } else {
                display.innerHTML = `<span style="color:red;">No fee assigned</span>`;
            }
        } else {
            display.innerHTML = `<span style="color:red;">Student not found</span>`;
        }
    } catch (error) {
        display.innerHTML = `<span style="color:red;">Error loading fee</span>`;
    }
}

// ========== UPDATED PAYMENT FUNCTION WITH GST ==========

async function markPayment() {
    const studentId = document.getElementById('paymentStudentId')?.value?.trim();
    const month = document.getElementById('paymentMonth')?.value;
    
    if (!studentId) {
        showToast('Please enter Student ID', 'error');
        return;
    }
    
    if (!month) {
        showToast('Please select month', 'error');
        return;
    }
    
    try {
        // Get GST percentage first
        const gstPercentage = await getGSTPercentage();
        
        // Verify student exists
        const verifyResponse = await fetch(`${API_BASE}/students/${studentId}`);
        const verifyData = await verifyResponse.json();
        
        if (!verifyData.success) {
            showToast('Student ID not found', 'error');
            return;
        }
        
        const student = verifyData.student;
        
        // Get base fee (without GST)
        const baseAmount = student.totalMonthlyFee || student.monthlyFee || 0;
        
        if (baseAmount <= 0) {
            showToast('Student has no assigned fee', 'error');
            return;
        }
        
        // Calculate with GST
        const { baseAmount: base, gstAmount, totalAmount } = calculateWithGST(baseAmount, gstPercentage);
        
        // Check for duplicate payment
        const duplicateCheck = await fetch(`${API_BASE}/payments/check?studentId=${studentId}&month=${month}`);
        const duplicateData = await duplicateCheck.json();
        
        if (duplicateData.exists) {
            showToast('Payment already marked for this month', 'error');
            return;
        }
        
        // Show detailed confirmation with GST breakdown
        if (!confirm(
            `Payment Details for ${student.name}:\n` +
            `📅 Month: ${month}\n` +
            `💰 Base Fee: ₹${baseAmount}\n` +
            `🧾 GST (${gstPercentage}%): ₹${gstAmount.toFixed(2)}\n` +
            `💵 Total Amount: ₹${totalAmount.toFixed(2)}\n\n` +
            `Confirm payment?`
        )) {
            return;
        }
        
        // Send payment with GST details
        const response = await fetch(`${API_BASE}/payments/mark`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: studentId,
                amount: totalAmount,        // Total including GST
                baseAmount: baseAmount,      // Original fee without GST
                gstAmount: gstAmount,        // Calculated GST
                gstPercentage: gstPercentage, // GST percentage used
                month: month,
                paymentMethod: 'cash'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(
                `✅ Payment successful!\n` +
                `Amount: ₹${totalAmount.toFixed(2)} (incl. GST)\n` +
                `Receipt No: ${data.receiptNo}`, 
                'success'
            );
            
            // Clear input
            const paymentStudentId = document.getElementById('paymentStudentId');
            if (paymentStudentId) paymentStudentId.value = '';
            
            // Refresh data
            loadPaymentDashboard();
            loadStudents();
            loadDashboardStats();
            
            // Show receipt download option
            if (data.receiptUrl) {
                setTimeout(() => {
                    if (confirm('Receipt generated. Would you like to download it?')) {
                        window.open(data.receiptUrl, '_blank');
                    }
                }, 500);
            }
        } else {
            showToast(data.message || 'Failed to mark payment', 'error');
        }
        
    } catch (error) {
        console.error('Error marking payment:', error);
        showToast('Failed to mark payment: ' + error.message, 'error');
    }
}

// [REMOVED] markAllPendingAsPaid() function - not needed
// [REMOVED] sendPaymentReminders() function - not needed

async function viewAllPayments(studentId) {
    try {
        const response = await fetch(`${API_BASE}/payments/student/${studentId}`);
        const data = await response.json();
        
        if (data.success) {
            let allPaymentsHTML = '<h4 style="color: #34495e; margin-bottom: 15px;">All Payments</h4>';
            
            if (data.payments?.length > 0) {
                allPaymentsHTML += '<div style="max-height: 400px; overflow-y: auto;">';
                data.payments.forEach(payment => {
                    const paymentDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A';
                    allPaymentsHTML += `
                        <div class="payment-history-item">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>${payment.month || 'N/A'}</strong><br>
                                    <small>Paid on: ${paymentDate}</small><br>
                                    <small>Method: ${payment.paymentMethod || 'Cash'}</small>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 1.5rem; font-weight: bold; color: #2c3e50;">₹${payment.amount || 0}</div>
                                    ${payment.notes ? `<div style="font-size: 0.8em; color: #7f8c8d;">${payment.notes}</div>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });
                allPaymentsHTML += '</div>';
            } else {
                allPaymentsHTML += '<p style="color: #7f8c8d; text-align: center;">No payments found</p>';
            }
            
            // Show in modal
            const modalTitle = document.getElementById('modalTitle');
            const modalContent = document.getElementById('modalContent');
            const studentModal = document.getElementById('studentModal');
            
            if (modalTitle) modalTitle.textContent = 'All Payments';
            if (modalContent) {
                modalContent.innerHTML = `
                    <div style="max-height: 500px; overflow-y: auto;">
                        ${allPaymentsHTML}
                    </div>
                `;
            }
            if (studentModal) studentModal.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading all payments:', error);
        showToast('Failed to load payment history', 'error');
    }
}

// ========== MODAL FUNCTIONS ==========

function closeModal() {
    const modal = document.getElementById('studentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showModalTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.modal-tab-content').forEach(tab => {
        if (tab.style) tab.style.display = 'none';
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const targetTab = document.getElementById(`modal${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);
    if (targetTab) {
        targetTab.style.display = 'block';
    }
    
    // Activate corresponding tab button
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tabName.toLowerCase())) {
            btn.classList.add('active');
        }
    });
}

// ========== BULK UPLOAD FUNCTIONS ==========

function initializeBulkUpload() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) {
        const uploadSection = document.querySelector('.bulk-upload-section');
        if (uploadSection) {
            const newFileInput = document.createElement('input');
            newFileInput.type = 'file';
            newFileInput.id = 'fileInput';
            newFileInput.className = 'file-input';
            newFileInput.accept = '.csv';
            newFileInput.style.display = 'none';
            newFileInput.onchange = function() { handleFileUpload(this); };
            uploadSection.appendChild(newFileInput);
        }
    }
}

function triggerFileInput() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.click();
    } else {
        console.error('File input not found');
        showToast('File input not found', 'error');
    }
}

function handleFileUpload(input) {
    if (!input || !input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    
    // Validate file type
    if (!file.name.endsWith('.csv')) {
        showToast('Please upload a CSV file', 'error');
        input.value = '';
        return;
    }
    
    // Show file info
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.innerHTML = `
            <i class="fas fa-file-csv" style="color: #27ae60; font-size: 48px;"></i>
            <h3>${file.name}</h3>
            <p>${(file.size / 1024).toFixed(2)} KB • Ready to process</p>
            <button class="btn btn-primary" onclick="processUpload()" style="margin-top: 10px;">
                <i class="fas fa-play"></i> Process File
            </button>
            <button class="btn btn-secondary" onclick="resetUploadArea()" style="margin-top: 10px; margin-left: 10px;">
                <i class="fas fa-times"></i> Cancel
            </button>
        `;
    }
}

function resetUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadArea) {
        uploadArea.innerHTML = `
            <i class="fas fa-cloud-upload-alt" style="font-size: 48px;"></i>
            <h3>Upload CSV File</h3>
            <p>Click here or drag and drop your CSV file</p>
            <p style="color: #7f8c8d; font-size: 0.9em;">Supports: Students, Payments, Fees</p>
        `;
    }
    
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Hide results
    const uploadResults = document.getElementById('uploadResults');
    if (uploadResults) {
        uploadResults.style.display = 'none';
        uploadResults.innerHTML = '';
    }
}

function validateCSVData(csvText, uploadType) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        return ['CSV file is empty or has no data rows'];
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(v => v.trim());
        const rowNumber = i + 1;
        
        if (uploadType === 'students') {
            const nameIndex = headers.indexOf('name');
            const emailIndex = headers.indexOf('email');
            const phoneIndex = headers.indexOf('phone');
            const classNameIndex = headers.indexOf('classname');
            
            if (nameIndex !== -1 && (!values[nameIndex] || values[nameIndex] === '')) {
                errors.push(`Row ${rowNumber}: Name is required`);
            }
            
            if (emailIndex !== -1 && values[emailIndex]) {
                if (!isValidEmail(values[emailIndex])) {
                    errors.push(`Row ${rowNumber}: Invalid email format "${values[emailIndex]}"`);
                }
            }
            
            if (phoneIndex !== -1 && values[phoneIndex]) {
                const cleanPhone = values[phoneIndex].replace(/\D/g, '');
                if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
                    errors.push(`Row ${rowNumber}: Phone number should be 10 digits starting with 6-9`);
                }
            }
        } else if (uploadType === 'payments') {
            const studentIdIndex = headers.indexOf('studentid');
            const amountIndex = headers.indexOf('amount');
            const monthIndex = headers.indexOf('month');
            
            if (studentIdIndex !== -1 && (!values[studentIdIndex] || values[studentIdIndex] === '')) {
                errors.push(`Row ${rowNumber}: Student ID is required`);
            }
            
            if (amountIndex !== -1 && values[amountIndex]) {
                const amount = parseFloat(values[amountIndex]);
                if (isNaN(amount) || amount <= 0) {
                    errors.push(`Row ${rowNumber}: Amount must be a positive number, got "${values[amountIndex]}"`);
                }
            }
            
            if (monthIndex !== -1 && values[monthIndex]) {
                const monthRegex = /^\d{4}-\d{2}$/;
                if (!monthRegex.test(values[monthIndex])) {
                    errors.push(`Row ${rowNumber}: Month must be in YYYY-MM format, got "${values[monthIndex]}"`);
                }
            }
        }
    }
    
    return errors;
}

async function processUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadType = document.getElementById('uploadType')?.value || 'students';
    
    if (!fileInput || !input.files || fileInput.files.length === 0) {
        showToast('Please select a file first', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        const csvText = e.target.result;
        
        // Validate the CSV data
        const validationErrors = validateCSVData(csvText, uploadType);
        
        if (validationErrors.length > 0) {
            // Show validation errors
            let errorHTML = `
                <div style="background: #ffeaea; padding: 20px; border-radius: 8px; border-left: 4px solid #e74c3c;">
                    <h4 style="color: #e74c3c;"><i class="fas fa-exclamation-circle"></i> CSV Validation Failed</h4>
                    <p><strong>Found ${validationErrors.length} error(s):</strong></p>
                    <ul style="color: #e74c3c; margin-left: 20px; max-height: 200px; overflow-y: auto;">
            `;
            
            validationErrors.slice(0, 10).forEach(error => {
                errorHTML += `<li>${error}</li>`;
            });
            
            if (validationErrors.length > 10) {
                errorHTML += `<li>... and ${validationErrors.length - 10} more errors</li>`;
            }
            
            errorHTML += `
                    </ul>
                    <div style="margin-top: 15px;">
                        <button class="btn btn-primary" onclick="resetUploadArea()">
                            <i class="fas fa-redo"></i> Upload Corrected File
                        </button>
                        <button class="btn btn-secondary" onclick="downloadTemplate()" style="margin-left: 10px;">
                            <i class="fas fa-download"></i> Download Template
                        </button>
                    </div>
                </div>
            `;
            
            const uploadResults = document.getElementById('uploadResults');
            if (uploadResults) {
                uploadResults.innerHTML = errorHTML;
                uploadResults.style.display = 'block';
            }
            return;
        }
        
        // Proceed with upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', uploadType);
        
        try {
            // Show loading state
            const uploadArea = document.getElementById('uploadArea');
            if (uploadArea) {
                uploadArea.innerHTML = `
                    <i class="fas fa-spinner fa-spin" style="color: #f39c12; font-size: 48px; margin-bottom: 15px;"></i>
                    <h3>Processing...</h3>
                    <p>Uploading and processing your file</p>
                    <div style="margin-top: 20px;">
                        <div style="width: 100%; background: #f1f1f1; border-radius: 10px; height: 10px;">
                            <div id="uploadProgress" style="width: 0%; height: 100%; background: #27ae60; border-radius: 10px; transition: width 0.3s;"></div>
                        </div>
                        <p id="uploadStatus" style="margin-top: 10px; color: #7f8c8d;">Starting upload...</p>
                    </div>
                `;
            }
            
            // Simulate progress
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 10;
                if (progress > 90) progress = 90;
                const progressBar = document.getElementById('uploadProgress');
                const statusText = document.getElementById('uploadStatus');
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (statusText) statusText.textContent = `Uploading... ${progress}%`;
            }, 300);
            
            // Determine endpoint
            let endpoint = `${API_BASE}/bulk-upload`;
            if (uploadType === 'update-fees' || uploadType === 'fees') {
                endpoint = `${API_BASE}/bulk-update-fees`;
            }
            
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });
            
            clearInterval(progressInterval);
            
            // Show completion
            const progressBar = document.getElementById('uploadProgress');
            const statusText = document.getElementById('uploadStatus');
            if (progressBar) progressBar.style.width = '100%';
            if (statusText) statusText.textContent = 'Processing completed!';
            
            // Wait for visual feedback
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const data = await response.json();
            
            // Show results
            const uploadResults = document.getElementById('uploadResults');
            if (uploadResults) {
                if (data.success) {
                    let resultsHTML = `
                        <div style="background: #d4f8e8; padding: 20px; border-radius: 8px; border-left: 4px solid #27ae60;">
                            <h4 style="color: #27ae60;"><i class="fas fa-check-circle"></i> Upload Successful</h4>
                            <p><strong>Processed:</strong> ${data.processed || data.successCount || 0} records</p>
                            <p><strong>Success:</strong> ${data.successCount || 0} records</p>
                            <p><strong>Failed:</strong> ${data.failedCount || 0} records</p>
                    `;
                    
                    if (data.errors && data.errors.length > 0) {
                        resultsHTML += `<p><strong>Errors:</strong></p><ul style="color: #e74c3c; margin-left: 20px;">`;
                        data.errors.slice(0, 5).forEach(error => {
                            resultsHTML += `<li>${error}</li>`;
                        });
                        if (data.errors.length > 5) {
                            resultsHTML += `<li>... and ${data.errors.length - 5} more errors</li>`;
                        }
                        resultsHTML += `</ul>`;
                    }
                    
                    resultsHTML += `
                            <div style="margin-top: 15px;">
                                <button class="btn btn-primary" onclick="resetUploadArea()">
                                    <i class="fas fa-upload"></i> Upload Another File
                                </button>
                            </div>
                        </div>
                    `;
                    
                    uploadResults.innerHTML = resultsHTML;
                    uploadResults.style.display = 'block';
                    
                    // Reset upload area
                    if (uploadArea) {
                        uploadArea.innerHTML = `
                            <i class="fas fa-cloud-upload-alt" style="font-size: 48px;"></i>
                            <h3>Upload CSV File</h3>
                            <p>Click here or drag and drop your CSV file</p>
                            <p style="color: #7f8c8d; font-size: 0.9em;">Supports: Students, Payments, Fees</p>
                        `;
                    }
                    
                    // Reset file input
                    if (fileInput) fileInput.value = '';
                    
                    showToast(`Successfully processed ${data.successCount || 0} records`);
                    
                    // Refresh data
                    loadDashboardStats();
                    loadPaymentDashboard();
                    loadStudents();
                    
                } else {
                    // Show error
                    let errorHTML = `
                        <div style="background: #ffeaea; padding: 20px; border-radius: 8px; border-left: 4px solid #e74c3c;">
                            <h4 style="color: #e74c3c;"><i class="fas fa-exclamation-circle"></i> Upload Failed</h4>
                            <p><strong>Error:</strong> ${data.message || 'Unknown error'}</p>
                            <div style="margin-top: 15px;">
                                <button class="btn btn-primary" onclick="resetUploadArea()">
                                    <i class="fas fa-redo"></i> Try Again
                                </button>
                            </div>
                        </div>
                    `;
                    
                    uploadResults.innerHTML = errorHTML;
                    uploadResults.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error processing upload:', error);
            
            // Reset upload area
            const uploadArea = document.getElementById('uploadArea');
            if (uploadArea) {
                uploadArea.innerHTML = `
                    <i class="fas fa-cloud-upload-alt" style="font-size: 48px;"></i>
                    <h3>Upload CSV File</h3>
                    <p>Click here or drag and drop your CSV file</p>
                    <p style="color: #7f8c8d; font-size: 0.9em;">Supports: Students, Payments, Fees</p>
                `;
            }
            
            // Show network error
            const uploadResults = document.getElementById('uploadResults');
            if (uploadResults) {
                uploadResults.innerHTML = `
                    <div style="background: #ffeaea; padding: 20px; border-radius: 8px; border-left: 4px solid #e74c3c;">
                        <h4 style="color: #e74c3c;"><i class="fas fa-exclamation-circle"></i> Network Error</h4>
                        <p><strong>Error:</strong> Failed to connect to server. Please check your connection.</p>
                        <div style="margin-top: 15px;">
                            <button class="btn btn-primary" onclick="resetUploadArea()">
                                <i class="fas fa-redo"></i> Try Again
                            </button>
                        </div>
                    </div>
                `;
                uploadResults.style.display = 'block';
            }
            
            showToast('Failed to process upload', 'error');
        }
    };
    
    reader.readAsText(file);
}

function downloadTemplate() {
    const uploadType = document.getElementById('uploadType')?.value || 'students';
    let csvContent = '';
    
    if (uploadType === 'students') {
        csvContent = 'name,email,phone,className,instructor,monthlyFee,gender,dateOfBirth\n' +
                'John Doe,john@example.com,9876543210,Carnatic Vocal,Vidwan R. Srikrishnan,250,male,2005-01-15\n' +
                'Jane Smith,jane@example.com,9876543211,Veena,Lalitha Mageswari,280,female,2006-03-20';
    } else if (uploadType === 'payments') {
        csvContent = 'studentId,amount,month,paymentMethod,notes\n' +
                'MS24001,250,2024-03,Cash,Monthly fee\n' +
                'MS24002,280,2024-03,Bank,Paid via bank transfer';
    } else if (uploadType === 'fees' || uploadType === 'update-fees') {
        csvContent = 'studentId,monthlyFee,effectiveFrom,notes\n' +
                'MS24001,300,2024-04-01,Fee increased due to advanced class\n' +
                'MS24002,320,2024-04-01,Annual fee adjustment';
    }
    
    const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csvContent);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${uploadType}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast('Template downloaded successfully');
}

// NEW FUNCTION: Download current fees template
async function downloadCurrentFees() {
    try {
        showToast('Fetching current student fees...', 'info');
        
        const response = await fetch(`${API_BASE}/students?limit=5000`);
        const data = await response.json();
        
        if (data.success && data.students?.length > 0) {
            let csvContent = 'studentId,name,currentMonthlyFee,className,newMonthlyFee,effectiveFrom,notes\n';
            
            data.students.forEach(student => {
                const row = [
                    `"${student.studentId || ''}"`,
                    `"${student.name || ''}"`,
                    student.totalMonthlyFee || student.monthlyFee || 0,
                    `"${student.className || ''}"`,
                    '', // newMonthlyFee - to be filled by user
                    '', // effectiveFrom - to be filled by user
                    ''  // notes
                ].join(',');
                
                csvContent += row + '\n';
            });
            
            const timestamp = new Date().toISOString().split('T')[0];
            downloadCSV(csvContent, `current_fees_${timestamp}.csv`);
            showToast(`Downloaded ${data.students.length} student fees`);
        } else {
            showToast('No students found', 'warning');
        }
    } catch (error) {
        console.error('Error downloading current fees:', error);
        showToast('Failed to download current fees', 'error');
    }
}

// ========== REPORT FUNCTIONS ==========

async function generateReport() {
    const fromDate = document.getElementById('fromDate')?.value;
    const toDate = document.getElementById('toDate')?.value;
    const classFilter = document.getElementById('reportClassFilter')?.value || '';
    
    if (!fromDate || !toDate) {
        showToast('Please select date range', 'error');
        return;
    }
    
    try {
        let url = `${API_BASE}/reports/summary?from=${fromDate}&to=${toDate}`;
        if (classFilter) {
            url += `&className=${encodeURIComponent(classFilter)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            const reportPreview = document.getElementById('reportPreview');
            if (!reportPreview) return;
            
            let previewHTML = `
                <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="color: #2c3e50; margin-bottom: 20px;">
                        <i class="fas fa-chart-pie"></i> Report Preview (${fromDate} to ${toDate})
                    </h4>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.8rem; font-weight: bold; color: #2c3e50;">₹${data.summary?.totalCollection || 0}</div>
                            <div style="color: #7f8c8d; font-size: 0.9em;">Total Collection</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.8rem; font-weight: bold; color: #2c3e50;">${data.summary?.totalPayments || 0}</div>
                            <div style="color: #7f8c8d; font-size: 0.9em;">Total Payments</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.8rem; font-weight: bold; color: #2c3e50;">₹${data.summary?.pendingAmount || 0}</div>
                            <div style="color: #7f8c8d; font-size: 0.9em;">Pending Amount</div>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.8rem; font-weight: bold; color: #2c3e50;">${data.summary?.activeStudents || 0}</div>
                            <div style="color: #7f8c8d; font-size: 0.9em;">Active Students</div>
                        </div>
                    </div>
                    
                    <h5 style="color: #34495e; margin: 20px 0 10px 0;">Class-wise Collection</h5>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #2c3e50; color: white;">
                                    <th style="padding: 10px; text-align: left;">Class</th>
                                    <th style="padding: 10px; text-align: right;">Students</th>
                                    <th style="padding: 10px; text-align: right;">Collection</th>
                                    <th style="padding: 10px; text-align: right;">Pending</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            (data.classWise || []).forEach(item => {
                previewHTML += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px;">${item._id || 'All'}</td>
                        <td style="padding: 10px; text-align: right;">${item.studentCount || 0}</td>
                        <td style="padding: 10px; text-align: right; color: #27ae60;">₹${item.collection || 0}</td>
                        <td style="padding: 10px; text-align: right; color: #e74c3c;">₹${item.pending || 0}</td>
                    </tr>
                `;
            });
            
            previewHTML += `
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="margin-top: 20px; text-align: center;">
                        <button class="btn btn-primary" onclick="downloadFullReport('${fromDate}', '${toDate}', '${classFilter}')">
                            <i class="fas fa-download"></i> Download Full Report (CSV)
                        </button>
                    </div>
                </div>
            `;
            
            reportPreview.innerHTML = previewHTML;
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showToast('Failed to generate report', 'error');
    }
}

async function downloadReport(type) {
    const fromDate = document.getElementById('fromDate')?.value;
    const toDate = document.getElementById('toDate')?.value;
    const classFilter = document.getElementById('reportClassFilter')?.value || '';
    
    if (!fromDate || !toDate) {
        showToast('Please select date range first', 'error');
        return;
    }
    
    try {
        let url = `${API_BASE}/reports/export/${type}?from=${fromDate}&to=${toDate}`;
        if (classFilter) {
            url += `&className=${encodeURIComponent(classFilter)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.csv) {
            const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + data.csv);
            const a = document.createElement('a');
            a.href = dataUrl;
            const filename = `${type}_report_${fromDate}_to_${toDate}.csv`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            showToast(`Report downloaded: ${filename}`);
        } else {
            showToast(data.message || 'Failed to generate report', 'error');
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        showToast('Failed to download report', 'error');
    }
}

function downloadFullReport(fromDate, toDate, className) {
    downloadReport('full');
}

// ========== EXPORT FUNCTIONS ==========

function downloadCSV(csvContent, filename) {
    const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csvContent);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.setAttribute('download', filename || 'download.csv');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function exportAllStudents() {
    try {
        const status = document.getElementById('statusFilter')?.value || '';
        const className = document.getElementById('classFilter')?.value || '';
        const search = document.getElementById('searchInput')?.value || '';
        
        let url = `${API_BASE}/students?limit=5000`;
        if (status) url += `&status=${status}`;
        if (className) url += `&className=${encodeURIComponent(className)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        showToast('Fetching student data...', 'info');
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.students?.length > 0) {
            let csvContent = 'Student ID,Name,Email,Phone,Class,Instructor,Monthly Fee (₹),Status,Payment Status,Join Date,Last Payment,Next Due,Gender,Date of Birth,Guardian Name,Guardian Phone,Batch Timing,Address,Notes\n';
            
            data.students.forEach(student => {
                const address = student.address ? 
                    `${student.address.street || ''}, ${student.address.city || ''}, ${student.address.state || ''} ${student.address.pincode || ''}`.trim() : '';
                
                const row = [
                    `"${student.studentId || ''}"`,
                    `"${student.name || ''}"`,
                    `"${student.email || ''}"`,
                    `"${student.phone || ''}"`,
                    `"${student.className || ''}"`,
                    `"${student.instructor || ''}"`,
                    student.monthlyFee || 0,
                    `"${student.status || ''}"`,
                    `"${student.paymentStatus || 'pending'}"`,
                    `"${formatDate(student.joinDate)}"`,
                    `"${formatDate(student.lastPaymentDate)}"`,
                    `"${formatDate(student.nextPaymentDue)}"`,
                    `"${student.gender || ''}"`,
                    `"${formatDate(student.dateOfBirth)}"`,
                    `"${student.guardianName || ''}"`,
                    `"${student.guardianPhone || ''}"`,
                    `"${student.batchTiming || ''}"`,
                    `"${address}"`,
                    `"${student.notes || ''}"`
                ].join(',');
                
                csvContent += row + '\n';
            });
            
            const timestamp = new Date().toISOString().split('T')[0];
            downloadCSV(csvContent, `students_export_${timestamp}.csv`);
            showToast(`Exported ${data.students.length} students successfully!`);
        } else {
            showToast('No students found to export', 'warning');
        }
    } catch (error) {
        console.error('Error exporting students:', error);
        showToast('Failed to export students', 'error');
    }
}

async function exportActiveStudents() {
    try {
        // Set status filter to active
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) statusFilter.value = 'active';
        
        // Call export with active filter
        await exportAllStudents();
    } catch (error) {
        console.error('Error exporting active students:', error);
        showToast('Failed to export active students', 'error');
    }
}

async function exportClassWiseStudents() {
    try {
        const classFilter = document.getElementById('classFilter')?.value || '';
        
        if (!classFilter) {
            showToast('Please select a class filter first', 'warning');
            return;
        }
        
        // Call export with class filter
        await exportAllStudents();
    } catch (error) {
        console.error('Error exporting class-wise students:', error);
        showToast('Failed to export class-wise students', 'error');
    }
}

async function exportPendingPayments() {
    try {
        showToast('Fetching pending payments...', 'info');
        
        const response = await fetch(`${API_BASE}/payments/pending`);
        const data = await response.json();
        
        if (data.success && data.students?.length > 0) {
            let csvContent = 'Student ID,Name,Class,Instructor,Monthly Fee (₹),Phone,Email,Guardian Phone,Next Due Date,Overdue Days\n';
            
            const today = new Date();
            
            data.students.forEach(student => {
                const dueDate = student.nextPaymentDue ? new Date(student.nextPaymentDue) : null;
                const overdueDays = dueDate && dueDate < today ? 
                    Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
                
                const row = [
                    `"${student.studentId || ''}"`,
                    `"${student.name || ''}"`,
                    `"${student.className || ''}"`,
                    `"${student.instructor || ''}"`,
                    student.monthlyFee || 0,
                    `"${student.phone || ''}"`,
                    `"${student.email || ''}"`,
                    `"${student.guardianPhone || ''}"`,
                    `"${formatDate(student.nextPaymentDue)}"`,
                    overdueDays
                ].join(',');
                
                csvContent += row + '\n';
            });
            
            const timestamp = new Date().toISOString().split('T')[0];
            downloadCSV(csvContent, `pending_payments_${timestamp}.csv`);
            showToast(`Exported ${data.students.length} pending payments`);
        } else {
            showToast('No pending payments found', 'info');
        }
    } catch (error) {
        console.error('Error exporting pending payments:', error);
        showToast('Failed to export pending payments', 'error');
    }
}

async function exportOverdueStudents() {
    try {
        showToast('Fetching overdue students...', 'info');
        
        const response = await fetch(`${API_BASE}/payments/overdue`);
        const data = await response.json();
        
        if (data.success && data.students?.length > 0) {
            let csvContent = 'Student ID,Name,Class,Monthly Fee (₹),Phone,Next Due Date,Overdue Days,Last Payment\n';
            
            const today = new Date();
            
            data.students.forEach(student => {
                const dueDate = student.nextPaymentDue ? new Date(student.nextPaymentDue) : null;
                const overdueDays = dueDate ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
                
                const row = [
                    `"${student.studentId || ''}"`,
                    `"${student.name || ''}"`,
                    `"${student.className || ''}"`,
                    student.monthlyFee || 0,
                    `"${student.phone || ''}"`,
                    `"${formatDate(student.nextPaymentDue)}"`,
                    overdueDays,
                    `"${formatDate(student.lastPaymentDate)}"`
                ].join(',');
                
                csvContent += row + '\n';
            });
            
            const timestamp = new Date().toISOString().split('T')[0];
            downloadCSV(csvContent, `overdue_students_${timestamp}.csv`);
            showToast(`Exported ${data.students.length} overdue students`);
        } else {
            showToast('No overdue students found', 'info');
        }
    } catch (error) {
        console.error('Error exporting overdue students:', error);
        showToast('Failed to export overdue students', 'error');
    }
}

// NEW FUNCTION: Print student list
function printStudentList() {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
        showToast('Please allow pop-ups to print', 'error');
        return;
    }
    
    const studentRows = document.querySelectorAll('.students-table tbody tr');
    let printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Student List - Music School</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #2c3e50; }
                table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                th { background: #2c3e50; color: white; padding: 10px; text-align: left; }
                td { padding: 8px; border-bottom: 1px solid #ddd; }
                .status-active { color: #27ae60; }
                .status-inactive { color: #7f8c8d; }
                .footer { margin-top: 20px; text-align: center; color: #7f8c8d; }
            </style>
        </head>
        <body>
            <h1>P.A.C. Ramasamy Raja Memorial Music School - Student List</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Class</th>
                        <th>Fee</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    studentRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
            const studentId = cells[0]?.textContent || '';
            const name = cells[1]?.textContent || '';
            const classes = cells[2]?.textContent || '';
            const fee = cells[3]?.textContent || '';
            const status = cells[4]?.textContent || '';
            
            printHTML += `
                <tr>
                    <td>${studentId}</td>
                    <td>${name}</td>
                    <td>${classes.replace(/<[^>]*>/g, '')}</td>
                    <td>${fee}</td>
                    <td>${status}</td>
                </tr>
            `;
        }
    });
    
    printHTML += `
                </tbody>
            </table>
            <div class="footer">
                <p>Total Students: ${studentRows.length}</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.print();
}

// ========== TEACHERS & FEES MANAGEMENT ==========

// Load teachers and class configurations
async function loadTeachersAndFees() {
    try {
        const response = await fetch(`${API_BASE}/class-configurations`);
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('teachersTableBody');
            if (!tbody) return;
            
            const gstPercentage = parseFloat(document.getElementById('gstPercentage')?.value || 18);
            
            let html = '';
            data.configurations.forEach(config => {
                const gstAmount = (config.baseFee * gstPercentage / 100).toFixed(2);
                const totalFee = config.baseFee + parseFloat(gstAmount);
                
                html += `
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">
                            <strong>${config.className}</strong>
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">
                            ${config.teacherName}
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
                            ₹${config.baseFee}
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #e67e22;">
                            ₹${gstAmount}
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #27ae60;">
                            ₹${totalFee}
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
                            <span class="status-badge ${config.active ? 'status-active' : 'status-inactive'}">
                                ${config.active ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
                            <button class="action-btn" style="background: #3498db;" onclick="editClassConfig('${config._id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" style="background: ${config.active ? '#e74c3c' : '#27ae60'};" 
                                    onclick="toggleClassStatus('${config._id}', ${config.active})">
                                <i class="fas ${config.active ? 'fa-ban' : 'fa-check'}"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading teachers:', error);
    }
}

// ========== CLASS CONFIGURATION MANAGEMENT ==========

// Load all class configurations
async function loadClassConfigurations() {
    console.log('loadClassConfigurations() called');
    try {
        const response = await fetch(`${API_BASE}/class-configurations`);
        const data = await response.json();
        
        console.log('Raw data:', data);
        console.log('Configurations:', data.configurations);
        console.log('First config properties:', data.configurations[0]);
        
        if (data.success) {
            const tbody = document.getElementById('teachersTableBody');
            console.log('Table body element:', tbody);
            
            if (!tbody) {
                console.error('Table body with id "teachersTableBody" not found!');
                return;
            }
            
            // Get current GST percentage for calculations
            const gstPercentage = await getGSTPercentage();
            console.log('GST Percentage:', gstPercentage);
            
            if (!data.configurations || data.configurations.length === 0) {
                console.log('No configurations found');
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: #7f8c8d;">
                            <i class="fas fa-info-circle fa-2x" style="margin-bottom: 10px;"></i>
                            <p>No class configurations found. Add your first class above.</p>
                        </td>
                    </tr>
                `;
                
                // Update stats
                updateClassStats([]);
                return;
            }
            
            let totalClasses = 0;
            let activeClasses = 0;
            let totalFees = 0;
            
            let html = '';
            console.log('Starting to build HTML for', data.configurations.length, 'configurations');
            
            data.configurations.forEach((config, index) => {
                console.log(`Processing config ${index}:`, config);
                
                totalClasses++;
                if (config.active) activeClasses++;
                totalFees += config.baseFee;
                
                const gstAmount = (config.baseFee * gstPercentage / 100).toFixed(2);
                const totalFee = config.baseFee + parseFloat(gstAmount);
                
                const rowHtml = `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 15px;">
                            <strong>${config.className || 'N/A'}</strong>
                        </td>
                        <td style="padding: 15px;">
                            <i class="fas fa-user"></i> ${config.teacherName || 'Not assigned'}
                        </td>
                        <td style="padding: 15px; text-align: right;">
                            ₹${config.baseFee?.toLocaleString() || 0}
                        </td>
                        <td style="padding: 15px; text-align: right; color: #e67e22;">
                            ₹${parseFloat(gstAmount).toLocaleString()}
                        </td>
                        <td style="padding: 15px; text-align: right; font-weight: bold; color: #27ae60;">
                            ₹${parseFloat(totalFee).toLocaleString()}
                        </td>
                        <td style="padding: 15px; text-align: center;">
                            <span class="status-badge ${config.active ? 'status-active' : 'status-inactive'}">
                                ${config.active ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td style="padding: 15px; text-align: center;">
                            <div class="action-buttons" style="display: flex; gap: 5px; justify-content: center;">
                                <button class="action-btn" style="background: #3498db;" onclick="editClassConfig('${config._id}')" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn" style="background: ${config.active ? '#e74c3c' : '#27ae60'};" 
                                        onclick="toggleClassStatus('${config._id}', ${config.active})" title="${config.active ? 'Deactivate' : 'Activate'}">
                                    <i class="fas ${config.active ? 'fa-ban' : 'fa-check'}"></i>
                                </button>
                                <button class="action-btn" style="background: #f39c12;" onclick="updateAllStudentsInClass('${config.className}', ${config.baseFee})" 
                                        title="Update all students in this class">
                                    <i class="fas fa-users-cog"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                
                html += rowHtml;
                console.log(`Row HTML for config ${index}:`, rowHtml);
            });
            
            console.log('Final HTML to insert:', html);
            tbody.innerHTML = html;
            console.log('HTML inserted into tbody');
            
            // Verify the table after insertion
            console.log('Table rows after insertion:', tbody.children.length);
            
            // Update stats
            console.log('Updating stats with:', { total: totalClasses, active: activeClasses, avgFee: totalFees / totalClasses });
            updateClassStats({
                total: totalClasses,
                active: activeClasses,
                avgFee: totalFees / totalClasses || 0
            });
        } else {
            console.error('Data success false:', data);
        }
    } catch (error) {
        console.error('Error loading class configs:', error);
        showToast('Failed to load class configurations', 'error');
        
        const tbody = document.getElementById('teachersTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #e74c3c;">
                        <i class="fas fa-exclamation-circle fa-2x" style="margin-bottom: 10px;"></i>
                        <p>Error loading configurations. Please refresh.</p>
                    </td>
                </tr>
            `;
        }
    }
}

async function deleteClassConfig(configId, className) {
    if (!confirm(`Are you sure you want to permanently delete the class "${className}"?\n\nThis will NOT delete students, but they will need to be reassigned.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/class-configurations/${configId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`✅ Class "${className}" deleted successfully`);
            loadClassConfigurations(); // Refresh the list
        } else {
            showToast(data.message || 'Failed to delete class', 'error');
        }
    } catch (error) {
        console.error('Error deleting class:', error);
        showToast('Failed to delete class', 'error');
    }
}

// Also make sure refreshTeachersList is global
window.refreshTeachersList = function() {
    loadTeachersMasterList();
    showToast('Teachers list refreshed', 'success');
};

// Update class statistics
function updateClassStats(stats) {
    const totalEl = document.getElementById('totalClassesCount');
    const activeEl = document.getElementById('activeClassesCount');
    const avgEl = document.getElementById('avgFeeDisplay');
    
    if (totalEl) totalEl.textContent = stats.total || 0;
    if (activeEl) activeEl.textContent = stats.active || 0;
    if (avgEl) avgEl.textContent = `₹${(stats.avgFee || 0).toFixed(2)}`;
}

// Filter class table
function filterClassTable() {
    const searchTerm = document.getElementById('classSearchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('classStatusFilter')?.value || 'all';
    const rows = document.querySelectorAll('#teachersTableBody tr');
    
    rows.forEach(row => {
        let show = true;
        
        // Skip the "no data" row
        if (row.cells.length === 1 && row.cells[0].colSpan === 7) return;
        
        if (searchTerm) {
            const className = row.cells[0]?.textContent.toLowerCase() || '';
            const teacherName = row.cells[1]?.textContent.toLowerCase() || '';
            if (!className.includes(searchTerm) && !teacherName.includes(searchTerm)) {
                show = false;
            }
        }
        
        if (statusFilter !== 'all') {
            const statusCell = row.cells[5]?.textContent.toLowerCase().trim() || '';
            const isActive = statusCell.includes('active');
            if ((statusFilter === 'active' && !isActive) || (statusFilter === 'inactive' && isActive)) {
                show = false;
            }
        }
        
        row.style.display = show ? '' : 'none';
    });
}

// Show add class modal
function showAddClassModal() {
    // Scroll to the quick add form
    const details = document.querySelector('details');
    if (details) {
        details.open = true;
        details.scrollIntoView({ behavior: 'smooth' });
    }
}

// Add new class configuration
async function addNewClassConfig() {
    const className = document.getElementById('newClassName')?.value.trim();
    const teacherName = document.getElementById('newTeacherName')?.value.trim();
    const baseFee = document.getElementById('newBaseFee')?.value;
    
    // Validation
    if (!className) {
        showToast('Please enter class name', 'error');
        return;
    }
    
    if (!teacherName) {
        showToast('Please enter teacher name', 'error');
        return;
    }
    
    if (!baseFee || baseFee <= 0) {
        showToast('Please enter a valid base fee', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/class-configurations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                className, 
                teacherName, 
                baseFee: parseInt(baseFee),
                description: '',
                active: true
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`✅ Class "${className}" added successfully`);
            
            // Clear inputs
            document.getElementById('newClassName').value = '';
            document.getElementById('newTeacherName').value = '';
            document.getElementById('newBaseFee').value = '';
            
            // Close the details section
            const details = document.querySelector('details');
            if (details) details.open = false;
            
            // Reload configurations
            await loadClassConfigurations();
        } else {
            showToast(data.message || 'Failed to add class', 'error');
        }
    } catch (error) {
        console.error('Error adding class config:', error);
        showToast('Failed to add class configuration', 'error');
    }
}

// Update editClassConfig function with better error handling
async function editClassConfig(configId) {
    try {
        showToast('Loading class details...', 'info');
        
        const response = await fetch(`${API_BASE}/class-configurations/${configId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            const config = data.config;
            
            // Populate modal
            document.getElementById('editConfigId').value = config._id;
            document.getElementById('editClassName').value = config.className || '';
            document.getElementById('editTeacherName').value = config.teacherName || '';
            document.getElementById('editBaseFee').value = config.baseFee || 0;
            document.getElementById('editDescription').value = config.description || '';
            document.getElementById('editActive').checked = config.active !== false;
            
            // Update preview
            updateEditPreview();
            
            // Show modal
            document.getElementById('editClassModal').style.display = 'flex';
        } else {
            showToast(data.message || 'Failed to load class details', 'error');
        }
    } catch (error) {
        console.error('Error fetching class config:', error);
        showToast('Failed to load class details. Please check if the class exists.', 'error');
    }
}

// Update edit preview
function updateEditPreview() {
    const baseFee = parseFloat(document.getElementById('editBaseFee')?.value) || 0;
    
    getGSTPercentage().then(gstPercentage => {
        const { gstAmount, totalAmount } = calculateWithGST(baseFee, gstPercentage);
        
        document.getElementById('previewBaseFee').textContent = `₹${baseFee.toFixed(2)}`;
        document.getElementById('previewGST').textContent = `₹${gstAmount.toFixed(2)}`;
        document.getElementById('previewTotal').textContent = `₹${totalAmount.toFixed(2)}`;
    });
}

// Save class configuration changes
async function saveClassConfigChanges() {
    const configId = document.getElementById('editConfigId').value;
    const className = document.getElementById('editClassName').value.trim();
    const teacherName = document.getElementById('editTeacherName').value.trim();
    const baseFee = document.getElementById('editBaseFee').value;
    const description = document.getElementById('editDescription').value;
    const active = document.getElementById('editActive').checked;
    
    if (!className || !teacherName || !baseFee) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/class-configurations/${configId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ className, teacherName, baseFee, description, active })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('✅ Class configuration updated');
            closeEditClassModal();
            await loadClassConfigurations();
            
            // Ask if they want to update existing students
            if (baseFee !== data.config?.baseFee) {
                setTimeout(() => {
                    if (confirm(`Fee changed from ₹${data.config?.baseFee} to ₹${baseFee}. Update all existing students in this class?`)) {
                        updateAllStudentsInClass(className, baseFee);
                    }
                }, 500);
            }
        } else {
            showToast(data.message || 'Failed to update', 'error');
        }
    } catch (error) {
        console.error('Error updating class config:', error);
        showToast('Failed to update class configuration', 'error');
    }
}

// Close edit modal
function closeEditClassModal() {
    document.getElementById('editClassModal').style.display = 'none';
}

// Toggle class status
async function toggleClassStatus(configId, currentStatus) {
    const action = currentStatus ? 'deactivate' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} this class?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/class-configurations/${configId}/toggle`, {
            method: 'PATCH'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`Class ${data.active ? 'activated' : 'deactivated'} successfully`);
            await loadClassConfigurations();
        } else {
            showToast(data.message || 'Failed to toggle status', 'error');
        }
    } catch (error) {
        console.error('Error toggling class status:', error);
        showToast('Failed to toggle class status', 'error');
    }
}

// Update all students in a class with new fee
async function updateAllStudentsInClass(className, newFee) {
    if (!confirm(`This will update ALL students in "${className}" class to ₹${newFee} per month.\n\nContinue?`)) {
        return;
    }
    
    try {
        showToast(`Updating fees for all ${className} students...`, 'info');
        
        const response = await fetch(`${API_BASE}/students/bulk-update-class-fee`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                className, 
                newFee: parseInt(newFee),
                updatedBy: 'Admin'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`✅ Updated ${data.updatedCount} students successfully!`);
            
            // Refresh student list if visible
            if (document.getElementById('viewStudents').classList.contains('active')) {
                loadStudents();
            }
        } else {
            showToast(data.message || 'Failed to update students', 'error');
        }
    } catch (error) {
        console.error('Error bulk updating students:', error);
        showToast('Failed to update students', 'error');
    }
}

// Save GST settings
async function saveGSTSettings() {
    const gstPercentage = document.getElementById('gstPercentage')?.value;
    const gstNumber = document.getElementById('gstNumber')?.value?.trim();
    
    if (!gstPercentage || gstPercentage < 0 || gstPercentage > 100) {
        showToast('Please enter a valid GST percentage (0-100)', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/gst-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                gstPercentage: parseFloat(gstPercentage),
                gstNumber: gstNumber || ''
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('✅ GST settings saved successfully');
            
            // Refresh class table to show updated GST calculations
            await loadClassConfigurations();
        } else {
            showToast(data.message || 'Failed to save GST settings', 'error');
        }
    } catch (error) {
        console.error('Error saving GST settings:', error);
        showToast('Failed to save GST settings', 'error');
    }
}

// Load GST settings on page load
async function loadGSTSettings() {
    try {
        const response = await fetch(`${API_BASE}/gst-settings`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('gstPercentage').value = data.gstPercentage || 18;
            document.getElementById('gstNumber').value = data.gstNumber || '';
        }
    } catch (error) {
        console.error('Error loading GST settings:', error);
    }
}

// Refresh class configurations
function refreshClassConfigs() {
    loadClassConfigurations();
    showToast('Refreshing class list...', 'info');
}

// Update class configuration
async function updateClassConfig(configId, updates) {
    try {
        const response = await fetch(`${API_BASE}/class-configurations/${configId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Class configuration updated successfully');
            loadClassConfigurations();
            
            // IMPORTANT: Ask if they want to update existing students
            if (confirm('Do you want to update fees for ALL existing students in this class?')) {
                updateAllStudentsInClass(data.config.className, updates.baseFee);
            }
        }
    } catch (error) {
        console.error('Error updating class config:', error);
        showToast('Failed to update class configuration', 'error');
    }
}

// ========== UTILITY FUNCTIONS ==========

function refreshStats() {
    loadDashboardStats();
    showToast('Dashboard refreshed successfully');
}

function viewPendingPayments() {
    showTab('managePayments');
    // Scroll to pending section
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

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin page loaded');
    
    // Initialize
    loadDashboardStats();
    addClassRow();
    initializeBulkUpload();
    initializeModalEvents();
    
    // Attach form handler
    const form = document.getElementById('addStudentForm');
    if (form) {
        form.addEventListener('submit', handleAddStudent);
        console.log('✅ Form submission handler attached');
    }
    
    // Setup file input if needed
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) {
        const uploadSection = document.querySelector('.bulk-upload-section');
        if (uploadSection) {
            const newFileInput = document.createElement('input');
            newFileInput.type = 'file';
            newFileInput.id = 'fileInput';
            newFileInput.className = 'file-input';
            newFileInput.accept = '.csv';
            newFileInput.style.display = 'none';
            newFileInput.onchange = function() { handleFileUpload(this); };
            uploadSection.appendChild(newFileInput);
        }
    }
});

// ========== TEACHERS MANAGEMENT - BACKEND ONLY ==========

// Get all teachers from backend
async function fetchTeachers() {
    try {
        const response = await fetch(`${API_BASE}/teachers`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch teachers');
        }
        
        if (data.success && Array.isArray(data.teachers)) {
            console.log(`Fetched ${data.teachers.length} teachers from backend`);
            return data.teachers;
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error fetching teachers:', error);
        showToast('Failed to fetch teachers from server', 'error');
        return []; // Return empty array on error
    }
}

// Load and display teachers (no caching, always from backend)
async function loadTeachersMasterList() {
    console.log('loadTeachersMasterList() called');
    
    const teachers = await fetchTeachers();
    console.log('Teachers from backend:', teachers);
    
    const manageTeachers = document.getElementById('manageTeachers');
    if (!manageTeachers) {
        console.error('manageTeachers div not found');
        return;
    }
    
    let teachersListContainer = document.getElementById('teachersMasterList');
    
    if (!teachersListContainer) {
        teachersListContainer = document.createElement('div');
        teachersListContainer.id = 'teachersMasterList';
        teachersListContainer.style.cssText = `
            background: white; 
            padding: 20px; 
            border-radius: 10px; 
            margin-bottom: 30px;
            border: 1px solid #eee; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        `;
        manageTeachers.insertBefore(teachersListContainer, manageTeachers.firstChild);
    }
    
    if (!teachers || teachers.length === 0) {
        teachersListContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <i class="fas fa-info-circle fa-2x" style="margin-bottom: 10px;"></i>
                <p>No teachers found. Add your first teacher below.</p>
                <button class="btn btn-primary" onclick="showAddTeacherModal()" style="margin-top: 10px;">
                    <i class="fas fa-plus"></i> Add New Teacher
                </button>
            </div>
        `;
        return;
    }
    
    let teachersHTML = '';
    teachers.forEach(teacher => {
        teachersHTML += `
            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; border: 1px solid #e9ecef;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4 style="margin: 0 0 8px; color: #2c3e50;">${teacher.name}</h4>
                        <p style="margin: 0; color: #7f8c8d; font-size: 0.9em;">
                            <i class="fas fa-music"></i> 
                            ${teacher.classes?.length ? teacher.classes.join(' • ') : 'No classes assigned'}
                        </p>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button class="action-btn" style="background: #3498db;" 
                                onclick="editTeacher('${teacher._id}', '${teacher.name}')" 
                                title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" style="background: #e74c3c;" 
                                onclick="deleteTeacher('${teacher._id}', '${teacher.name}')" 
                                title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    teachersListContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="color: #34495e; margin: 0;">
                <i class="fas fa-users"></i> Master Teachers List
            </h3>
            <button class="btn btn-primary" onclick="showAddTeacherModal()" style="padding: 8px 15px;">
                <i class="fas fa-plus"></i> Add New Teacher
            </button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
            ${teachersHTML}
        </div>
    `;
}

// Show add teacher modal
window.showAddTeacherModal = function() {
    const name = prompt('Enter teacher name:');
    if (name && name.trim()) {
        addNewTeacher(name.trim());
    }
};

// Add new teacher
async function addNewTeacher(name) {
    try {
        const response = await fetch(`${API_BASE}/teachers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: name,
                classes: [] 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`Teacher "${name}" added successfully`, 'success');
            await loadTeachersMasterList();
            loadClassConfigurations(); // Refresh dropdowns
        } else {
            showToast(data.message || 'Failed to add teacher', 'error');
        }
    } catch (error) {
        console.error('Error adding teacher:', error);
        showToast('Failed to add teacher', 'error');
    }
}

// Edit teacher
window.editTeacher = function(teacherId, teacherName) {
    console.log('editTeacher called with:', teacherId, teacherName);
    
    // Fetch current teacher data
    fetch(`${API_BASE}/teachers/${teacherId}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const teacher = data.teacher;
                const currentClasses = teacher.classes || [];
                
                showEditTeacherModal(teacherId, teacherName, currentClasses);
            } else {
                showToast('Failed to load teacher details', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading teacher:', error);
            showToast('Failed to load teacher details', 'error');
        });
};

// Show edit teacher modal
function showEditTeacherModal(teacherId, teacherName, currentClasses) {
    const classOptions = [
        'Carnatic Vocal', 'Veena', 'Violin', 'Mridangam', 
        'Mirdhangam', 'Keyboard', 'Bharatanatyam', 'Mirthangam'
    ];
    
    let classCheckboxes = '';
    classOptions.forEach(className => {
        const checked = currentClasses.includes(className) ? 'checked' : '';
        classCheckboxes += `
            <label style="display: block; margin: 5px 0;">
                <input type="checkbox" class="teacher-class-checkbox" value="${className}" ${checked}>
                ${className}
            </label>
        `;
    });
    
    // Remove existing modal if any
    const existingModal = document.getElementById('teacherEditModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'teacherEditModal';
    modal.style.cssText = `
        display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;
    `;
    
    // Close when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeEditTeacherModal();
        }
    });
    
    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 10px; max-width: 450px; width: 90%; margin: 20px auto; box-shadow: 0 5px 20px rgba(0,0,0,0.2);">
            <h3 style="margin-bottom: 20px; color: #34495e;">Edit Teacher</h3>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Teacher Name:</label>
                <input type="text" id="editTeacherNameInput" value="${teacherName}" 
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem;">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px; font-weight: 500;">Classes:</label>
                <div style="max-height: 250px; overflow-y: auto; border: 1px solid #eee; padding: 15px; border-radius: 6px; background: #f9f9f9;">
                    ${classCheckboxes}
                </div>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="closeEditTeacherModal()" style="padding: 10px 20px; cursor: pointer;">Cancel</button>
                <button class="btn btn-primary" onclick="saveTeacherChanges('${teacherId}')" style="padding: 10px 20px; cursor: pointer;">Save Changes</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Close edit teacher modal
window.closeEditTeacherModal = function() {
    console.log('closeEditTeacherModal called');
    const modal = document.getElementById('teacherEditModal');
    if (modal) {
        modal.remove();
    }
};

// Save teacher changes
window.saveTeacherChanges = async function(teacherId) {
    console.log('saveTeacherChanges called with teacherId:', teacherId);
    
    const newName = document.getElementById('editTeacherNameInput')?.value;
    const selectedClasses = Array.from(document.querySelectorAll('.teacher-class-checkbox:checked'))
        .map(cb => cb.value);
    
    if (!newName) {
        showToast('Teacher name is required', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/teachers/${teacherId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: newName, 
                classes: selectedClasses 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Teacher updated successfully', 'success');
            closeEditTeacherModal();
            
            // Refresh from backend
            await loadTeachersMasterList();
            loadClassConfigurations();
        } else {
            showToast(data.message || 'Failed to update teacher', 'error');
        }
    } catch (error) {
        console.error('Error updating teacher:', error);
        showToast('Failed to update teacher', 'error');
    }
};

// Delete teacher
window.deleteTeacher = async function(teacherId, teacherName) {
    if (!confirm(`Are you sure you want to delete teacher "${teacherName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/teachers/${teacherId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`Teacher "${teacherName}" deleted successfully`, 'success');
            
            // Refresh from backend
            await loadTeachersMasterList();
            loadClassConfigurations();
        } else {
            showToast(data.message || 'Failed to delete teacher', 'error');
        }
    } catch (error) {
        console.error('Error deleting teacher:', error);
        showToast('Failed to delete teacher', 'error');
    }
};

// Update the addClassRow function to use backend teachers
async function addClassRow(className = '', instructor = '', monthlyFee = '', batchTiming = '') {
    const container = document.getElementById('classesContainer');
    if (!container) return;
    
    const row = document.createElement('div');
    row.className = 'class-row';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1.5fr 1fr 1.5fr auto; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    // Fetch teachers from backend
    const teachers = await fetchTeachers();
    
    // Build instructor options
    let instructorOptions = '<option value="">Select Instructor</option>';
    teachers.forEach(teacher => {
        instructorOptions += `<option value="${teacher.name}" ${instructor === teacher.name ? 'selected' : ''}>${teacher.name}</option>`;
    });
    
    row.innerHTML = `
        <select class="className" onchange="updateClassFee(this)" required>
            <option value="">Select Class</option>
            <option value="Carnatic Vocal" data-fee="250" ${className === 'Carnatic Vocal' ? 'selected' : ''}>Carnatic Vocal</option>
            <option value="Veena" data-fee="280" ${className === 'Veena' ? 'selected' : ''}>Veena</option>
            <option value="Violin" data-fee="250" ${className === 'Violin' ? 'selected' : ''}>Violin</option>
            <option value="Mridangam" data-fee="300" ${className === 'Mridangam' ? 'selected' : ''}>Mridangam</option>
            <option value="Mirdhangam" data-fee="300" ${className === 'Mirdhangam' ? 'selected' : ''}>Mirdhangam</option>
            <option value="Keyboard" data-fee="450" ${className === 'Keyboard' ? 'selected' : ''}>Keyboard</option>
            <option value="Bharatanatyam" data-fee="300" ${className === 'Bharatanatyam' ? 'selected' : ''}>Bharatanatyam</option>
        </select>

        <select class="instructor">
            ${instructorOptions}
        </select>

        <input type="number" class="monthlyFee" placeholder="Fee" min="0" value="${monthlyFee}" readonly style="background: #f0f0f0;" />

        <input type="text" class="batchTiming" placeholder="Batch Timing" value="${batchTiming}" />

        <button type="button" onclick="removeClassRow(this)" class="btn" style="background:#e74c3c;color:white; padding: 8px;">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(row);
    setTimeout(() => updateTotalFee(), 0);
}

// Remove the old getTeachersFromStorage function completely

// Add event listeners for preview updates
document.addEventListener('DOMContentLoaded', function() {
    // Add input event for base fee to update preview
    const baseFeeInput = document.getElementById('editBaseFee');
    if (baseFeeInput) {
        baseFeeInput.addEventListener('input', updateEditPreview);
    }
});

function initializeModalEvents() {
    document.addEventListener('click', function(event) {
        const modal = document.getElementById('studentModal');
        if (modal && event.target === modal) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
            closeEditTeacherModal();
        }
    });
}