console.log('⚙️ Admin settings loading...');

// admin-settings.js - Settings management for admin dashboard

// Settings data structure
let settingsData = {
  general: {
    storeName: "Smt Lingammal Ramaraju Shastrapratista Trust",
    storeEmail: "shastraprathista@gmail.com",
    storePhone: "88704 12345",
    storeAddress: "No.1, Gandhi Kalaimandram, Rajapalayam - 626117, Tamil Nadu",
    currency: "INR",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    autoConfirm: true,
    lowStockThreshold: 10
  },
  shipping: {
    domesticEnabled: true,
    domesticCost: 50,
    domesticFreeThreshold: 500,
    domesticDeliveryDays: 7,
    internationalEnabled: false,
    internationalCost: 500,
    internationalDeliveryDays: 21,
    shippingRegions: ["south"]
  },
  invoices: {
    invoicePrefix: "INV",
    invoiceStartingNumber: 1001,
    invoiceTerms: "due_on_receipt",
    invoiceNotes: "Books HSN - 4901 (GST Exempt as per Indian Law)",
    invoiceFooter: "This is a computer-generated invoice; no signature required.",
    invoicePrimaryColor: "#2c3e50",
    pdfOptions: ["logo"]
  },
  notifications: {
    emailNewOrders: true,
    emailLowStock: true,
    emailDailyReport: false,
    notificationSound: "default",
    desktopNotifications: true
  }
};

// ✅ Load settings section
function loadSettingsSection() {
  console.log('⚙️ Loading settings section...');
  loadSettingsData();
  renderAdminUsersTable();
}

// ✅ FIXED: Load settings data into form with null checks
function loadSettingsData() {
  try {
    // Load from localStorage or use defaults
    const savedSettings = localStorage.getItem('adminSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        settingsData = { ...settingsData, ...parsed };
      } catch (e) {
        console.warn('Could not parse saved settings, using defaults', e);
      }
    }

    // General Settings - WITH NULL CHECKS
    safeSetValue('storeName', settingsData.general.storeName);
    safeSetValue('storeEmail', settingsData.general.storeEmail);
    safeSetValue('storePhone', settingsData.general.storePhone);
    safeSetValue('storeAddress', settingsData.general.storeAddress);
    safeSetValue('currency', settingsData.general.currency);
    safeSetValue('timezone', settingsData.general.timezone);
    safeSetValue('dateFormat', settingsData.general.dateFormat);
    safeSetChecked('autoConfirm', settingsData.general.autoConfirm);
    safeSetValue('lowStockThreshold', settingsData.general.lowStockThreshold);

    // Shipping Settings - WITH NULL CHECKS
    safeSetChecked('domesticEnabled', settingsData.shipping.domesticEnabled);
    safeSetValue('domesticCost', settingsData.shipping.domesticCost);
    safeSetValue('domesticFreeThreshold', settingsData.shipping.domesticFreeThreshold);
    safeSetValue('domesticDeliveryDays', settingsData.shipping.domesticDeliveryDays);
    safeSetChecked('internationalEnabled', settingsData.shipping.internationalEnabled);
    safeSetValue('internationalCost', settingsData.shipping.internationalCost);
    safeSetValue('internationalDeliveryDays', settingsData.shipping.internationalDeliveryDays);
    
    // Set shipping regions - WITH NULL CHECK
    const regionCheckboxes = document.querySelectorAll('input[name="shippingRegions"]');
    if (regionCheckboxes.length > 0) {
      regionCheckboxes.forEach(checkbox => {
        checkbox.checked = settingsData.shipping.shippingRegions.includes(checkbox.value);
      });
    }

    // Invoice Settings - WITH NULL CHECKS
    safeSetValue('invoicePrefix', settingsData.invoices.invoicePrefix);
    safeSetValue('invoiceStartingNumber', settingsData.invoices.invoiceStartingNumber);
    safeSetValue('invoiceTerms', settingsData.invoices.invoiceTerms);
    safeSetValue('invoiceNotes', settingsData.invoices.invoiceNotes);
    safeSetValue('invoiceFooter', settingsData.invoices.invoiceFooter);
    safeSetValue('invoicePrimaryColor', settingsData.invoices.invoicePrimaryColor);
    
    // Set PDF options - WITH NULL CHECK
    const pdfCheckboxes = document.querySelectorAll('input[name="pdfOptions"]');
    if (pdfCheckboxes.length > 0) {
      pdfCheckboxes.forEach(checkbox => {
        checkbox.checked = settingsData.invoices.pdfOptions.includes(checkbox.value);
      });
    }

    // Notification Settings - WITH NULL CHECKS
    safeSetChecked('emailNewOrders', settingsData.notifications.emailNewOrders);
    safeSetChecked('emailLowStock', settingsData.notifications.emailLowStock);
    safeSetChecked('emailDailyReport', settingsData.notifications.emailDailyReport);
    safeSetValue('notificationSound', settingsData.notifications.notificationSound);
    safeSetChecked('desktopNotifications', settingsData.notifications.desktopNotifications);

    console.log('✅ Settings data loaded successfully');

  } catch (error) {
    console.error('❌ Error loading settings:', error);
    showToast('Failed to load settings', 'error');
  }
}

