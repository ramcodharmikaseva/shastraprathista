const API_BASE_URL = 'http://192.168.0.18:5000/api/music';

// ========== CLASS NAME MAPPING FUNCTIONS ==========
// Define these at the top so they're available everywhere

// Map schema name (from DB) to display name (for dropdown)
// Map schema name (from DB) to display name (for dropdown)
function mapSchemaToDisplayName(schemaName) {
    if (!schemaName) return schemaName;
    
    const mapping = {
        'Carnatic Veena': 'Veena',
        'Carnatic Violin': 'Violin',
        'Mridangam': 'Mridangam',  // Show as Mridangam
        'Carnatic Vocal': 'Carnatic Vocal',
        'Keyboard': 'Keyboard',
        'Bharatanatyam': 'Bharatanatyam'
    };
    
    return mapping[schemaName] || schemaName;
}

// Map display name (from dropdown) to schema name (for saving)
function mapDisplayToSchemaName(displayName) {
    if (!displayName) return displayName;
    
    const mapping = {
        'Veena': 'Carnatic Veena',
        'Violin': 'Carnatic Violin',
        'Mridangam': 'Mridangam',      // Keep as Mridangam
        'Mirdhangam': 'Mridangam',      // Convert to Mridangam
        'Mirthangam': 'Mridangam',      // Convert to Mridangam
        'Carnatic Vocal': 'Carnatic Vocal',
        'Keyboard': 'Keyboard',
        'Bharatanatyam': 'Bharatanatyam'
    };
    
    return mapping[displayName] || displayName;
}

console.log('✅ Class name mapping functions loaded');

// Also make sure the form is properly initialized
document.addEventListener('DOMContentLoaded', function() {
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', handleAddStudent);
    }
});

// Class name mapping function (make it globally available)
function mapClassNameToSchema(className) {
    if (!className) return className;
    
    const mapping = {
        // Display name -> Schema name
        'Veena': 'Carnatic Veena',
        'Violin': 'Carnatic Violin',
        'Mirdhangam': 'Mridangam',  // Keep as Mirdhangam
        'Carnatic Vocal': 'Carnatic Vocal',
        'Keyboard': 'Keyboard',
        'Bharatanatyam': 'Bharatanatyam',
        
        // Handle any other variations
        'Carnatic Veena': 'Carnatic Veena',
        'Carnatic Violin': 'Carnatic Violin'
    };
    
    return mapping[className] || className;
}

// Also create reverse mapping for display
function schemaToDisplay(schemaName) {
    if (!schemaName) return schemaName;
    
    const mapping = {
        'Carnatic Veena': 'Veena',
        'Carnatic Violin': 'Violin',
        'Mirdhangam': 'Mridangam',  // Keep as Mirdhangam
        'Carnatic Vocal': 'Carnatic Vocal',
        'Keyboard': 'Keyboard',
        'Bharatanatyam': 'Bharatanatyam'
    };
    
    return mapping[schemaName] || schemaName;
}

