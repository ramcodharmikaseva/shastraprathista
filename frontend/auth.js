// ===== auth.js =====

// ✅ FIXED: Use dynamic base URL
const API_BASE = `${window.location.origin}/api/auth`;

// --- SIGNUP FUNCTION ---
async function handleSignup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  const phone = document.getElementById('signupPhone')?.value.trim() || "";

  if (!name || !email || !password || !phone) {
    alert("Please fill in all fields (name, email, password, phone).");
    return;
  }

  if (!/^\d{10}$/.test(phone)) {
    alert("Please enter a valid 10-digit phone number.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone })
    });

    const data = await res.json();
    if (res.ok) {
      alert("Signup successful! Please log in.");
      window.location.href = "login.html";
    } else {
      alert(data.message || "Signup failed. Try again.");
    }
  } catch (err) {
    console.error("Signup error:", err);
    alert("Error connecting to the server.");
  }
}

// --- LOGIN FUNCTION ---
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("currentUser", JSON.stringify(data.user));

      alert("Login successful!");

      if (data.user.role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "all_book_grid.html";
      }
    } else {
      alert(data.message || "Login failed. Please try again.");
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Error connecting to the server.");
  }
}

// --- LOGOUT FUNCTION ---
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("user");
  alert("Logged out successfully.");
  window.location.href = "login.html";
}

// --- AUTO LOGIN DISPLAY ---
window.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("currentUser") || localStorage.getItem("user") || "null");
  
  if (user) {
    const welcomeText = document.getElementById("welcome-text");
    if (welcomeText) welcomeText.textContent = `Welcome, ${user.name}`;
    
    const authLink = document.getElementById("auth-link");
    if (authLink) {
      authLink.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
      authLink.href = "#";
      authLink.onclick = logout;
    }
  }
});

// --- PASSWORD RESET FUNCTION ---
async function resetPassword() {
  const email = document.getElementById("resetEmail").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();

  if (!email || !newPassword) {
    alert("Please fill in all fields");
    return;
  }

  if (newPassword.length < 6) {
    alert("Password must be at least 6 characters long");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, newPassword })
    });

    const data = await res.json();

    if (data.success) {
      alert("Password reset successfully! You can now login with your new password.");
      window.location.href = "login.html";
    } else {
      alert(data.message || "Failed to reset password");
    }
  } catch (err) {
    console.error("Reset error:", err);
    alert("Network error. Please try again.");
  }
}

// --- CHANGE PASSWORD FUNCTION (FOR LOGGED-IN USERS) ---
async function changePassword(currentPassword, newPassword) {
  const token = localStorage.getItem("token");
  
  if (!token) {
    alert("Please login to change password");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/change-password`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Change password error:", err);
    throw err;
  }
}

// --- CHECK AUTH STATUS ---
function checkAuth() {
  const token = localStorage.getItem("token");
  const currentUser = localStorage.getItem("currentUser");
  
  if (!token || !currentUser) {
    if (window.location.pathname.includes('profile.html') || 
        window.location.pathname.includes('admin.html')) {
      window.location.href = 'login.html';
    }
    return null;
  }
  
  try {
    return JSON.parse(currentUser);
  } catch (e) {
    console.error('Error parsing user data:', e);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    return null;
  }
}

// --- UPDATE USER SESSION (USE THIS IN ALL PAGES) ---
function updateUserSession() {
  const user = JSON.parse(localStorage.getItem("currentUser") || localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");
  const welcomeText = document.getElementById("welcome-text");
  const authLink = document.getElementById("auth-link");

  if (token && user) {
    if (welcomeText) welcomeText.textContent = `Welcome, ${user.name}`;
    if (authLink) {
      authLink.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
      authLink.href = "#";
      authLink.onclick = logout;
    }
  } else {
    if (welcomeText) welcomeText.textContent = 'Welcome, Guest';
    if (authLink) {
      authLink.innerHTML = '<i class="fas fa-user"></i> Sign In';
      authLink.href = "login.html";
      authLink.onclick = null;
    }
  }
}

// ✅ EXPORT FUNCTIONS FOR GLOBAL USE
window.handleSignup = handleSignup;
window.handleLogin = handleLogin;
window.logout = logout;
window.resetPassword = resetPassword;
window.changePassword = changePassword;
window.checkAuth = checkAuth;
window.updateUserSession = updateUserSession;