// ✅ Safe helper functions to prevent null errors
function safeSetValue(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.value = value;
  }
}

function safeSetChecked(elementId, checked) {
  const element = document.getElementById(elementId);
  if (element) {
    element.checked = checked;
  }
}

function safeGetValue(elementId, defaultValue = '') {
  const element = document.getElementById(elementId);
  return element ? element.value : defaultValue;
}

function safeGetChecked(elementId, defaultValue = false) {
  const element = document.getElementById(elementId);
  return element ? element.checked : defaultValue;
}

// ✅ Save all settings
function saveAllSettings() {
  try {
    // Validate settings before saving
    if (!validateSettings()) {
      return;
    }

    // General Settings
    settingsData.general = {
      storeName: safeGetValue('storeName', settingsData.general.storeName),
      storeEmail: safeGetValue('storeEmail', settingsData.general.storeEmail),
      storePhone: safeGetValue('storePhone', settingsData.general.storePhone),
      storeAddress: safeGetValue('storeAddress', settingsData.general.storeAddress),
      currency: safeGetValue('currency', settingsData.general.currency),
      timezone: safeGetValue('timezone', settingsData.general.timezone),
      dateFormat: safeGetValue('dateFormat', settingsData.general.dateFormat),
      autoConfirm: safeGetChecked('autoConfirm', settingsData.general.autoConfirm),
      lowStockThreshold: parseInt(safeGetValue('lowStockThreshold', settingsData.general.lowStockThreshold))
    };

    // Shipping Settings
    settingsData.shipping = {
      domesticEnabled: safeGetChecked('domesticEnabled', settingsData.shipping.domesticEnabled),
      domesticCost: parseFloat(safeGetValue('domesticCost', settingsData.shipping.domesticCost)),
      domesticFreeThreshold: parseFloat(safeGetValue('domesticFreeThreshold', settingsData.shipping.domesticFreeThreshold)),
      domesticDeliveryDays: parseInt(safeGetValue('domesticDeliveryDays', settingsData.shipping.domesticDeliveryDays)),
      internationalEnabled: safeGetChecked('internationalEnabled', settingsData.shipping.internationalEnabled),
      internationalCost: parseFloat(safeGetValue('internationalCost', settingsData.shipping.internationalCost)),
      internationalDeliveryDays: parseInt(safeGetValue('internationalDeliveryDays', settingsData.shipping.internationalDeliveryDays)),
      shippingRegions: Array.from(document.querySelectorAll('input[name="shippingRegions"]:checked')).map(cb => cb.value)
    };

    // Invoice Settings
    settingsData.invoices = {
      invoicePrefix: safeGetValue('invoicePrefix', settingsData.invoices.invoicePrefix),
      invoiceStartingNumber: parseInt(safeGetValue('invoiceStartingNumber', settingsData.invoices.invoiceStartingNumber)),
      invoiceTerms: safeGetValue('invoiceTerms', settingsData.invoices.invoiceTerms),
      invoiceNotes: safeGetValue('invoiceNotes', settingsData.invoices.invoiceNotes),
      invoiceFooter: safeGetValue('invoiceFooter', settingsData.invoices.invoiceFooter),
      invoicePrimaryColor: safeGetValue('invoicePrimaryColor', settingsData.invoices.invoicePrimaryColor),
      pdfOptions: Array.from(document.querySelectorAll('input[name="pdfOptions"]:checked')).map(cb => cb.value)
    };

    // Notification Settings
    settingsData.notifications = {
      emailNewOrders: safeGetChecked('emailNewOrders', settingsData.notifications.emailNewOrders),
      emailLowStock: safeGetChecked('emailLowStock', settingsData.notifications.emailLowStock),
      emailDailyReport: safeGetChecked('emailDailyReport', settingsData.notifications.emailDailyReport),
      notificationSound: safeGetValue('notificationSound', settingsData.notifications.notificationSound),
      desktopNotifications: safeGetChecked('desktopNotifications', settingsData.notifications.desktopNotifications)
    };

    // Save to localStorage
    localStorage.setItem('adminSettings', JSON.stringify(settingsData));

    // Also save to backend (if available)
    saveSettingsToBackend();

    showToast('Settings saved successfully!', 'success');
    console.log('✅ Settings saved:', settingsData);

  } catch (error) {
    console.error('❌ Error saving settings:', error);
    showToast('Failed to save settings', 'error');
  }
}