// Map display name (from dropdown) to schema name (for saving)
function displayToSchema(displayName) {
    if (!displayName) return displayName;
    
    const mapping = {
        'Veena': 'Carnatic Veena',
        'Violin': 'Carnatic Violin',
        'Mirdhangam': 'Mridangam',  // Keep as Mirdhangam
        'Carnatic Vocal': 'Carnatic Vocal',
        'Keyboard': 'Keyboard',
        'Bharatanatyam': 'Bharatanatyam'
    };
    
    return mapping[displayName] || displayName;
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
        
        // Multiple Classes
        const classes = [];
        let totalMonthlyFee = 0;
        
        document.querySelectorAll('#classesContainer .class-row').forEach(row => {
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
        
        // Address
        const address = {
            street: document.getElementById('street')?.value || '',
            city: document.getElementById('city')?.value || '',
            state: document.getElementById('state')?.value || '',
            pincode: document.getElementById('pincode')?.value || ''
        };
        
        // Guardian
        const guardianName = document.getElementById('guardianName')?.value || '';
        const guardianPhone = document.getElementById('guardianPhone')?.value || '';
        const notes = document.getElementById('notes')?.value || '';
        
        // Final object
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
            await addClassRow(); // Wait for first class row to be added
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

// Helper function to validate email - STRICTER VERSION
function isValidEmail(email) {
    if (!email) return false;
    
    // Trim and lowercase
    email = email.trim().toLowerCase();
    
    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;
    
    // List of common valid TLDs (add more as needed)
    const validTLDs = [
        '.com', '.org', '.net', '.edu', '.gov', '.mil',
        '.in', '.us', '.uk', '.ca', '.au', '.de', '.fr', '.jp',
        '.co.in', '.org.in', '.net.in',
        '.ac.in', '.edu.in', '.gov.in'
    ];
    
    // Check if email ends with valid TLD
    const isValidTLD = validTLDs.some(tld => email.endsWith(tld));
    
    if (!isValidTLD) {
        console.log(`❌ Invalid TLD in email: ${email}`);
        return false;
    }
    
    // Check for common typos
    const commonTypos = [
        { wrong: '.cmo', right: '.com' },
        { wrong: '.ocm', right: '.com' },
        { wrong: '.con', right: '.com' },
        { wrong: '.coom', right: '.com' },
        { wrong: '.gmai', right: 'gmail' },  // This is for local part
        { wrong: 'gmil.com', right: 'gmail.com' },
        { wrong: 'gmial.com', right: 'gmail.com' },
        { wrong: 'yaho.com', right: 'yahoo.com' },
        { wrong: 'yahooo.com', right: 'yahoo.com' }
    ];
    
    for (let typo of commonTypos) {
        if (email.includes(typo.wrong)) {
            console.log(`❌ Possible typo: ${typo.wrong} should be ${typo.right}`);
            return false;
        }
    }
    
    return true;
}

// Add class row with teacher dropdown - FIXED to use backend data
async function addClassRow(className = '', instructor = '', monthlyFee = '', batchTiming = '') {
    const container = document.getElementById('classesContainer');
    if (!container) {
        console.error('Classes container not found');
        return;
    }
    
    // Fetch BOTH teachers and class configs from backend
    let teachers = [];
    let classConfigs = [];
    
    try {
        // Fetch teachers
        const teachersResponse = await fetch(`${API_BASE}/teachers`);
        const teachersData = await teachersResponse.json();
        teachers = teachersData.teachers || [];
        console.log('✅ Fetched teachers:', teachers.map(t => t.name));
        
        // Fetch class configurations
        const classesResponse = await fetch(`${API_BASE}/class-configurations`);
        const classesData = await classesResponse.json();
        classConfigs = classesData.configurations || classesData.data || [];
        console.log('✅ Fetched class configs:', classConfigs.map(c => c.className));
        
    } catch (error) {
        console.error('Error fetching data:', error);
        // If backend fails, show error but don't use hardcoded fallbacks
        showToast('Failed to load class data from server', 'error');
        return;
    }
    
    const row = document.createElement('div');
    row.className = 'class-row';
    row.style.cssText = `
        display: grid; 
        grid-template-columns: 2fr 1.5fr 1fr 1.5fr auto; 
        gap: 15px; 
        margin-bottom: 15px; 
        align-items: center;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
    `;
    
    // ✅ Build class options FROM BACKEND
    let classOptions = '<option value="">Select Class</option>';
    classConfigs.forEach(config => {
        const configClassName = config.className || '';
        const configFee = config.baseFee || 0;
        const selected = (className && className === configClassName) ? 'selected' : '';
        
        // Map for display if needed
        let displayName = configClassName;
        if (displayName === 'Carnatic Veena') displayName = 'Veena';
        if (displayName === 'Carnatic Violin') displayName = 'Violin';
        
        classOptions += `<option value="${configClassName}" data-fee="${configFee}" ${selected}>${displayName} (₹${configFee})</option>`;
    });
    
    // ✅ Build instructor options FROM BACKEND
    let instructorOptions = '<option value="">Select Instructor</option>';
    teachers.forEach(teacher => {
        const teacherName = teacher.name || '';
        const selected = (instructor && instructor === teacherName) ? 'selected' : '';
        instructorOptions += `<option value="${escapeHtml(teacherName)}" ${selected}>${escapeHtml(teacherName)}</option>`;
    });
    
    // If no teachers found, add a message
    if (teachers.length === 0) {
        instructorOptions += '<option value="" disabled>No teachers available</option>';
    }
    
    row.innerHTML = `
        <select class="className" onchange="updateClassFee(this)" required
                style="height: 45px; padding: 8px 12px; border-radius: 6px; border: 2px solid #e0e6ed; font-size: 14px;">
            ${classOptions}
        </select>

        <select class="instructor" required
                style="height: 45px; padding: 8px 12px; border-radius: 6px; border: 2px solid #e0e6ed; font-size: 14px;">
            ${instructorOptions}
        </select>

        <input type="number" class="monthlyFee" placeholder="Fee" min="0" value="${monthlyFee}" readonly 
               style="height: 45px; padding: 8px 12px; border-radius: 6px; border: 2px solid #e0e6ed; background:#f0f0f0; font-size: 14px;" />

        <input type="text" class="batchTiming" placeholder="Batch Timing (e.g., Mon 4PM)" value="${batchTiming}"
               style="height: 45px; padding: 8px 12px; border-radius: 6px; border: 2px solid #e0e6ed; font-size: 14px;" />

        <button type="button" onclick="removeClassRow(this)" 
                style="height: 45px; width: 45px; background:#e74c3c; color:white; border:none; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(row);
    setTimeout(() => updateTotalFee(), 0);
}

// Remove class row function
function removeClassRow(btn) {
    const row = btn.closest('.class-row');
    const container = document.getElementById('classesContainer');
    if (container && container.children.length > 1) {
        row.remove();
        updateTotalFee();
    } else {
        showToast('At least one class is required', 'warning');
    }
}
window.removeClassRow = removeClassRow;

// Update total fee
function updateTotalFee() {
    let total = 0;
    document.querySelectorAll('#classesContainer .class-row').forEach(row => {
        const feeInput = row.querySelector('.monthlyFee');
        const fee = parseInt(feeInput?.value) || 0;
        total += fee;
    });
    
    const totalDisplay = document.getElementById('totalMonthlyFee');
    if (totalDisplay) {
        totalDisplay.textContent = total;
    }
}
window.updateTotalFee = updateTotalFee;

// Update fee when class is selected
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
window.updateClassFee = updateClassFee;

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
                
                if (student.classes && student.classes.length > 0) {
                    classListHTML = student.classes.map(cls => `
                        <div style="margin-bottom:4px;">
                            <strong>${escapeHtml(cls.className || 'Unknown')}</strong><br>
                            <small style="color:#7f8c8d;">
                                ${escapeHtml(cls.instructor || 'No instructor')} | ₹${cls.monthlyFee || 0}
                            </small>
                        </div>
                    `).join('');
                    totalFee = student.totalMonthlyFee || 0;
                } else if (student.className) {
                    classListHTML = `
                        <div style="margin-bottom:4px;">
                            <strong>${escapeHtml(student.className)}</strong><br>
                            <small style="color:#7f8c8d;">
                                ${escapeHtml(student.instructor || 'No instructor')} | ₹${student.monthlyFee || 0}
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
                            ${escapeHtml(student.name)}<br>
                            <small style="color: #7f8c8d;">${escapeHtml(student.email)}</small>
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

            window.currentStudentData = student;
            
            const dob = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'Not provided';
            const joinDate = student.joinDate ? new Date(student.joinDate).toLocaleDateString() : 'N/A';
            const lastPayment = student.lastPaymentDate ? 
                new Date(student.lastPaymentDate).toLocaleDateString() : 'No payments yet';
            const nextDue = student.nextPaymentDue ? 
                new Date(student.nextPaymentDue).toLocaleDateString() : 'Not set';
            
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
                                        <strong>${escapeHtml(payment.month) || 'N/A'}</strong><br>
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
                    let displayClassName = cls.className || 'Unknown';
                    if (displayClassName === 'Carnatic Veena') displayClassName = 'Veena';
                    if (displayClassName === 'Carnatic Violin') displayClassName = 'Violin';
                    
                    return `
                    <div style="margin-bottom:12px;padding:10px;background:#ffffff;border-radius:8px;border:1px solid #eee;">
                        <strong style="color:#2c3e50;">${escapeHtml(displayClassName)}</strong><br>
                        <small>Instructor: ${escapeHtml(cls.instructor || 'Not Assigned')}</small><br>
                        <small>Batch: ${escapeHtml(cls.batchTiming || 'Not Scheduled')}</small><br>
                        <strong style="color:#27ae60;">₹${cls.monthlyFee || 0}</strong>
                    </div>
                `}).join('');
            } else if (student.className) {
                let displayClassName = student.className;
                if (displayClassName === 'Carnatic Veena') displayClassName = 'Veena';
                if (displayClassName === 'Carnatic Violin') displayClassName = 'Violin';
                
                classDetailsHTML = `
                    <div style="margin-bottom:12px;padding:10px;background:#ffffff;border-radius:8px;border:1px solid #eee;">
                        <strong style="color:#2c3e50;">${escapeHtml(displayClassName)}</strong><br>
                        <small>Instructor: ${escapeHtml(student.instructor || 'Not Assigned')}</small><br>
                        <small>Batch: ${escapeHtml(student.batchTiming || 'Not Scheduled')}</small><br>
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
                                    <strong>Full Name:</strong> ${escapeHtml(student.name) || 'N/A'}
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>Email:</strong> ${escapeHtml(student.email) || 'N/A'}
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
                                    <button class="btn btn-primary" onclick="markPaymentForStudent('${student.studentId}', '${escapeHtml(student.name)}')">
                                        <i class="fas fa-rupee-sign"></i> Mark Payment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <h4 style="color: #34495e; margin: 20px 0 10px 0;">Address Information</h4>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        ${student.address?.street ? `<div><strong>Street:</strong> ${escapeHtml(student.address.street)}</div>` : ''}
                        ${student.address?.city ? `<div><strong>City:</strong> ${escapeHtml(student.address.city)}</div>` : ''}
                        ${student.address?.state ? `<div><strong>State:</strong> ${escapeHtml(student.address.state)}</div>` : ''}
                        ${student.address?.pincode ? `<div><strong>Pincode:</strong> ${escapeHtml(student.address.pincode)}</div>` : ''}
                        ${!student.address?.street && !student.address?.city ? 
                            '<div style="color: #7f8c8d;">No address information provided</div>' : ''}
                    </div>
                    
                    ${student.guardianName || student.guardianPhone ? `
                        <h4 style="color: #34495e; margin: 20px 0 10px 0;">Guardian Information</h4>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            ${student.guardianName ? `<div><strong>Name:</strong> ${escapeHtml(student.guardianName)}</div>` : ''}
                            ${student.guardianPhone ? `<div><strong>Phone:</strong> ${student.guardianPhone}</div>` : ''}
                        </div>
                    ` : ''}
                    
                    ${student.notes ? `
                        <h4 style="color: #34495e; margin: 20px 0 10px 0;">Additional Notes</h4>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            ${escapeHtml(student.notes)}
                        </div>
                    ` : ''}
                </div>
                
                <div id="modalPaymentsTab" class="modal-tab-content" style="display: none;">
                    <h4 style="color: #34495e; margin-bottom: 15px;">Payment History for ${escapeHtml(student.name)}</h4>
                    ${paymentHistoryHTML}
                    
                    <div style="margin-top: 20px; text-align: center;">
                        <button class="btn btn-secondary" onclick="viewAllPayments('${student.studentId}')">
                            <i class="fas fa-list"></i> View All Payments
                        </button>
                        <button class="btn btn-primary" onclick="markPaymentForStudent('${student.studentId}', '${escapeHtml(student.name)}')" style="margin-left: 10px;">
                            <i class="fas fa-plus"></i> Add New Payment
                        </button>
                    </div>
                </div>
                
                <div id="modalEditTab" class="modal-tab-content" style="display: none;">
                    <h4 style="color: #34495e; margin-bottom: 20px;">
                        <i class="fas fa-user-edit"></i> Edit Student Information
                    </h4>
                    
                    <form id="editStudentForm" onsubmit="saveMultiClassStudent(event); return false;">
                        <input type="hidden" id="editStudentId" value="${student.studentId}">
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="editName">Full Name *</label>
                                <input type="text" id="editName" value="${escapeHtml(student.name) || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="editEmail">Email Address *</label>
                                <input type="email" id="editEmail" value="${escapeHtml(student.email) || ''}" required>
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
                        
                        <h4 style="margin: 25px 0 15px 0; color: #34495e;">
                            <i class="fas fa-music"></i> Classes Attending
                        </h4>
                        
                        <!-- Multi-class selection dropdown -->
                        <div class="form-group">
                            <label for="editClasses"><strong>Select Classes *</strong></label>
                            <select id="editClasses" multiple size="6" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 150px;" required>
                                <!-- Options will be loaded dynamically -->
                            </select>
                            <small class="form-text text-muted">
                                <i class="fas fa-info-circle"></i> Hold Ctrl (Windows) or Cmd (Mac) to select multiple classes
                            </small>

                            <!-- ADD THIS BUTTON FOR MANUAL LOADING -->
                            <button type="button" id="manualLoadClassesBtn" onclick="manualLoadClasses()" class="btn btn-sm btn-warning" style="margin-top: 10px;">
                                🔄 Manually Load Classes
                            </button>
                        </div>
                        
                        <!-- Selected Classes Summary -->
                        <div id="selectedClassesCard" style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 15px 0; border: 1px solid #e9ecef;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <strong style="font-size: 1.1em;">
                                    <i class="fas fa-check-circle" style="color: #27ae60;"></i> Selected Classes:
                                </strong>
                                <span id="editClassCount" style="background: #3498db; color: white; padding: 3px 10px; border-radius: 20px; font-size: 0.9em;">
                                    ${student.classes?.length || (student.className ? 1 : 0) || 0}
                                </span>
                            </div>
                            <div id="selectedClassesList" style="margin: 10px 0; max-height: 150px; overflow-y: auto;">
                                <!-- Will be populated dynamically -->
                            </div>
                            <div style="border-top: 2px dashed #dee2e6; margin-top: 10px; padding-top: 10px;">
                                <div style="display: flex; justify-content: space-between; font-size: 1.2em;">
                                    <strong>Total Monthly Fee:</strong>
                                    <strong style="color: #27ae60;" id="editTotalFee">₹${student.totalMonthlyFee || student.monthlyFee || 0}</strong>
                                </div>
                            </div>
                        </div>
                        
                        <h4 style="margin: 25px 0 15px 0; color: #34495e;">Address Information</h4>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="editStreet">Street Address</label>
                                <input type="text" id="editStreet" value="${escapeHtml(student.address?.street || '')}">
                            </div>
                            
                            <div class="form-group">
                                <label for="editCity">City</label>
                                <input type="text" id="editCity" value="${escapeHtml(student.address?.city || '')}">
                            </div>
                            
                            <div class="form-group">
                                <label for="editState">State</label>
                                <input type="text" id="editState" value="${escapeHtml(student.address?.state || '')}">
                            </div>
                            
                            <div class="form-group">
                                <label for="editPincode">Pincode</label>
                                <input type="text" id="editPincode" value="${escapeHtml(student.address?.pincode || '')}">
                            </div>
                        </div>
                        
                        <h4 style="margin: 25px 0 15px 0; color: #34495e;">Guardian Information</h4>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="editGuardianName">Guardian Name</label>
                                <input type="text" id="editGuardianName" value="${escapeHtml(student.guardian?.name || student.guardianName || '')}">
                            </div>
                            
                            <div class="form-group">
                                <label for="editGuardianPhone">Guardian Phone</label>
                                <input type="tel" id="editGuardianPhone" value="${escapeHtml(student.guardian?.phone || student.guardianPhone || '')}">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editNotes">Additional Notes</label>
                            <textarea id="editNotes" rows="3">${escapeHtml(student.notes || '')}</textarea>
                        </div>
                        
                        <div style="display: flex; gap: 15px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="showModalTab('details')">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </form>
                    
                    <script>
                    (function() {
                        console.log('📝 Edit modal DOM ready');
                        // Just log that the modal is ready - initialization happens in showModalTab
                        console.log('✅ Edit modal loaded, waiting for tab switch...');
                    })();
                    </script>
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

// Manual function to load classes (for debugging)
function manualLoadClasses() {
    console.log('👆 Manual load classes button clicked');
    
    const studentId = document.getElementById('editStudentId')?.value;
    if (!studentId) {
        alert('No student ID found');
        return;
    }
    
    // Get student data from window if available
    const studentClasses = window.currentStudentData?.classes || [];
    
    const simpleStudent = {
        studentId: studentId,
        classes: studentClasses
    };
    
    console.log('Manual loading with student:', simpleStudent);
    
    if (typeof window.loadEditClassesWithMultiSelect === 'function') {
        window.loadEditClassesWithMultiSelect(simpleStudent);
    } else {
        alert('loadEditClassesWithMultiSelect function not found!');
    }
}

function loadEditClassesWithMultiSelect(student) {
    console.log('🚀 loadEditClassesWithMultiSelect called with student:', student?.studentId);
    console.log('Student classes to pre-select:', student?.classes);
    
    // Make sure we have a student object
    if (!student) student = { classes: [] };
    
    // Get the select element
    const classSelect = document.getElementById('editClasses');
    if (!classSelect) {
        console.error('❌ Class select element not found!');
        return;
    }
    
    // Show loading state
    classSelect.innerHTML = '<option value="" disabled>Loading classes...</option>';
    
    // Use API_BASE_URL
    const apiUrl = API_BASE_URL || 'http://192.168.0.18:5000/api/music';
    
    fetch(`${apiUrl}/class-configurations`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Classes loaded from API:', data);
            
            // Clear loading state
            classSelect.innerHTML = '';
            
            // Extract classes from response - handle different response structures
            let classes = [];
            if (data.configurations && Array.isArray(data.configurations)) {
                classes = data.configurations;
            } else if (data.data && Array.isArray(data.data)) {
                classes = data.data;
            } else if (Array.isArray(data)) {
                classes = data;
            }
            
            console.log('Extracted classes:', classes);
            
            if (classes.length === 0) {
                classSelect.innerHTML = '<option value="" disabled>No classes available</option>';
                return;
            }
            
            // Mapping functions
            function schemaToDisplay(schemaName) {
                if (!schemaName) return schemaName;
                
                const mapping = {
                    'Carnatic Veena': 'Veena',
                    'Carnatic Violin': 'Violin',
                    'Mirdhangam': 'Mridangam',  // Keep as Mirdhangam for display
                    'Mridangam': 'Mridangam',    // Show as Mirdhangam
                    'Mirthangam': 'Mridangam',   // Show as Mirdhangam
                    'Carnatic Vocal': 'Carnatic Vocal',
                    'Keyboard': 'Keyboard',
                    'Bharatanatyam': 'Bharatanatyam'
                };
                
                return mapping[schemaName] || schemaName;
            }

            // Also update the displayToSchema function
            function displayToSchema(displayName) {
                if (!displayName) return displayName;
                
                const mapping = {
                    'Veena': 'Carnatic Veena',
                    'Violin': 'Carnatic Violin',
                    'Mirdhangam': 'Mridangam',  // Keep as Mirdhangam
                    'Mridangam': 'Mridangam',   // Convert to Mirdhangam
                    'Mirthangam': 'Mridangam',  // Convert to Mirdhangam
                    'Carnatic Vocal': 'Carnatic Vocal',
                    'Keyboard': 'Keyboard',
                    'Bharatanatyam': 'Bharatanatyam'
                };
                
                return mapping[displayName] || displayName;
            }
            
            function mapClassNameToSchema(className) {
                if (!className) return className;
                
                const mapping = {
                    'Veena': 'Carnatic Veena',
                    'Violin': 'Carnatic Violin',
                    'Mridangam': 'Mridangam',
                    'Mirdhangam': 'Mridangam',
                    'Mirthangam': 'Mridangam',
                    'Carnatic Vocal': 'Carnatic Vocal',
                    'Keyboard': 'Keyboard',
                    'Bharatanatyam': 'Bharatanatyam'
                };
                
                return mapping[className] || className;
            }
            
            // Add options for each class
            classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls._id || cls.id || `class-${Date.now()}-${Math.random()}`;
                
                // Get schema name from API
                const schemaName = cls.className || cls.name || 'Unknown Class';
                // Get display name for UI
                const displayName = schemaToDisplay(schemaName);
                
                // IMPORTANT: Use actual teacher names from your database, not "Sri. Annapparaj"
                const teacherName = cls.teacherName || cls.teacher || 'Not Assigned';
                const fee = cls.baseFee || cls.fee || 0;
                
                // Show in dropdown
                option.textContent = `${displayName} - ${teacherName} (₹${fee})`;
                
                // Store data attributes
                option.setAttribute('data-class-name', schemaName);
                option.setAttribute('data-display-name', displayName);
                option.setAttribute('data-teacher', teacherName);  // This should be actual teacher name
                option.setAttribute('data-fee', fee);
                option.setAttribute('data-class-id', cls._id || cls.id || '');
        
                // Check if this class should be pre-selected
                if (student && student.classes && Array.isArray(student.classes) && student.classes.length > 0) {
                    
                    const isSelected = student.classes.some(c => {
                        // Get student class name (might be display name or schema name)
                        const studentClassName = c.className || '';
                        
                        // METHOD 1: Check by classId (most reliable)
                        if (c.classId && (c.classId === cls._id || c.classId === cls.id)) {
                            console.log(`✅ [ID Match] ${displayName} (ID: ${cls._id})`);
                            return true;
                        }
                        
                        // METHOD 2: Check by schema name match
                        if (studentClassName === schemaName) {
                            console.log(`✅ [Schema Name Match] ${displayName}`);
                            return true;
                        }
                        
                        // METHOD 3: Check by display name match
                        if (studentClassName === displayName) {
                            console.log(`✅ [Display Name Match] ${displayName}`);
                            return true;
                        }
                        
                        // METHOD 4: Check mapped name
                        const mappedStudentName = mapClassNameToSchema(studentClassName);
                        if (mappedStudentName === schemaName) {
                            console.log(`✅ [Mapped Name Match] ${displayName}`);
                            return true;
                        }
                        
                        // METHOD 5: Check for Mridangam variation
                        const isMridangam = schemaName.toLowerCase().includes('mrid') || 
                                           schemaName.toLowerCase().includes('mirth');
                        const studentIsMridangam = studentClassName.toLowerCase().includes('mrid') || 
                                                  studentClassName.toLowerCase().includes('mirth');
                        
                        if (isMridangam && studentIsMridangam) {
                            console.log(`✅ [Mridangam Match] ${displayName}`);
                            return true;
                        }
                        
                        return false;
                    });
                    
                    if (isSelected) {
                        option.selected = true;
                        console.log('👉 Pre-selected:', displayName);
                    }
                }
                
                classSelect.appendChild(option);
            });
            
            console.log(`✅ Added ${classes.length} class options to dropdown`);
            
            // Remove existing event listener and add new one
            classSelect.removeEventListener('change', updateEditSelectedClasses);
            classSelect.addEventListener('change', updateEditSelectedClasses);
            
            // Initial update of summary
            if (typeof updateEditSelectedClasses === 'function') {
                setTimeout(() => {
                    updateEditSelectedClasses();
                }, 100);
            }
            
            // Log which classes are selected
            const selectedOptions = Array.from(classSelect.selectedOptions);
            console.log('Selected classes after loading:', selectedOptions.map(opt => {
                return {
                    text: opt.text,
                    className: opt.getAttribute('data-class-name'),
                    displayName: opt.getAttribute('data-display-name')
                };
            }));
            
            // If no classes are selected but student has classes, show warning
            if (selectedOptions.length === 0 && student.classes && student.classes.length > 0) {
                console.warn('⚠️ Student has', student.classes.length, 'classes but none were matched!');
                console.warn('Student classes:', student.classes.map(c => ({
                    className: c.className,
                    classId: c.classId
                })));
                console.warn('Available classes:', classes.map(c => ({
                    className: c.className || c.name,
                    classId: c._id || c.id
                })));
                
                // Show a message to the user
                if (typeof showToast === 'function') {
                    showToast(`Found ${student.classes.length} existing classes but couldn't match them. Please manually select the classes.`, 'warning');
                }
            }
            
        })
        .catch(error => {
            console.error('❌ Error loading classes:', error);
            classSelect.innerHTML = '<option value="" disabled>Error loading classes</option>';
            if (typeof showToast === 'function') {
                showToast('Error loading classes: ' + error.message, 'error');
            }
        });
}

