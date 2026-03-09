// ========== TEACHERS MANAGEMENT ==========

// Fetch all teachers - FIXED FOR YOUR API STRUCTURE
async function fetchTeachers() {
    try {
        console.log('Fetching teachers from:', `${API_BASE}/teachers`);
        const response = await fetch(`${API_BASE}/teachers`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Raw API response:', data);
        
        // YOUR API RETURNS { success: true, teachers: [...] }
        if (data.success && Array.isArray(data.teachers)) {
            console.log(`Fetched ${data.teachers.length} teachers from backend`);
            return data.teachers;
        } else {
            console.warn('Unexpected data format:', data);
            return [];
        }
    } catch (error) {
        console.error('Error fetching teachers:', error);
        showToast('Failed to fetch teachers from server', 'error');
        return [];
    }
}

// Load teachers master list - IMPROVED VERSION
async function loadTeachersMasterList() {
    console.log('loadTeachersMasterList() called');
    
    // Find or create the container
    let container = document.getElementById('teachersMasterList');
    
    // If container doesn't exist, create it
    if (!container) {
        console.warn('teachersMasterList container not found, creating it');
        const manageTeachers = document.getElementById('manageTeachers');
        if (manageTeachers) {
            container = document.createElement('div');
            container.id = 'teachersMasterList';
            container.style.cssText = `
                background: white; 
                padding: 20px; 
                border-radius: 10px; 
                margin-bottom: 30px;
                border: 1px solid #eee; 
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            `;
            manageTeachers.insertBefore(container, manageTeachers.firstChild);
        } else {
            console.error('manageTeachers container not found!');
            return;
        }
    }
    
    // Show loading state
    container.innerHTML = '<div style="text-align: center; padding: 20px;">Loading teachers...</div>';
    
    try {
        const teachers = await fetchTeachers();
        console.log('Teachers received in loadTeachersMasterList:', teachers);
        
        // Ensure teachers is an array
        const teachersArray = Array.isArray(teachers) ? teachers : [];
        
        if (teachersArray.length === 0) {
            container.innerHTML = `
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
        
        // Build the teachers grid
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #34495e; margin: 0;">
                    <i class="fas fa-users"></i> Master Teachers List (${teachersArray.length})
                </h3>
                <button class="btn btn-primary" onclick="showAddTeacherModal()" style="padding: 8px 15px;">
                    <i class="fas fa-plus"></i> Add New Teacher
                </button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
        `;
        
        teachersArray.forEach(teacher => {
            const teacherName = teacher.name || 'Unknown';
            const teacherClasses = teacher.classes && Array.isArray(teacher.classes) 
                ? teacher.classes.join(' • ') 
                : 'No classes assigned';
            
            html += `
                <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; border: 1px solid #e9ecef;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h4 style="margin: 0 0 8px; color: #2c3e50;">${escapeHtml(teacherName)}</h4>
                            <p style="margin: 0; color: #7f8c8d; font-size: 0.9em;">
                                <i class="fas fa-music"></i> 
                                ${escapeHtml(teacherClasses)}
                            </p>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button class="action-btn" style="background: #3498db;" 
                                    onclick="editTeacher('${teacher._id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" style="background: #e74c3c;" 
                                    onclick="deleteTeacher('${teacher._id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error in loadTeachersMasterList:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <i class="fas fa-exclamation-circle fa-2x" style="margin-bottom: 10px;"></i>
                <p>Error loading teachers. Please try again.</p>
                <button class="btn btn-primary" onclick="loadTeachersMasterList()" style="margin-top: 10px;">
                    <i class="fas fa-sync"></i> Retry
                </button>
            </div>
        `;
    }
}

// Show add teacher modal - FIXED VERSION
function showAddTeacherModal() {
    console.log('showAddTeacherModal called');
    
    const modal = document.getElementById('editTeacherModal');
    const teacherModalTitle = document.getElementById('teacherModalTitle');
    const teacherIdField = document.getElementById('teacherId');
    const teacherNameField = document.getElementById('teacherName');
    const teacherClassesField = document.getElementById('teacherClasses');
    
    if (!modal || !teacherModalTitle || !teacherIdField || !teacherNameField || !teacherClassesField) {
        console.error('Modal elements not found!');
        showToast('Teacher modal not found in HTML', 'error');
        return;
    }
    
    teacherModalTitle.textContent = 'Add New Teacher';
    teacherIdField.value = '';
    teacherNameField.value = '';
    teacherClassesField.value = '';
    modal.style.display = 'block';
}

// Edit teacher - FIXED VERSION
async function editTeacher(teacherId) {
    console.log('editTeacher called with teacherId:', teacherId);
    
    try {
        const response = await fetch(`${API_BASE}/teachers/${teacherId}`);
        console.log('Edit response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Edit teacher response data:', data);
        
        if (!data.success || !data.teacher) {
            console.error('Teacher data not found in response:', data);
            showToast('Teacher data not found', 'error');
            return;
        }
        
        const teacher = data.teacher;
        console.log('Teacher data extracted:', teacher);
        
        // Check if modal elements exist
        const teacherModalTitle = document.getElementById('teacherModalTitle');
        const teacherIdField = document.getElementById('teacherId');
        const teacherNameField = document.getElementById('teacherName');
        const teacherClassesField = document.getElementById('teacherClasses');
        const modal = document.getElementById('editTeacherModal');
        
        // Verify all elements exist
        if (!teacherModalTitle || !teacherIdField || !teacherNameField || !teacherClassesField || !modal) {
            console.error('Modal elements not found:', {
                teacherModalTitle: !!teacherModalTitle,
                teacherIdField: !!teacherIdField,
                teacherNameField: !!teacherNameField,
                teacherClassesField: !!teacherClassesField,
                modal: !!modal
            });
            showToast('Modal elements not found', 'error');
            return;
        }
        
        // Populate the modal
        teacherModalTitle.textContent = 'Edit Teacher';
        teacherIdField.value = teacher._id || teacher.id || '';
        teacherNameField.value = teacher.name || '';
        
        // Handle classes - could be array or comma-separated string
        let classesString = '';
        if (teacher.classes) {
            if (Array.isArray(teacher.classes)) {
                classesString = teacher.classes.join(', ');
            } else if (typeof teacher.classes === 'string') {
                classesString = teacher.classes;
            }
        }
        teacherClassesField.value = classesString;
        
        // Show the modal
        modal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error fetching teacher:', error);
        showToast('Error loading teacher details: ' + error.message, 'error');
    }
}

// Save teacher changes - FIXED VERSION
async function saveTeacherChanges() {
    console.log('saveTeacherChanges called');
    
    const teacherId = document.getElementById('teacherId')?.value;
    const name = document.getElementById('teacherName')?.value?.trim();
    const classesInput = document.getElementById('teacherClasses')?.value?.trim();
    
    if (!name) {
        showToast('Please enter teacher name', 'warning');
        return;
    }
    
    const classes = classesInput ? classesInput.split(',').map(c => c.trim()).filter(c => c) : [];
    const teacherData = { name, classes };
    
    try {
        let response;
        if (teacherId) {
            // Update existing teacher
            response = await fetch(`${API_BASE}/teachers/${teacherId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(teacherData)
            });
        } else {
            // Add new teacher
            response = await fetch(`${API_BASE}/teachers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(teacherData)
            });
        }
        
        if (!response.ok) throw new Error('Failed to save teacher');
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`Teacher ${teacherId ? 'updated' : 'added'} successfully`, 'success');
            closeEditTeacherModal();
            await loadTeachersMasterList();
            await loadClassConfigurations();
        } else {
            showToast(data.message || 'Failed to save teacher', 'error');
        }
    } catch (error) {
        console.error('Error saving teacher:', error);
        showToast('Error saving teacher', 'error');
    }
}

// Delete teacher - FIXED VERSION
async function deleteTeacher(teacherId) {
    console.log('deleteTeacher called with teacherId:', teacherId);
    
    if (!teacherId) {
        showToast('Invalid teacher ID', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/teachers/${teacherId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        console.log('Delete response:', data);
        
        if (data.success) {
            showToast('Teacher deleted successfully', 'success');
            await loadTeachersMasterList();
            await refreshClassDropdowns();
        } else {
            showToast(data.message || 'Failed to delete teacher', 'error');
        }
    } catch (error) {
        console.error('Error deleting teacher:', error);
        showToast('Error deleting teacher: ' + error.message, 'error');
    }
}

// Close edit teacher modal
function closeEditTeacherModal() {
    document.getElementById('editTeacherModal').style.display = 'none';
}

// ========== CLASS CONFIGURATION MANAGEMENT ==========

// Load class configurations - COMPLETE WORKING VERSION
async function loadClassConfigurations() {
    console.log('loadClassConfigurations() called');
    
    const tbody = document.getElementById('teachersTableBody');
    if (!tbody) {
        console.error('teachersTableBody not found!');
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading class configurations...</td></tr>';
    
    try {
        const response = await fetch(`${API_BASE}/class-configurations`);
        console.log('Class config response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Class config data:', data);
        
        // Get configurations from the response
        let configurations = [];
        if (data.success && Array.isArray(data.configurations)) {
            configurations = data.configurations;
        }
        
        console.log('Configurations extracted:', configurations);
        
        // Get current GST percentage
        const gstPercentage = await getGSTPercentage();
        console.log('GST Percentage:', gstPercentage);
        
        if (configurations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #7f8c8d;">
                        <i class="fas fa-info-circle fa-2x" style="margin-bottom: 10px;"></i>
                        <p>No class configurations found. Add your first class below.</p>
                    </td>
                </tr>
            `;
            
            // Update stats
            document.getElementById('totalClassesCount').textContent = '0';
            document.getElementById('activeClassesCount').textContent = '0';
            document.getElementById('avgFeeDisplay').textContent = '₹0';
            return;
        }
        
        let html = '';
        let totalClasses = 0;
        let activeClasses = 0;
        let totalFees = 0;
        
        configurations.forEach(config => {
            totalClasses++;
            if (config.active) activeClasses++;
            const baseFee = config.baseFee || 0;
            totalFees += baseFee;
            
            const gstAmount = (baseFee * gstPercentage / 100).toFixed(2);
            const totalFee = (baseFee + parseFloat(gstAmount)).toFixed(2);
            
            html += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;"><strong>${escapeHtml(config.className)}</strong></td>
                    <td style="padding: 12px;">${escapeHtml(config.teacherName)}</td>
                    <td style="padding: 12px; text-align: right;">₹${baseFee}</td>
                    <td style="padding: 12px; text-align: right; color: #e67e22;">₹${gstAmount}</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #27ae60;">₹${totalFee}</td>
                    <td style="padding: 12px; text-align: center;">
                        <span class="status-badge ${config.active ? 'status-active' : 'status-inactive'}">
                            ${config.active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <div style="display: flex; gap: 5px; justify-content: center;">
                            <button class="action-btn" style="background: #3498db;" onclick="editClassConfig('${config._id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" style="background: ${config.active ? '#e74c3c' : '#27ae60'};" 
                                    onclick="toggleClassStatus('${config._id}', ${config.active})" title="${config.active ? 'Deactivate' : 'Activate'}">
                                <i class="fas ${config.active ? 'fa-ban' : 'fa-check'}"></i>
                            </button>
                            <button class="action-btn" style="background: #f39c12;" onclick="updateAllStudentsInClass('${escapeHtml(config.className)}', ${baseFee})" 
                                    title="Update all students in this class">
                                <i class="fas fa-users-cog"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
        // Update stats
        document.getElementById('totalClassesCount').textContent = totalClasses;
        document.getElementById('activeClassesCount').textContent = activeClasses;
        document.getElementById('avgFeeDisplay').textContent = `₹${(totalFees / totalClasses).toFixed(2)}`;
        
        console.log('Class table updated with', configurations.length, 'configurations');
        
    } catch (error) {
        console.error('Error loading class configs:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #e74c3c;">
                    <i class="fas fa-exclamation-circle fa-2x" style="margin-bottom: 10px;"></i>
                    <p>Error loading configurations: ${error.message}</p>
                    <button class="btn btn-primary" onclick="loadClassConfigurations()" style="margin-top: 10px;">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </td>
            </tr>
        `;
        showToast('Failed to load class configurations', 'error');
    }
}

// Add new class configuration
async function addNewClassConfig() {
    console.log('addNewClassConfig called');
    
    const className = document.getElementById('newClassName')?.value.trim();
    const teacherName = document.getElementById('newTeacherName')?.value.trim();
    const baseFee = document.getElementById('newBaseFee')?.value;
    
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
                active: true
            })
        });
        
        const data = await response.json();
        console.log('Add class response:', data);
        
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

// Edit class configuration
async function editClassConfig(configId) {
    console.log('editClassConfig called with ID:', configId);
    
    if (!configId) {
        showToast('Invalid class ID', 'error');
        return;
    }
    
    try {
        showToast('Loading class details...', 'info');
        
        const response = await fetch(`${API_BASE}/class-configurations/${configId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Edit class response:', data);
        
        if (data.success) {
            const config = data.config || data.data || data;
            
            // Populate modal
            document.getElementById('editConfigId').value = config._id || '';
            document.getElementById('editClassName').value = config.className || '';
            document.getElementById('editTeacherName').value = config.teacherName || '';
            document.getElementById('editBaseFee').value = config.baseFee || 0;
            document.getElementById('editActive').checked = config.active !== false;
            
            // Update preview
            await updateEditPreview();
            
            // Show modal with flex for centering
            const modal = document.getElementById('editClassModal');
            modal.style.display = 'flex';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            
        } else {
            showToast(data.message || 'Failed to load class details', 'error');
        }
    } catch (error) {
        console.error('Error fetching class config:', error);
        showToast('Failed to load class details: ' + error.message, 'error');
    }
}

// Show add class modal (opens the quick add form)
function showAddClassModal() {
    console.log('showAddClassModal called');
    
    // Find the details element and open it
    const details = document.querySelector('details');
    if (details) {
        details.open = true;
        // Scroll to the form smoothly
        details.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Focus on the first input
        setTimeout(() => {
            document.getElementById('newClassName')?.focus();
        }, 300);
    } else {
        console.warn('Details element not found');
    }
}

// Update edit preview
async function updateEditPreview() {
    const baseFee = parseFloat(document.getElementById('editBaseFee')?.value) || 0;
    const gstPercentage = await getGSTPercentage();
    const { gstAmount, totalAmount } = calculateWithGST(baseFee, gstPercentage);
    
    document.getElementById('previewBaseFee').textContent = `₹${baseFee.toFixed(2)}`;
    document.getElementById('previewGST').textContent = `₹${gstAmount.toFixed(2)}`;
    document.getElementById('previewTotal').textContent = `₹${totalAmount.toFixed(2)}`;
}

// Save class configuration changes
async function saveClassConfigChanges() {
    const configId = document.getElementById('editConfigId').value;
    const className = document.getElementById('editClassName').value.trim();
    const teacherName = document.getElementById('editTeacherName').value.trim();
    const baseFee = document.getElementById('editBaseFee').value;
    const active = document.getElementById('editActive').checked;
    
    if (!className || !teacherName || !baseFee) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/class-configurations/${configId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ className, teacherName, baseFee, active })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('✅ Class configuration updated');
            closeEditClassModal();
            await loadClassConfigurations();
            await refreshClassDropdowns();
        } else {
            showToast(data.message || 'Failed to update', 'error');
        }
    } catch (error) {
        console.error('Error updating class config:', error);
        showToast('Failed to update class configuration', 'error');
    }
}

// Close edit class modal
function closeEditClassModal() {
    console.log('closeEditClassModal called');
    const modal = document.getElementById('editClassModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Toggle class status
async function toggleClassStatus(configId, currentStatus) {
    console.log('toggleClassStatus called:', configId, currentStatus);
    
    const action = currentStatus ? 'deactivate' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} this class?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/class-configurations/${configId}/toggle`, {
            method: 'PATCH'
        });
        
        const data = await response.json();
        console.log('Toggle response:', data);
        
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

// Update all students in a class
async function updateAllStudentsInClass(className, newFee) {
    console.log('updateAllStudentsInClass called:', className, newFee);
    
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
                newFee: parseInt(newFee)
            })
        });
        
        const data = await response.json();
        console.log('Bulk update response:', data);
        
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

// Filter class table
function filterClassTable() {
    console.log('filterClassTable called');
    
    const searchTerm = document.getElementById('classSearchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('classStatusFilter')?.value || 'all';
    const rows = document.querySelectorAll('#teachersTableBody tr');
    
    rows.forEach(row => {
        // Skip the "no data" or loading rows
        if (row.cells.length === 1 && row.cells[0].colSpan === 7) return;
        
        let show = true;
        
        if (searchTerm) {
            const className = row.cells[0]?.textContent.toLowerCase() || '';
            const teacherName = row.cells[1]?.textContent.toLowerCase() || '';
            if (!className.includes(searchTerm) && !teacherName.includes(searchTerm)) {
                show = false;
            }
        }
        
        if (statusFilter !== 'all' && show) {
            const statusCell = row.cells[5]?.textContent.toLowerCase().trim() || '';
            const isActive = statusCell.includes('active');
            if ((statusFilter === 'active' && !isActive) || (statusFilter === 'inactive' && isActive)) {
                show = false;
            }
        }
        
        row.style.display = show ? '' : 'none';
    });
}

// Refresh class configurations
function refreshClassConfigs() {
    console.log('refreshClassConfigs called');
    loadClassConfigurations();
    showToast('Refreshing class list...', 'info');
}

// ========== GST SETTINGS ==========

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
            await loadClassConfigurations(); // Refresh class table
        } else {
            showToast(data.message || 'Failed to save GST settings', 'error');
        }
    } catch (error) {
        console.error('Error saving GST settings:', error);
        showToast('Failed to save GST settings', 'error');
    }
}