// ✅ Save settings to backend
async function saveSettingsToBackend() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/admin/settings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settingsData)
    });

    if (response.ok) {
      console.log('✅ Settings saved to backend');
    }
  } catch (error) {
    console.log('⚠️ Settings saved locally (backend unavailable)');
  }
}

// ✅ Reset settings to defaults
function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
    localStorage.removeItem('adminSettings');
    settingsData = getDefaultSettings();
    loadSettingsData();
    showToast('Settings reset to defaults', 'success');
  }
}

// ✅ Get default settings
function getDefaultSettings() {
  return {
    general: {
      storeName: "Smt Lingammal Ramaraju Shastrapratista Trust",
      storeEmail: "shastraprathista@gmail.com",
      storePhone: "88704 12345",
      storeAddress: "No.1, Gandhi Kalaimandram, Rajapalayam - 626117, Tamil Nadu",
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
      autoConfirm: true,
      lowStockThreshold: 10
    },
    shipping: {
      domesticEnabled: true,
      domesticCost: 50,
      domesticFreeThreshold: 500,
      domesticDeliveryDays: 7,
      internationalEnabled: false,
      internationalCost: 500,
      internationalDeliveryDays: 21,
      shippingRegions: ["south"]
    },
    invoices: {
      invoicePrefix: "INV",
      invoiceStartingNumber: 1001,
      invoiceTerms: "due_on_receipt",
      invoiceNotes: "Books HSN - 4901 (GST Exempt as per Indian Law)",
      invoiceFooter: "This is a computer-generated invoice; no signature required.",
      invoicePrimaryColor: "#2c3e50",
      pdfOptions: ["logo"]
    },
    notifications: {
      emailNewOrders: true,
      emailLowStock: true,
      emailDailyReport: false,
      notificationSound: "default",
      desktopNotifications: true
    }
  };
}