// Also update the updateEditSelectedClasses function to be more robust
function updateEditSelectedClasses() {
    console.log('Updating selected classes summary');
    
    const classSelect = document.getElementById('editClasses');
    const selectedList = document.getElementById('selectedClassesList');
    const totalSpan = document.getElementById('editTotalFee');
    const classCount = document.getElementById('editClassCount');
    
    if (!classSelect) {
        console.error('❌ editClasses element not found in updateEditSelectedClasses');
        return;
    }
    
    if (!selectedList) {
        console.error('❌ selectedClassesList element not found');
        return;
    }
    
    if (!totalSpan) {
        console.error('❌ editTotalFee element not found');
        return;
    }
    
    const selectedOptions = Array.from(classSelect.selectedOptions);
    console.log('Selected options:', selectedOptions.length);
    
    let totalFee = 0;
    let listHtml = '<div style="margin: 0; padding: 0;">';
    
    if (selectedOptions.length === 0) {
        selectedList.innerHTML = '<em style="color: #7f8c8d;">No classes selected</em>';
        totalSpan.innerHTML = '₹0';
        if (classCount) classCount.textContent = '0';
        return;
    }
    
    selectedOptions.forEach((opt, index) => {
        // Get data from attributes
        const className = opt.getAttribute('data-class-name') || 
                         opt.getAttribute('data-display-name') || 
                         opt.textContent.split(' - ')[0] || 
                         'Unknown';
        const teacher = opt.getAttribute('data-teacher') || 'Unknown';
        const fee = parseFloat(opt.getAttribute('data-fee')) || 0;
        
        console.log(`Option ${index}:`, {className, teacher, fee});
        
        totalFee += fee;
        listHtml += `<div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #3498db;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${className}</strong><br>
                    <small style="color: #7f8c8d;">👤 ${teacher}</small>
                </div>
                <span style="color: #27ae60; font-weight: bold; font-size: 1.1em;">₹${fee}</span>
            </div>
        </div>`;
    });
    
    listHtml += '</div>';
    
    selectedList.innerHTML = listHtml;
    totalSpan.innerHTML = `₹${totalFee.toLocaleString('en-IN')}`;
    
    if (classCount) {
        classCount.textContent = selectedOptions.length;
    }
    
    console.log('Summary updated, total fee:', totalFee);
}

