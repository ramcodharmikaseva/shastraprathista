// logout.js
function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  alert('You have been logged out.');
  window.location.href = 'login.html';
}

// Auto-redirect to login if not logged in
function checkAuth() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    window.location.href = 'login.html';
  }
}