// ✅ Render admin users table
function renderAdminUsersTable() {
  const tbody = document.getElementById('adminUsersBody');
  if (!tbody) return;
  
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  // Mock admin users data - in real app, fetch from backend
  const adminUsers = [
    {
      id: 1,
      name: currentUser.name || 'Admin User',
      email: currentUser.email || 'admin@shastraprathista.com',
      role: 'Super Admin',
      lastLogin: new Date().toLocaleDateString(),
      status: 'active'
    },
    {
      id: 2,
      name: 'Manager User',
      email: 'manager@shastraprathista.com',
      role: 'Manager',
      lastLogin: '2024-01-15',
      status: 'active'
    }
  ];

  tbody.innerHTML = adminUsers.map(user => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="customer-avatar">${user.name.charAt(0)}</div>
          <div>
            <strong>${user.name}</strong>
            ${user.id === 1 ? '<br><small class="text-muted">(You)</small>' : ''}
          </div>
        </div>
      </td>
      <td>${user.email}</td>
      <td>
        <span class="status-badge ${user.role === 'Super Admin' ? 'status-delivered' : 'status-processing'}">
          ${user.role}
        </span>
      </td>
      <td>${user.lastLogin}</td>
      <td>
        <span class="status-badge ${user.status === 'active' ? 'status-delivered' : 'status-cancelled'}">
          ${user.status}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 5px;">
          <button class="btn btn-sm btn-outline" onclick="editAdminUser(${user.id})" ${user.id === 1 ? 'disabled' : ''}>
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline" onclick="resetAdminPassword(${user.id})">
            <i class="fas fa-key"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteAdminUser(${user.id})" ${user.id === 1 ? 'disabled' : ''}>
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ✅ Enhanced settings functions
function showAdminSettings() {
  showSection('settings');
  openSettingsTab('admins');
}

function showShippingSettings() {
  showSection('settings');
  openSettingsTab('shipping');
}

function showInvoiceSettings() {
  showSection('settings');
  openSettingsTab('invoices');
}

// ✅ Show add admin modal
function showAddAdminModal() {
  const modalHtml = `
    <div class="modal-header">
      <h3><i class="fas fa-user-plus"></i> Add Admin User</h3>
      <span class="close" onclick="closeModal()">&times;</span>
    </div>
    <div class="modal-body">
      <form id="addAdminForm" onsubmit="addAdminUser(event)">
        <div class="form-group">
          <label for="newAdminName">Full Name *</label>
          <input type="text" id="newAdminName" class="form-input" required>
        </div>
        <div class="form-group">
          <label for="newAdminEmail">Email Address *</label>
          <input type="email" id="newAdminEmail" class="form-input" required>
        </div>
        <div class="form-group">
          <label for="newAdminRole">Role *</label>
          <select id="newAdminRole" class="form-select" required>
            <option value="Manager">Manager</option>
            <option value="Editor">Editor</option>
            <option value="Viewer">Viewer</option>
          </select>
        </div>
        <div class="form-group">
          <label for="newAdminPassword">Temporary Password *</label>
          <input type="password" id="newAdminPassword" class="form-input" required minlength="6">
          <small>User will be prompted to change password on first login</small>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-success">Create Admin User</button>
        </div>
      </form>
    </div>
  `;
  
  showCustomModal(modalHtml);
}

// ✅ Add admin user
function addAdminUser(event) {
  event.preventDefault();
  
  const newAdmin = {
    id: Date.now(), // In real app, this would come from backend
    name: document.getElementById('newAdminName').value,
    email: document.getElementById('newAdminEmail').value,
    role: document.getElementById('newAdminRole').value,
    status: 'active',
    lastLogin: 'Never',
    createdAt: new Date().toISOString()
  };

  // In a real application, you would send this to your backend
  console.log('Adding admin user:', newAdmin);
  
  // Show success message
  showToast(`Admin user ${newAdmin.name} created successfully!`, 'success');
  closeModal();
  
  // Refresh the admin users table
  setTimeout(() => {
    renderAdminUsersTable();
  }, 1000);
}

// ✅ Edit admin user
function editAdminUser(userId) {
  // Mock user data - in real app, fetch from backend
  const user = {
    id: userId,
    name: 'Manager User',
    email: 'manager@shastraprathista.com',
    role: 'Manager',
    status: 'active'
  };

  const modalHtml = `
    <div class="modal-header">
      <h3><i class="fas fa-edit"></i> Edit Admin User</h3>
      <span class="close" onclick="closeModal()">&times;</span>
    </div>
    <div class="modal-body">
      <form id="editAdminForm" onsubmit="updateAdminUser(event, ${userId})">
        <div class="form-group">
          <label for="editAdminName">Full Name *</label>
          <input type="text" id="editAdminName" class="form-input" value="${user.name}" required>
        </div>
        <div class="form-group">
          <label for="editAdminEmail">Email Address *</label>
          <input type="email" id="editAdminEmail" class="form-input" value="${user.email}" required>
        </div>
        <div class="form-group">
          <label for="editAdminRole">Role *</label>
          <select id="editAdminRole" class="form-select" required>
            <option value="Manager" ${user.role === 'Manager' ? 'selected' : ''}>Manager</option>
            <option value="Editor" ${user.role === 'Editor' ? 'selected' : ''}>Editor</option>
            <option value="Viewer" ${user.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
          </select>
        </div>
        <div class="form-group">
          <label for="editAdminStatus">Status</label>
          <select id="editAdminStatus" class="form-select">
            <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-success">Update User</button>
        </div>
      </form>
    </div>
  `;
  
  showCustomModal(modalHtml);
}

// ✅ Update admin user
function updateAdminUser(event, userId) {
  event.preventDefault();
  
  const updatedUser = {
    name: document.getElementById('editAdminName').value,
    email: document.getElementById('editAdminEmail').value,
    role: document.getElementById('editAdminRole').value,
    status: document.getElementById('editAdminStatus').value
  };

  console.log('Updating admin user:', userId, updatedUser);
  showToast(`Admin user ${updatedUser.name} updated successfully!`, 'success');
  closeModal();
  
  setTimeout(() => {
    renderAdminUsersTable();
  }, 1000);
}

// ✅ Reset admin password
function resetAdminPassword(userId) {
  if (confirm('Are you sure you want to reset this user\'s password? They will receive an email with instructions to set a new password.')) {
    // In real app, call backend API to reset password
    showToast('Password reset email sent successfully!', 'success');
    console.log('Password reset for user:', userId);
  }
}

// ✅ Delete admin user
function deleteAdminUser(userId) {
  if (confirm('Are you sure you want to delete this admin user? This action cannot be undone.')) {
    // In real app, call backend API to delete user
    showToast('Admin user deleted successfully!', 'success');
    console.log('Deleting admin user:', userId);
    
    setTimeout(() => {
      renderAdminUsersTable();
    }, 1000);
  }
}

// ✅ Show custom modal (SAFE & CLEAN)
function showCustomModal(content) {
  let modal = document.getElementById('customModal');

  // Create modal if it doesn't exist
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'customModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content medium">
        <div id="customModalContent"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Inject content
  const contentContainer = document.getElementById('customModalContent');
  if (contentContainer) {
    contentContainer.innerHTML = content;
  }

  modal.style.display = 'block';

  // ✅ Remove previous handler (if any) to avoid duplicates
  modal._outsideClickHandler && 
    document.removeEventListener('click', modal._outsideClickHandler);

  // ✅ Click-outside handler (scoped & safe)
  modal._outsideClickHandler = function (event) {
    if (event.target === modal) {
      closeModal();
    }
  };

  document.addEventListener('click', modal._outsideClickHandler);
}

// ✅ Close modal safely
function closeModal() {
  const modal = document.getElementById('customModal');
  if (!modal) return;

  modal.style.display = 'none';

  // Remove outside click listener
  if (modal._outsideClickHandler) {
    document.removeEventListener('click', modal._outsideClickHandler);
    modal._outsideClickHandler = null;
  }
}

// ✅ Validate settings before saving
function validateSettings() {
  const general = settingsData.general;
  
  if (!general.storeName || !general.storeEmail || !general.storePhone) {
    showToast('Please fill in all required store information', 'error');
    return false;
  }
  
  if (!isValidEmail(general.storeEmail)) {
    showToast('Please enter a valid email address', 'error');
    return false;
  }
  
  return true;
}

// ✅ Email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ✅ Chart update function
function updateRevenueChart(period) {
    console.log('📊 Updating revenue chart for period:', period);
    showToast(`Revenue chart updated for ${period}`, 'info');
    // Add actual chart update logic here
}

// ✅ Shipping regions function
function editShippingRegions() {
    showToast('Shipping regions editing feature coming soon!', 'info');
}

// ✅ Initialize settings system
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on settings page and load data
  if (window.location.hash === '#settings' || document.getElementById('settings')?.classList.contains('active')) {
    loadSettingsSection();
  }
});

// ✅ Make all settings functions globally available
window.loadSettingsSection = loadSettingsSection;
window.loadSettingsData = loadSettingsData;
window.saveAllSettings = saveAllSettings;
window.saveSettingsToBackend = saveSettingsToBackend;
window.resetSettings = resetSettings;
window.getDefaultSettings = getDefaultSettings;
window.renderAdminUsersTable = renderAdminUsersTable;
window.showAdminSettings = showAdminSettings;
window.showShippingSettings = showShippingSettings;
window.showInvoiceSettings = showInvoiceSettings;
window.showAddAdminModal = showAddAdminModal;
window.addAdminUser = addAdminUser;
window.editAdminUser = editAdminUser;
window.updateAdminUser = updateAdminUser;
window.resetAdminPassword = resetAdminPassword;
window.deleteAdminUser = deleteAdminUser;
window.showCustomModal = showCustomModal;
window.closeModal = closeModal;
window.validateSettings = validateSettings;
window.isValidEmail = isValidEmail;
window.updateRevenueChart = updateRevenueChart;
window.editShippingRegions = editShippingRegions;


console.log('✅ Admin settings module loaded');