// In saveMultiClassStudent, fetch teachers first or use cached list
async function saveMultiClassStudent(event) {
    event.preventDefault();
    
    console.log('💾 saveMultiClassStudent called');
    
    // Get form values
    const studentId = document.getElementById('editStudentId').value;
    const name = document.getElementById('editName').value;
    const email = document.getElementById('editEmail').value;
    const phone = document.getElementById('editPhone').value;
    const dateOfBirth = document.getElementById('editDateOfBirth')?.value || null;
    const gender = document.getElementById('editGender')?.value || '';
    const status = document.getElementById('editStatus').value;
    
    // Get selected classes
    const classSelect = document.getElementById('editClasses');
    const selectedOptions = Array.from(classSelect.selectedOptions);
    
    // Get teachers list for validation
    let teachersList = [];
    try {
        const teachersResponse = await fetch(`${API_BASE}/teachers`);
        const teachersData = await teachersResponse.json();
        teachersList = teachersData.teachers || [];
        console.log('📋 Teachers list for validation:', teachersList.map(t => t.name));
    } catch (error) {
        console.error('Error fetching teachers:', error);
    }
    
    console.log('RAW SELECTED OPTIONS:', selectedOptions.map(opt => ({
        value: opt.value,
        text: opt.text,
        classNameAttr: opt.getAttribute('data-class-name'),
        displayNameAttr: opt.getAttribute('data-display-name'),
        teacherAttr: opt.getAttribute('data-teacher'),
        feeAttr: opt.getAttribute('data-fee'),
        classIdAttr: opt.getAttribute('data-class-id')
    })));
    
    // Map class names to match backend enum EXACTLY
    function mapClassNameToEnum(className) {
        if (!className) return className;
        
        console.log(`Mapping class name: "${className}"`);
        
        // Handle Mridangam variations
        const lowerName = className.toLowerCase();
        if (lowerName.includes('mrid') || lowerName.includes('mird') || lowerName.includes('mirth')) {
            return 'Mridangam';
        }
        
        // Handle Carnatic Vocal - if it's the old format without A/B/C
        if (lowerName === 'carnatic vocal' || lowerName.includes('carnatic vocal') && !lowerName.includes('-')) {
            // You might want to default to 'Carnatic Vocal - A' or show a warning
            console.warn('⚠️ Found old format "Carnatic Vocal", please update to A/B/C');
            return 'Carnatic Vocal - A'; // Or return as-is and let the backend handle it
        }
        
        // Return as-is for all other classes (they should match backend exactly)
        return className;
    }
    
    // Map selected options
    const selectedClasses = selectedOptions.map((opt, index) => {
        // Get class name from data attribute or text
        let className = opt.getAttribute('data-class-name');
        let displayName = opt.getAttribute('data-display-name') || opt.text.split(' - ')[0];
        
        console.log(`\n--- Processing class ${index + 1} ---`);
        console.log('Raw className attr:', className);
        console.log('Raw displayName:', displayName);
        
        // Map to proper enum value
        let mappedClassName = mapClassNameToEnum(className || displayName);
        
        // Get instructor from the option
        let instructor = opt.getAttribute('data-teacher') || 'Other';
        
        // Map instructor to actual teacher name from database
        if (teachersList.length > 0) {
            const teacherMatch = teachersList.find(t => 
                t.name === instructor || 
                t.name.toLowerCase().includes(instructor.toLowerCase()) ||
                instructor.toLowerCase().includes(t.name.toLowerCase())
            );
            
            if (teacherMatch) {
                instructor = teacherMatch.name;
                console.log(`✅ Matched instructor to teacher: ${instructor}`);
            } else {
                console.log(`⚠️ No match found for instructor: ${instructor}, using as is`);
            }
        }
        
        // Get fee
        const monthlyFee = parseFloat(opt.getAttribute('data-fee')) || 0;
        
        // Get class ID
        const classId = opt.getAttribute('data-class-id') || opt.value;
        
        const classObj = {
            classId: classId,
            className: mappedClassName,
            instructor: instructor,
            monthlyFee: monthlyFee,
            batchTiming: opt.getAttribute('data-batch-timing') || ''
        };
        
        console.log('Final class object:', classObj);
        
        return classObj;
    });
    
    console.log('\n📦 ALL MAPPED CLASSES:', JSON.stringify(selectedClasses, null, 2));
    
    // Validate
    if (!name || !email || !phone) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (selectedClasses.length === 0) {
        showToast('Please select at least one class', 'error');
        return;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    // Validate phone
    const cleanPhone = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        showToast('Phone number must be 10 digits starting with 6-9', 'error');
        return;
    }
    
    // Calculate total
    const totalMonthlyFee = selectedClasses.reduce((sum, cls) => sum + cls.monthlyFee, 0);
    
    // Build address
    const address = {
        street: document.getElementById('editStreet')?.value || '',
        city: document.getElementById('editCity')?.value || '',
        state: document.getElementById('editState')?.value || '',
        pincode: document.getElementById('editPincode')?.value || ''
    };
    
    // Build guardian
    const guardianName = document.getElementById('editGuardianName')?.value || '';
    const guardianPhone = document.getElementById('editGuardianPhone')?.value || '';
    
    // Build student data
    const studentData = {
        name: name,
        email: email,
        phone: cleanPhone,
        dateOfBirth: dateOfBirth || null,
        gender: gender,
        classes: selectedClasses,
        totalMonthlyFee: totalMonthlyFee,
        status: status,
        address: address,
        guardianName: guardianName,
        guardianPhone: guardianPhone.replace(/\D/g, ''),
        notes: document.getElementById('editNotes')?.value || ''
    };
    
    // Remove empty fields
    if (!studentData.dateOfBirth) delete studentData.dateOfBirth;
    if (!studentData.gender) delete studentData.gender;
    
    console.log('📤 FINAL DATA TO SERVER:', JSON.stringify(studentData, null, 2));
    
    // Show loading
    const submitBtn = event.submitter;
    const originalText = submitBtn?.innerHTML;
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
    }
    
    // Send update
    fetch(`${API_BASE}/update-student/${studentId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData)
    })
    .then(async response => {
        const text = await response.text();
        console.log('Raw response:', text);
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse response as JSON:', e);
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }
    })
    .then(data => {
        console.log('Update response:', data);
        
        if (data.success) {
            showToast('Student updated successfully!', 'success');
            
            setTimeout(() => {
                closeModal();
                loadStudents();
            }, 1500);
        } else {
            throw new Error(data.message || 'Failed to update student');
        }
    })
    .catch(error => {
        console.error('❌ Error updating student:', error);
        showToast('Error updating student: ' + error.message, 'error');
    })
    .finally(() => {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ============================================
// EDIT STUDENT FUNCTIONS - UPDATED for multi-class
// ============================================

// Updated editStudent function - use this version
function editStudent(studentId) {
    console.log('✏️ Edit student:', studentId);
    viewStudent(studentId);
    
    // Switch to edit tab after a delay
    setTimeout(() => {
        // Find and click the edit tab button
        const editTabBtn = Array.from(document.querySelectorAll('.modal-tab-btn')).find(
            btn => btn.textContent.includes('Edit')
        );
        if (editTabBtn) {
            editTabBtn.click();
        } else {
            showModalTab('edit');
        }
    }, 1000);
}

// New function to populate edit form with multi-class support
function populateEditFormWithMultiClass(student) {
    console.log('Populating edit form for student:', student);
    
    // Get the modal content element
    const modalContent = document.getElementById('modalContent');
    
    // Store student data for later use
    window.currentEditingStudent = student;
    
    // Build the edit form HTML with multi-class support
    const editFormHTML = `
        <div class="student-edit-form">
            <form id="editStudentForm" onsubmit="saveMultiClassStudent(event)">
                <input type="hidden" id="editStudentId" value="${student.studentId || ''}">
                
                <h4 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 20px;">
                    <i class="fas fa-user-edit"></i> Basic Information
                </h4>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
                    <div class="form-group">
                        <label><strong>Full Name *</strong></label>
                        <input type="text" id="editName" class="form-control" value="${escapeHtml(student.name || '')}" required>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Email *</strong></label>
                        <input type="email" id="editEmail" class="form-control" value="${escapeHtml(student.email || '')}" required>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Phone *</strong></label>
                        <input type="tel" id="editPhone" class="form-control" value="${escapeHtml(student.phone || '')}" required>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Status</strong></label>
                        <select id="editStatus" class="form-control">
                            <option value="active" ${student.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${student.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            <option value="graduated" ${student.status === 'graduated' ? 'selected' : ''}>Graduated</option>
                            <option value="on_leave" ${student.status === 'on_leave' ? 'selected' : ''}>On Leave</option>
                        </select>
                    </div>
                </div>
                
                <h4 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin: 30px 0 20px 0;">
                    <i class="fas fa-music"></i> Class Enrollment (Select Multiple)
                </h4>
                
                <div class="form-group">
                    <label><strong>Classes *</strong></label>
                    <select id="editClasses" multiple size="6" class="form-control" style="height: auto; min-height: 150px;" required>
                        <!-- Options will be loaded dynamically -->
                    </select>
                    <small class="form-text text-muted">
                        <i class="fas fa-info-circle"></i> Hold Ctrl (Windows) or Cmd (Mac) to select multiple classes
                    </small>
                </div>
                
                <!-- Selected Classes Summary -->
                <div id="selectedClassesCard" style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 15px 0; border: 1px solid #e9ecef;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="font-size: 1.1em;">
                            <i class="fas fa-check-circle" style="color: #27ae60;"></i> Selected Classes:
                        </strong>
                        <span id="classCount" style="background: #3498db; color: white; padding: 3px 10px; border-radius: 20px; font-size: 0.9em;">0</span>
                    </div>
                    <div id="selectedClassesList" style="margin: 10px 0; max-height: 150px; overflow-y: auto;">
                        <em style="color: #7f8c8d;">No classes selected</em>
                    </div>
                    <div style="border-top: 2px dashed #dee2e6; margin-top: 10px; padding-top: 10px;">
                        <div style="display: flex; justify-content: space-between; font-size: 1.2em;">
                            <strong>Total Monthly Fee:</strong>
                            <strong style="color: #27ae60;" id="editTotalFee">₹0</strong>
                        </div>
                    </div>
                </div>
                
                <h4 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin: 30px 0 20px 0;">
                    <i class="fas fa-map-marker-alt"></i> Address Information
                </h4>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
                    <div class="form-group">
                        <label><strong>Street Address</strong></label>
                        <input type="text" id="editStreet" class="form-control" value="${escapeHtml(student.address?.street || '')}">
                    </div>
                    
                    <div class="form-group">
                        <label><strong>City</strong></label>
                        <input type="text" id="editCity" class="form-control" value="${escapeHtml(student.address?.city || '')}">
                    </div>
                    
                    <div class="form-group">
                        <label><strong>State</strong></label>
                        <input type="text" id="editState" class="form-control" value="${escapeHtml(student.address?.state || '')}">
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Pincode</strong></label>
                        <input type="text" id="editPincode" class="form-control" value="${escapeHtml(student.address?.pincode || '')}">
                    </div>
                </div>
                
                <h4 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin: 30px 0 20px 0;">
                    <i class="fas fa-users"></i> Guardian Information
                </h4>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px;">
                    <div class="form-group">
                        <label><strong>Guardian Name</strong></label>
                        <input type="text" id="editGuardianName" class="form-control" value="${escapeHtml(student.guardian?.name || '')}">
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Guardian Phone</strong></label>
                        <input type="tel" id="editGuardianPhone" class="form-control" value="${escapeHtml(student.guardian?.phone || '')}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label><strong>Additional Notes</strong></label>
                    <textarea id="editNotes" class="form-control" rows="3">${escapeHtml(student.notes || '')}</textarea>
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Update Student
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Set the modal content
    modalContent.innerHTML = editFormHTML;
    
    // Load classes and populate selections
    loadClassesForEdit(student);
}

// Function to load classes and populate selections
function loadClassesForEdit(student) {
    fetch(`${API_BASE_URL}/api/music/class-configurations`)
        .then(response => response.json())
        .then(data => {
            const classes = data.data || [];
            const classSelect = document.getElementById('editClasses');
            
            if (!classSelect) return;
            
            // Clear existing options
            classSelect.innerHTML = '';
            
            // Add options for each class
            classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls._id;
                option.textContent = `${cls.className} - ${cls.teacherName} (₹${cls.baseFee})`;
                option.dataset.className = cls.className;
                option.dataset.teacher = cls.teacherName;
                option.dataset.fee = cls.baseFee;
                
                // Check if this class is already assigned to student
                if (student.classes && Array.isArray(student.classes)) {
                    const isSelected = student.classes.some(c => 
                        c.classId === cls._id || 
                        c.className === cls.className ||
                        (c.classId && c.classId.toString() === cls._id.toString())
                    );
                    if (isSelected) {
                        option.selected = true;
                    }
                }
                
                classSelect.appendChild(option);
            });
            
            // Add event listener for changes
            classSelect.addEventListener('change', updateSelectedClassesSummary);
            
            // Initial update of summary
            updateSelectedClassesSummary();
        })
        .catch(error => {
            console.error('Error loading classes:', error);
            showToast('Error loading classes', 'error');
        });
}

