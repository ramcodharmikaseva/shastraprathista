// frontend/js/music-admin-auth.js
// Role-based authentication for Music School Admin

const MUSIC_ADMIN_ROLES = ['admin', 'super_admin', 'music-admin']; // ✅ Your allowed roles

// Main auth check function
function checkMusicAdminAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    console.log('🔐 Music Admin Auth Check:', { 
        hasToken: !!token, 
        userRole: user.role,
        userEmail: user.email 
    });

    // Check if token exists
    if (!token) {
        alert("Session expired. Please log in again.");
        window.location.href = "login.html";
        return false;
    }

    // Check if user has allowed role
    if (!MUSIC_ADMIN_ROLES.includes(user.role)) {
        alert("Access denied! Only Admin, Super Admin, and Music Admin can access this page.");
        window.location.href = "index.html"; // Redirect to normal user page
        return false;
    }

    // Update UI to show user info
    updateUserInfo(user);
    updateAdminName(user); // Also update the header name
    
    return true;
}

// Update user info display in header
function updateAdminName(user) {
    const adminNameSpan = document.getElementById('adminName');
    if (adminNameSpan) {
        adminNameSpan.textContent = user.name || user.email || 'Admin User';
    }
}

// Update user info in any additional displays
function updateUserInfo(user) {
    // Add user info to the admin page (optional)
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        userDisplay.innerHTML = `
            <span class="user-name">${user.name || user.email}</span>
            <span class="user-role">(${user.role})</span>
        `;
    }

    // Show/hide elements based on role
    const role = user.role;
    
    // Only super_admin can access certain features
    const superAdminElements = document.querySelectorAll('.super-admin-only');
    superAdminElements.forEach(el => {
        el.style.display = role === 'super_admin' ? 'block' : 'none';
    });

    // Both super_admin and admin can access admin features
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        el.style.display = ['super_admin', 'admin'].includes(role) ? 'block' : 'none';
    });

    // All allowed roles can access music-admin features
    const musicAdminElements = document.querySelectorAll('.music-admin-only');
    musicAdminElements.forEach(el => {
        el.style.display = MUSIC_ADMIN_ROLES.includes(role) ? 'block' : 'none';
    });
}

// Main logout function (combines both your logout functions)
function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all auth data
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user');
        
        // Clear any music school specific data
        localStorage.removeItem('musicAdminLastView');
        localStorage.removeItem('selectedFinancialYear');
        
        // Redirect to login page
        window.location.href = 'login.html';
    }
}

// Silent logout (without confirmation)
function forceLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Auto logout after 30 minutes of inactivity (optional)
let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert('Session expired due to inactivity. Please login again.');
        forceLogout();
    }, 30 * 60 * 1000); // 30 minutes
}

// Export for global access
window.checkMusicAdminAuth = checkMusicAdminAuth;
window.logoutUser = logoutUser;
window.forceLogout = forceLogout;

// Note: Don't put DOMContentLoaded here - it should be in your HTML
// This file only defines functions, doesn't execute them