// ========== REFRESH DROPDOWNS ==========

async function refreshClassDropdowns() {
    // Refresh class configuration dropdowns
    const classRows = document.querySelectorAll('#classesList .class-row, #editClassesList .edit-class-row');
    for (const row of classRows) {
        const teacherSelect = row.querySelector('.instructor, .editInstructor');
        if (teacherSelect) {
            await populateTeacherDropdown(teacherSelect);
        }
    }
}

async function populateTeacherDropdown(selectElement) {
    if (!selectElement) return;
    
    const teachers = await fetchTeachers();
    const currentValue = selectElement.value;
    
    selectElement.innerHTML = '<option value="">Select Teacher</option>';
    teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.name;
        option.textContent = teacher.name;
        if (teacher.name === currentValue) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

// Make teacher functions globally available
window.fetchTeachers = fetchTeachers;
window.loadTeachersMasterList = loadTeachersMasterList;
window.showAddTeacherModal = showAddTeacherModal;
window.editTeacher = editTeacher;
window.saveTeacherChanges = saveTeacherChanges;
window.deleteTeacher = deleteTeacher;
window.loadClassConfigurations = loadClassConfigurations;
window.addNewClassConfig = addNewClassConfig;
window.editClassConfig = editClassConfig;
window.saveClassConfigChanges = saveClassConfigChanges;
window.toggleClassStatus = toggleClassStatus;
window.updateAllStudentsInClass = updateAllStudentsInClass;
window.filterClassTable = filterClassTable;
window.refreshClassConfigs = refreshClassConfigs;
window.loadGSTSettings = loadGSTSettings;
window.saveGSTSettings = saveGSTSettings;
window.updateEditPreview = updateEditPreview;
window.showAddClassModal = showAddClassModal;
window.closeEditClassModal = closeEditClassModal;