// Function to update selected classes summary
function updateSelectedClassesSummary() {
    const classSelect = document.getElementById('editClasses');
    const selectedList = document.getElementById('selectedClassesList');
    const totalSpan = document.getElementById('editTotalFee');
    const classCount = document.getElementById('classCount');
    
    if (!classSelect || !selectedList || !totalSpan) return;
    
    const selectedOptions = Array.from(classSelect.selectedOptions);
    let totalFee = 0;
    let listHtml = '<ul style="margin: 0; padding-left: 20px;">';
    
    selectedOptions.forEach(opt => {
        const fee = parseFloat(opt.dataset.fee) || 0;
        totalFee += fee;
        listHtml += `<li style="margin-bottom: 5px;">
            <strong>${opt.dataset.className}</strong> with ${opt.dataset.teacher} - ₹${fee}
        </li>`;
    });
    
    listHtml += '</ul>';
    
    if (selectedOptions.length === 0) {
        selectedList.innerHTML = '<em style="color: #7f8c8d;">No classes selected</em>';
    } else {
        selectedList.innerHTML = listHtml;
    }
    
    totalSpan.textContent = `₹${totalFee.toLocaleString('en-IN')}`;
    if (classCount) {
        classCount.textContent = selectedOptions.length;
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// Function to initialize edit modal classes
function initializeEditModalClasses() {
    console.log('🎵 initializeEditModalClasses called');
    
    const classSelect = document.getElementById('editClasses');
    if (!classSelect) {
        console.log('⏳ editClasses not found');
        return false;
    }
    
    // Get student ID from the form
    const studentId = document.getElementById('editStudentId')?.value;
    if (!studentId) {
        console.log('⏳ Student ID not found');
        return false;
    }
    
    console.log('✅ Found student ID:', studentId);
    
    // IMPORTANT: Get the student's existing classes from the page
    // The class count span shows how many classes they have
    const classCountSpan = document.getElementById('editClassCount');
    const classCount = classCountSpan ? parseInt(classCountSpan.textContent) || 0 : 0;
    console.log('Student has', classCount, 'classes');
    
    // Try to get the actual class data from window.currentStudentData
    // This should be set when viewStudent is called
    let studentClasses = [];
    if (window.currentStudentData && window.currentStudentData.classes) {
        studentClasses = window.currentStudentData.classes;
        console.log('Found student classes from window.currentStudentData:', studentClasses);
    }
    
    // Create student object with existing classes
    const studentWithClasses = {
        studentId: studentId,
        classes: studentClasses  // Pass the actual classes for pre-selection
    };
    
    // Clear any existing options first
    classSelect.innerHTML = '<option value="" disabled>Loading classes...</option>';
    
    // Call the load function
    if (typeof window.loadEditClassesWithMultiSelect === 'function') {
        console.log('✅ Calling loadEditClassesWithMultiSelect with classes:', studentClasses);
        window.loadEditClassesWithMultiSelect(studentWithClasses);
        return true;
    } else {
        console.error('❌ loadEditClassesWithMultiSelect not found');
        return false;
    }
}

// Add this function to debug student classes
function debugStudentClasses() {
    console.log('🔍 DEBUG: Student Classes');
    console.log('currentStudentData:', window.currentStudentData);
    
    if (window.currentStudentData && window.currentStudentData.classes) {
        console.log('Student classes array:', window.currentStudentData.classes);
        window.currentStudentData.classes.forEach((c, index) => {
            console.log(`Class ${index + 1}:`, {
                className: c.className,
                classId: c.classId,
                instructor: c.instructor,
                monthlyFee: c.monthlyFee
            });
        });
    } else {
        console.log('No classes found in currentStudentData');
    }
    
    // Also check what's in the form
    const classCount = document.getElementById('editClassCount')?.textContent;
    console.log('Class count from form:', classCount);
}

window.mapClassNameToSchema = mapClassNameToSchema;
window.mapDisplayToSchemaName = mapDisplayToSchemaName;
window.mapSchemaToDisplayName = mapSchemaToDisplayName;
window.handleAddStudent = handleAddStudent;
window.updateClassFee = updateClassFee;
window.removeClassRow = removeClassRow;
window.loadStudents = loadStudents;
window.searchStudents = searchStudents;
window.resetFilters = resetFilters;
window.viewStudent = viewStudent;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.saveMultiClassStudent = saveMultiClassStudent;
window.loadEditClassesWithMultiSelect = loadEditClassesWithMultiSelect;
window.updateEditSelectedClasses = updateEditSelectedClasses;
window.initializeEditModalClasses = initializeEditModalClasses;
window.manualLoadClasses = manualLoadClasses;
window.debugStudentClasses = debugStudentClasses;
