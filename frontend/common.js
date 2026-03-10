// common.js - Shared JavaScript functions
// Add this near the top of the file, maybe after the other variable
// Add these variables
let migrationAttempted = false;
let authUIRetryCount = 0;
const MAX_AUTH_UI_RETRIES = 5;


// ==================== CART UTILITY FUNCTIONS ====================

// Get current user from localStorage
function getCurrentUser() {
  try {
    const userData = localStorage.getItem("currentUser");
    const token = localStorage.getItem("token");
    
    if (!userData) {
      return null;
    }
    
    const user = JSON.parse(userData);
    
    if (!user || !user.id) {
      console.warn('Invalid user data structure');
      return null;
    }
    
    user.token = token;
    return user;
    
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

// Get cart key based on user
function getCartKey() {
  const user = getCurrentUser();
  if (user && user.id) {
    return `cart_${user.id}`;
  } else {
    return 'guest_cart';
  }
}

// Get user cart from localStorage
function getUserCart() {
  try {
    const cartKey = getCartKey();
    const cartData = localStorage.getItem(cartKey);
    
    if (!cartData) {
      return [];
    }
    
    const cart = JSON.parse(cartData);
    
    if (!Array.isArray(cart)) {
      console.error('Cart is not an array, resetting...');
      localStorage.setItem(cartKey, JSON.stringify([]));
      return [];
    }
    
    return cart;
  } catch (error) {
    console.error('Error reading cart:', error);
    return [];
  }
}

// Update cart count in header
function updateCartCount() {
  const cartCount = document.getElementById("cart-count");
  if (!cartCount) return;
  
  const cart = getUserCart();
  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  
  if (totalItems > 0) {
    cartCount.textContent = totalItems;
    cartCount.style.display = 'flex';
  } else {
    cartCount.style.display = 'none';
  }
}

function saveUserCart(cart) {
  try {
    const cartKey = getCartKey();

    if (!Array.isArray(cart)) {
      console.error('Attempted to save invalid cart:', cart);
      return;
    }

    if (typeof window.bookDetailModal !== 'undefined' && window.bookDetailModal) {
      window.bookDetailModal.style.display = 'none';
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    console.log('✅ Cart saved successfully. Key:', cartKey, 'Items:', cart.length);

    updateCartCount();

    window.dispatchEvent(
      new CustomEvent('cartUpdated', {
        detail: {
          cart,
          totalItems: cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
        }
      })
    );

  } catch (error) {
    console.error('Error saving cart:', error);
  }
}

// Migrate guest cart to user cart when user logs in
function migrateGuestCartToUserCart() {
  const user = getCurrentUser();
  if (!user) return false;
  
  const guestCart = JSON.parse(localStorage.getItem('guest_cart')) || [];
  const userCartKey = `cart_${user.id}`;
  const existingUserCart = JSON.parse(localStorage.getItem(userCartKey)) || [];
  
  console.log('🔄 Migrating guest cart to user cart...');
  console.log('Guest cart items:', guestCart.length);
  console.log('Existing user cart items:', existingUserCart.length);
  
  if (guestCart.length > 0) {
    // Create a map for existing user cart items for quick lookup
    const userCartMap = new Map();
    existingUserCart.forEach(item => {
      userCartMap.set(item.id, item);
    });
    
    // Merge guest cart items
    guestCart.forEach(guestItem => {
      if (userCartMap.has(guestItem.id)) {
        // Item exists, update quantity
        const existingItem = userCartMap.get(guestItem.id);
        existingItem.quantity += guestItem.quantity;
      } else {
        // New item, add to cart
        userCartMap.set(guestItem.id, {...guestItem});
      }
    });
    
    // Convert map back to array
    const mergedCart = Array.from(userCartMap.values());
    
    // Save the merged cart
    localStorage.setItem(userCartKey, JSON.stringify(mergedCart));
    localStorage.removeItem('guest_cart');
    
    console.log('✅ Cart migration completed. Total items:', mergedCart.length);
    return true;
  }
  
  return false;
}

// Cleanup old carts
function cleanupOldCarts() {
  const keysToRemove = [];
  const currentCartKey = getCartKey();
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    
    // Remove ONLY carts with undefined user IDs, NOT guest_cart
    if (key === 'cart_undefined' || 
        (key.startsWith('cart_') && key !== currentCartKey && !key.includes('guest'))) {
      keysToRemove.push(key);
    }
  }
  
  // Remove the old cart entries
  keysToRemove.forEach(key => {
    console.log('🧹 Removing old cart:', key);
    localStorage.removeItem(key);
  });
  
  if (keysToRemove.length > 0) {
    console.log('✅ Cleaned up old cart entries');
  }
}

// Add item to cart (universal function for all pages)
function addToCart(bookId, quantity = 1) {
  // This function should be overridden by page-specific implementations
  console.log('addToCart called with:', bookId, quantity);
  // Page-specific implementations will override this
}

// ==================== CART INITIALIZATION ====================

// Initialize cart system
function initCart() {
  // Clean up old carts first
  cleanupOldCarts();
  
  // Update cart count
  updateCartCount();
  
  // Listen for storage changes to sync cart across tabs
  window.addEventListener('storage', function(e) {
    if (e.key === getCartKey()) {
      console.log('🔄 Cart updated in another tab, refreshing count...');
      updateCartCount();
    }
  });
  
  // Listen for page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateCartCount();
    }
  });
  
  // Listen for custom cart update events
  window.addEventListener('cartUpdated', (e) => {
    console.log('Cart updated via event:', e.detail);
    updateCartCount();
  });
}

// ==================== EXISTING FUNCTIONS (UPDATED) ====================

// Initialize common functionality
let commonInitialized = false;

function initCommon() {
  if (commonInitialized) {
    console.log('⚠️ initCommon already called, skipping');
    return;
  }

  commonInitialized = true;
  console.log('Initializing common functions...');

  setupMenuToggle();
  setupDropdowns();
  setupActiveMenu();   // ✅ single source of menu highlight
  updateAuthUI();      // ✅ This will also render shields
  initCart();
  
  // ✅ Initialize inventory system if function exists
  if (typeof initInventorySystem === 'function') {
    initInventorySystem();
  }

  console.log('Common functions initialized');
}

// ==================== ADMIN SHIELDS FUNCTIONS ====================

// Render admin shields in header based on user role
function renderAdminShields() {
  const shieldsContainer = document.getElementById('adminShieldsHeader');
  if (!shieldsContainer) {
    console.warn('Admin shields container not found in header');
    return;
  }
  
  const user = getCurrentUser();
  const token = localStorage.getItem('token');
  const role = user?.role;
  
  // Clear existing shields
  shieldsContainer.innerHTML = '';
  
  if (!token || !role) {
    console.log('No user logged in, hiding admin shields');
    return;
  }
  
  console.log(`👤 User role: ${role}, Rendering shields...`);
  
  // Define shields based on roles
  const roleShields = {
    'super_admin': [
      { icon: 'fas fa-crown', title: 'Super Admin Dashboard', href: 'admin.html' },
      { icon: 'fas fa-boxes-stacked', title: 'Inventory Management', href: 'inventory.html' },
      { icon: 'fas fa-music', title: 'Music Admin', href: 'music-admin.html' },
      { icon: 'fas fa-landmark', title: 'Hall Admin', href: 'hall-admin.html' }
    ],
    'admin': [
      { icon: 'fas fa-shield-halved', title: 'Admin Dashboard', href: 'admin.html' },
      { icon: 'fas fa-boxes-stacked', title: 'Inventory Management', href: 'inventory.html' },
      { icon: 'fas fa-music', title: 'Music Admin', href: 'music-admin.html' },
      { icon: 'fas fa-landmark', title: 'Hall Admin', href: 'hall-admin.html' }
    ],
    'music_admin': [
      { icon: 'fas fa-music', title: 'Music Admin', href: 'music-admin.html' }
    ],
    'hall_admin': [
      { icon: 'fas fa-landmark', title: 'Hall Admin', href: 'hall-admin.html' }
    ]
  };
  
  // Get shields for current role
  const shields = roleShields[role] || [];
  
  if (shields.length === 0) {
    console.log('No shields for role:', role);
    return;
  }
  
  // Create shield group
  const shieldGroup = document.createElement('div');
  shieldGroup.className = 'shield-group';
  
  // Add each shield
  shields.forEach(shield => {
    const shieldLink = document.createElement('a');
    shieldLink.href = shield.href;
    shieldLink.title = shield.title;
    shieldLink.setAttribute('aria-label', shield.title);
    
    const icon = document.createElement('i');
    icon.className = shield.icon;
    
    const tooltip = document.createElement('span');
    tooltip.className = 'shield-tooltip';
    tooltip.textContent = shield.title;
    
    shieldLink.appendChild(icon);
    shieldLink.appendChild(tooltip);
    shieldGroup.appendChild(shieldLink);
  });
  
  shieldsContainer.appendChild(shieldGroup);
  console.log(`✅ Rendered ${shields.length} shields for ${role}`);
}

function updateAuthUI() {
  const user = getCurrentUser();
  const authLink = document.getElementById("auth-link");
  const welcomeText = document.getElementById("welcome-text");
  const userWelcome = document.getElementById("user-welcome");
  
  // Check if authLink exists - if not, retry (max 5 times)
  if (!authLink) {
    if (authUIRetryCount < MAX_AUTH_UI_RETRIES) {
      authUIRetryCount++;
      console.log(`auth-link element not found, retry ${authUIRetryCount}/${MAX_AUTH_UI_RETRIES} in 500ms...`);
      setTimeout(updateAuthUI, 500);
    } else {
      console.error('Failed to find auth-link after multiple retries');
    }
    return;
  }
  
  // Reset counter on success
  authUIRetryCount = 0;
  
  if (user) {
    // User is logged in - migrate guest cart if exists (ONLY ONCE)
    if (!migrationAttempted) {
      const migrated = migrateGuestCartToUserCart();
      migrationAttempted = true;
      
      if (migrated) {
        showToast("Your guest cart items have been added to your account", "success");
        // Refresh cart display after migration
        setTimeout(updateCartCount, 500);
      }
    }
    
    authLink.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
    authLink.href = "#";
    authLink.onclick = logout;
    
    if (welcomeText) welcomeText.textContent = user.name; // Remove "Welcome, "
    if (userWelcome) userWelcome.style.display = 'flex';
    
    // ✅ ADD THIS: Render admin shields when user is logged in
    renderAdminShields();
    
  } else {
    // User is not logged in
    authLink.innerHTML = '<i class="fas fa-user"></i> Sign In';
    authLink.href = "login.html";
    authLink.onclick = null;
    
    if (userWelcome) userWelcome.style.display = 'none';
    migrationAttempted = false; // Reset for next login
    
    // ✅ ADD THIS: Clear admin shields when user logs out
    const shieldsContainer = document.getElementById('adminShieldsHeader');
    if (shieldsContainer) {
      shieldsContainer.innerHTML = '';
    }
  }
}

function refreshAuthUI() {
  console.log('Refreshing auth UI...');
  updateAuthUI();
  // ✅ Shields will be rendered automatically via updateAuthUI
}

// Logout function (UPDATED WITH CART PERSISTENCE)
function logout() {
  // Save current cart state before logout
  const currentCart = getUserCart();
  
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");
  
  // If there were items in the cart, move them to guest cart
  if (currentCart.length > 0) {
    localStorage.setItem('guest_cart', JSON.stringify(currentCart));
    console.log('✅ Cart saved to guest cart after logout');
  }
  
  updateAuthUI();
  updateCartCount();
  showToast("✅ You have been logged out", "success");
  
  // ✅ ADD THIS: Clear shields immediately
  const shieldsContainer = document.getElementById('adminShieldsHeader');
  if (shieldsContainer) {
    shieldsContainer.innerHTML = '';
  }
  
  setTimeout(() => {
    window.location.href = "index.html";
  }, 1000);
  return false;
}

// Setup menu toggle for mobile
function setupMenuToggle() {
  const menuToggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('menu');
  
  if (menuToggle && menu) {
    console.log('Setting up menu toggle...');
    
    // Remove any existing event listeners
    menuToggle.removeEventListener('click', menuToggle.clickHandler);
    
    // Add new event listener
    menuToggle.clickHandler = () => {
      console.log('Menu toggle clicked');
      menu.classList.toggle('show');
      // Close all dropdowns when toggling menu
      if (!menu.classList.contains('show')) {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
          dropdown.classList.remove('active');
        });
      }
    };
    
    menuToggle.addEventListener('click', menuToggle.clickHandler);
  } else {
    // Retry after 500ms if elements not found
    setTimeout(setupMenuToggle, 500);
  }
}

// Set active menu item based on current page
function setupActiveMenu() {
  const currentPage = window.location.pathname.split('/').pop();
  const menuItems = {
    'index.html': {id: 'menu-home', parent: null},
    'all_book_grid.html': {id: 'menu-books', parent: null},
    'library.html': {id: 'menu-library', parent: null},
    'music.html': {id: 'menu-music', parent: null},
    'vedapathasala.html': {id: 'menu-videos', parent: null},
    'temples.html': {id: 'menu-temples', parent: null},
    'aboutus.html': {id: 'menu-about', parent: null},
    // Temple subpages
    'temple_sharadambal.html': {id: 'menu-temples', parent: 'temple_sharadambal'},
    'temple_meenakshi.html': {id: 'menu-temples', parent: 'temple_meenakshi'},
    'temple_ramalingeshwarar.html': {id: 'menu-temples', parent: 'temple_ramalingeshwarar'},
    // Marriage Hall subpages
    'chokkar-hall.html': {id: 'menu-marriage-hall', parent: 'chokkar-hall'},
    'ttd-hall.html': {id: 'menu-marriage-hall', parent: 'ttd-hall'}
  };
  
  const activeItem = menuItems[currentPage];
  if (activeItem) {
    // Highlight main menu item
    const activeLink = document.getElementById(activeItem.id);
    if (activeLink) {
      activeLink.classList.add('active');
    }
    
    // Also highlight the specific dropdown item if it's a subpage
    if (activeItem.parent) {
      // Find the dropdown menu item and highlight it
      const dropdownItem = document.querySelector(`.dropdown-menu a[href*="${currentPage}"]`);
      if (dropdownItem) {
        dropdownItem.classList.add('active');
        // Also ensure the parent dropdown link is active
        if (activeLink) {
          activeLink.classList.add('active');
        }
      }
    }
  }
}

// Add this new function for dropdowns
function setupDropdowns() {
  const dropdowns = document.querySelectorAll('.dropdown > a');
  
  dropdowns.forEach(dropdown => {
    dropdown.addEventListener('click', function(e) {
      if (window.innerWidth <= 768) {
        // Mobile behavior - toggle dropdown
        e.preventDefault();
        e.stopPropagation();
        const parent = this.parentElement;
        const isActive = parent.classList.contains('active');
        
        // Close all other dropdowns
        document.querySelectorAll('.dropdown').forEach(d => {
          if (d !== parent) {
            d.classList.remove('active');
          }
        });
        
        // Toggle current dropdown
        parent.classList.toggle('active', !isActive);
      }
      // On desktop, allow normal link navigation
    });
  });
  
  // Close dropdowns when clicking elsewhere (mobile)
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768) {
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
          dropdown.classList.remove('active');
        });
      }
    }
  });
  
  // Close dropdowns when window is resized to desktop size
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });
}

function showToast(message, type = 'info') {
  const toast = document.getElementById("toast") || document.createElement('div');
  if (!toast.id) {
    toast.id = 'toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      z-index: 9999;
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
      transition: opacity 0.3s, transform 0.3s;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = '';

  if (type === 'success') {
    toast.style.backgroundColor = '#2ecc71';
  } else if (type === 'error') {
    toast.style.backgroundColor = '#e74c3c';
  } else if (type === 'warning') {
    toast.style.backgroundColor = '#f39c12';
  } else {
    toast.style.backgroundColor = '#3498db';
  }

  toast.classList.add("show");
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
  }, 3000);
}

// ==================== INVENTORY-INTEGRATED CART SYSTEM ====================

const INVENTORY_API = window.location.origin + '/api/inventory';

async function checkInventoryBatch(bookIds) {
  if (!Array.isArray(bookIds) || bookIds.length === 0) return {};

  try {
    const res = await fetch(`/api/inventory/status?ids=${bookIds.join(',')}`);
    if (!res.ok) throw new Error('Batch inventory failed');

    return await res.json();
  } catch (error) {
    console.error('❌ Batch inventory error:', error);
    return {};
  }
}

// ENHANCED VERSION with better error handling
async function checkBookAvailability(bookId, quantity = 1) {
  try {
    console.log(`📦 Checking inventory for book ${bookId}, quantity: ${quantity}`);
    
    const response = await fetch(`${INVENTORY_API}/status/${bookId}?quantity=${quantity}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : null
    });
    
    if (!response.ok) {
      console.log(`⚠️ Inventory API returned ${response.status} for ${bookId}?quantity=${quantity}`);
      
      // Return STRUCTURED error object
      return {
        available: 0,
        canPurchase: false,
        bookTitle: 'Unknown',
        message: `Inventory check failed (${response.status})`,
        inStock: false,
        apiError: true,
        error: `HTTP ${response.status}`,
        isError: true,
        status: 'error'
      };
    }
    
    const data = await response.json();
    console.log(`📦 Inventory API response for ${bookId}:`, data);
    
    // ✅ SAFE DATA EXTRACTION
    const available = Number(data.available || data.stock || data.quantity || 0);
    const canPurchase = (data.canPurchase !== false) && (available >= quantity);
    const bookTitle = data.title || data.name || 'Unknown Book';
    
    // ✅ BETTER MESSAGES
    let message, status;
    if (available <= 0) {
      message = 'Out of Stock';
      status = 'out-of-stock';
    } else if (available < quantity) {
      message = `Only ${available} left`;
      status = 'low-stock';
    } else if (available >= quantity) {
      message = 'In Stock';
      status = 'in-stock';
    } else {
      message = 'Available';
      status = 'available';
    }
    
    return {
      available: available,
      canPurchase: canPurchase,
      bookTitle: bookTitle,
      stock: available,
      inStock: available > 0,
      message: message,
      apiError: false,
      isError: false,
      status: status,
      // Include raw data for debugging
      rawData: data
    };
    
  } catch (error) {
    console.error('❌ Error checking availability:', error);
    
    return {
      available: 0,
      canPurchase: false,
      bookTitle: 'Unknown',
      message: 'Failed to check inventory',
      inStock: false,
      apiError: true,
      error: error.message,
      isError: true,
      status: 'error'
    };
  }
}

// Reserve stock when adding to cart
async function reserveBookStock(bookId, quantity = 1) {
  try {
    const user = getCurrentUser();
    const sessionId = user ? `user_${user.id}` : `guest_${getCartKey()}`;
    
    const response = await fetch(`${INVENTORY_API}/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        bookId,
        quantity,
        sessionId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to reserve stock');
    }
    
    const result = await response.json();
    return result;
    
  } catch (error) {
    console.error('Error reserving stock:', error);
    throw error;
  }
}

// Release stock when removing from cart
async function releaseBookStock(bookId, quantity = 1) {
  try {
    const response = await fetch(`${INVENTORY_API}/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bookId,
        quantity
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error releasing stock:', error);
    return false;
  }
}

// Enhanced addToCart function with inventory check
async function addToCartWithInventory(bookId, quantity = 1) {
  try {
    // 1. Check inventory availability
    const availability = await checkBookAvailability(bookId, quantity);
    
    if (!availability.canPurchase) {
      showToast(
        `❌ "${availability.bookTitle}" - ${availability.message}`,
        'error'
      );
      return false;
    }
    
    // 2. Reserve the stock
    await reserveBookStock(bookId, quantity);
    
    // 3. Add to cart
    const cart = getUserCart();
    const existingItem = cart.find(item => item.id === bookId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      // Fetch book details
      const response = await fetch(`/api/books/${bookId}`);
      const book = await response.json();
      
      cart.push({
        id: book._id,
        bookId: book._id, // Add explicit bookId for backend
        title: book.title,
        price: book.price,
        originalPrice: book.originalPrice || book.price,
        discount: book.discount || 0,
        image: book.images?.[0] || book.image || '',
        weight: book.weight || 500,
        quantity: quantity,
        inventory: {
          available: availability.available,
          stock: availability.stock
        }
      });
    }
    
    saveUserCart(cart);
    
    // 4. Show success message
    showToast(
      `✅ Added "${availability.bookTitle}" to cart`,
      'success'
    );
    
    return true;
    
  } catch (error) {
    console.error('Error adding to cart:', error);
    showToast(
      `❌ Failed to add to cart: ${error.message}`,
      'error'
    );
    return false;
  }
}

// Enhanced updateQuantity with inventory check
async function updateCartQuantity(index, newQuantity) {
  const cart = getUserCart();
  const item = cart[index];
  
  if (!item) return;
  
  const oldQuantity = item.quantity;
  const quantityChange = newQuantity - oldQuantity;
  
  if (quantityChange === 0) return;
  
  try {
    // If increasing quantity, check and reserve more stock
    if (quantityChange > 0) {
      const availability = await checkBookAvailability(item.id, quantityChange);
      
      if (!availability.canPurchase) {
        showToast(
          `❌ Cannot increase quantity. ${availability.message}`,
          'error'
        );
        return;
      }
      
      await reserveBookStock(item.id, quantityChange);
    }
    // If decreasing quantity, release stock
    else if (quantityChange < 0) {
      await releaseBookStock(item.id, Math.abs(quantityChange));
    }
    
    // Update cart
    item.quantity = newQuantity;
    saveUserCart(cart);
    
    // Update UI
    if (typeof updateCartSummary === 'function') {
      updateCartSummary();
    }
    
    showToast('Quantity updated', 'success');
    
  } catch (error) {
    console.error('Error updating quantity:', error);
    showToast('Failed to update quantity', 'error');
  }
}

// Enhanced removeFromCart with inventory release
async function removeFromCartWithInventory(index) {
  const cart = getUserCart();
  const item = cart[index];
  
  if (!item) return;
  
  try {
    // Release reserved stock
    await releaseBookStock(item.id, item.quantity);
    
    // Remove from cart
    cart.splice(index, 1);
    saveUserCart(cart);
    
    // Update UI
    if (typeof updateCartSummary === 'function') {
      updateCartSummary();
    }
    
    showToast(`Removed "${item.title}" from cart`, 'success');
    
  } catch (error) {
    console.error('Error removing from cart:', error);
    showToast('Failed to remove item', 'error');
  }
}

// ENHANCED VERSION with retry logic
async function updateInventoryAfterCheckout(orderData, retryCount = 3) {
  try {
    console.log('📦 Updating inventory after checkout for order:', orderData.orderId);
    
    // ✅ VALIDATE INPUT
    if (!orderData || !orderData.items || !Array.isArray(orderData.items)) {
      console.error('❌ Invalid order data for inventory update');
      return {
        success: false,
        message: 'Invalid order data',
        updatedItems: []
      };
    }
    
    // ✅ PREPARE ITEMS
    const inventoryItems = orderData.items
      .filter(item => item && (item.bookId || item.id) && item.quantity)
      .map(item => ({
        bookId: item.bookId || item.id,
        quantity: Math.max(1, Number(item.quantity) || 1),
        price: Number(item.price) || 0,
        title: item.title || 'Unknown Book'
      }));
    
    if (inventoryItems.length === 0) {
      console.warn('⚠️ No valid items to update inventory');
      return {
        success: false,
        message: 'No valid items to update',
        updatedItems: []
      };
    }
    
    console.log('📦 Items to update inventory:', inventoryItems);
    
    // ✅ ATTEMPT UPDATE WITH RETRY
    let lastError;
    
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const response = await fetch(`${INVENTORY_API}/update-after-purchase`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({
            orderId: orderData.orderId || `order-${Date.now()}`,
            items: inventoryItems,
            timestamp: new Date().toISOString()
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Inventory updated successfully:', result);
          
          return {
            success: true,
            message: 'Inventory updated successfully',
            updatedItems: inventoryItems,
            response: result
          };
        } else {
          const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
          lastError = errorData;
          console.warn(`⚠️ Inventory update attempt ${attempt} failed:`, errorData);
          
          if (attempt < retryCount) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
        
      } catch (fetchError) {
        lastError = fetchError;
        console.warn(`⚠️ Inventory update attempt ${attempt} error:`, fetchError.message);
        
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // ✅ ALL RETRIES FAILED
    console.error('❌ All inventory update attempts failed:', lastError);
    
    // Save failed updates for manual processing
    saveFailedInventoryUpdate(orderData, inventoryItems, lastError);
    
    return {
      success: false,
      message: 'Failed to update inventory after all retries',
      error: lastError,
      updatedItems: [],
      needsManualUpdate: true
    };
    
  } catch (error) {
    console.error('❌ Error updating inventory after checkout:', error);
    
    return {
      success: false,
      message: 'Unexpected error updating inventory',
      error: error.message,
      updatedItems: [],
      isError: true
    };
  }
}

// ✅ HELPER: Save failed updates for admin
function saveFailedInventoryUpdate(orderData, items, error) {
  try {
    const failedUpdates = JSON.parse(localStorage.getItem('failedInventoryUpdates') || '[]');
    
    failedUpdates.push({
      orderId: orderData.orderId,
      timestamp: new Date().toISOString(),
      items: items,
      error: error?.message || String(error),
      orderData: orderData
    });
    
    // Keep only last 50 failed updates
    if (failedUpdates.length > 50) {
      failedUpdates.splice(0, failedUpdates.length - 50);
    }
    
    localStorage.setItem('failedInventoryUpdates', JSON.stringify(failedUpdates));
    console.log('📝 Saved failed inventory update for admin review');
    
  } catch (saveError) {
    console.error('Failed to save failed inventory update:', saveError);
  }
}

// ENHANCED VERSION with batch checking
async function validateCartBeforeCheckout() {
  try {
    const cart = getUserCart();
    console.log('🛒 Validating cart with', cart.length, 'items');
    
    if (!Array.isArray(cart) || cart.length === 0) {
      return {
        allAvailable: true,
        results: [],
        unavailableItems: [],
        cart: cart,
        updated: false,
        message: 'Cart is empty'
      };
    }
    
    // ✅ Use batch checking if available
    if (typeof checkInventoryBatch === 'function') {
      console.log('✅ Using batch inventory check');
      
      const bookIds = cart.map(item => item.id || item.bookId).filter(Boolean);
      const inventoryMap = await checkInventoryBatch(bookIds);
      
      const validationResults = cart.map((item, index) => {
        const bookId = item.id || item.bookId;
        const stockData = inventoryMap[bookId] || {};
        const available = Number(stockData.available || stockData.stock || 0);
        const canPurchase = available >= (item.quantity || 1);
        
        let message = '';
        if (!stockData || stockData.apiError) {
          message = 'Inventory check failed';
        } else if (available <= 0) {
          message = 'Out of Stock';
        } else if (available < (item.quantity || 1)) {
          message = `Only ${available} left`;
        } else {
          message = 'Available';
        }
        
        return {
          item,
          available: canPurchase,
          message,
          requested: item.quantity || 1,
          inStock: available,
          bookId: bookId,
          index: index,
          stockData: stockData
        };
      });
      
      const allAvailable = validationResults.every(result => result.available);
      const unavailableItems = validationResults.filter(result => !result.available);
      
      return {
        allAvailable,
        results: validationResults,
        unavailableItems,
        cart,
        updated: false,
        batchChecked: true
      };
      
    } else {
      // ✅ Fallback to sequential checking
      console.log('⚠️ Using sequential inventory check');
      const validationResults = [];
      
      for (const item of cart) {
        try {
          const availability = await checkBookAvailability(item.id, item.quantity);
          
          validationResults.push({
            item,
            available: availability.canPurchase,
            message: availability.message,
            requested: item.quantity,
            inStock: availability.available,
            bookId: item.id,
            stockData: availability
          });
          
        } catch (error) {
          validationResults.push({
            item,
            available: false,
            message: 'Failed to check inventory',
            error: error.message,
            bookId: item.id
          });
        }
      }
      
      const allAvailable = validationResults.every(result => result.available);
      const unavailableItems = validationResults.filter(result => !result.available);
      
      return {
        allAvailable,
        results: validationResults,
        unavailableItems,
        cart,
        updated: false,
        batchChecked: false
      };
    }
    
  } catch (error) {
    console.error('❌ validateCartBeforeCheckout failed:', error);
    
    return {
      allAvailable: false,
      results: [],
      unavailableItems: [],
      cart: [],
      updated: false,
      error: error.message,
      isError: true
    };
  }
}

// Display stock status on book cards
function addStockStatusToBookCards() {
  document.querySelectorAll('.book-card').forEach(card => {
    const bookId = card.dataset.id;
    if (!bookId) return;
    
    // Check stock status
    checkBookAvailability(bookId).then(availability => {
      const stockElement = card.querySelector('.stock-status');
      
      if (!stockElement) {
        // Create stock status element if it doesn't exist
        const priceContainer = card.querySelector('.book-price');
        if (priceContainer) {
          const stockSpan = document.createElement('span');
          stockSpan.className = 'stock-status';
          stockSpan.style.cssText = `
            display: block;
            font-size: 12px;
            margin-top: 4px;
          `;
          
          if (availability.available <= 0) {
            stockSpan.innerHTML = '<span style="color: #e74c3c;">Out of Stock</span>';
            // Disable add to cart button
            const addButton = card.querySelector('.add-to-cart-btn');
            if (addButton) {
              addButton.disabled = true;
              addButton.innerHTML = '<i class="fas fa-ban"></i> Out of Stock';
              addButton.style.opacity = '0.6';
              addButton.style.cursor = 'not-allowed';
            }
          } else if (availability.available <= 5) {
            stockSpan.innerHTML = `<span style="color: #f39c12;">Only ${availability.available} left</span>`;
          } else {
            stockSpan.innerHTML = '<span style="color: #27ae60;">In Stock</span>';
          }
          
          priceContainer.appendChild(stockSpan);
        }
      }
    });
  });
}

// Initialize inventory system
function initInventorySystem() {
  console.log('📦 Initializing inventory system...');
  
  // Update book cards with stock status
  if (typeof addStockStatusToBookCards === 'function') {
    setTimeout(addStockStatusToBookCards, 1000);
  }
  
  // Listen for cart updates
  window.addEventListener('cartUpdated', (event) => {
    console.log('Cart updated, checking inventory...');
    // Revalidate inventory when cart changes
  });
  
  // Periodically check inventory (every 5 minutes)
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      console.log('🔄 Periodic inventory check...');
      if (typeof addStockStatusToBookCards === 'function') {
        addStockStatusToBookCards();
      }
    }
  }, 5 * 60 * 1000);
}

// ==================== GLOBAL EXPORTS ====================

// Make all cart functions globally available
window.INVENTORY_API = INVENTORY_API;
window.getCurrentUser = getCurrentUser;
window.getCartKey = getCartKey;
window.getUserCart = getUserCart;
window.saveUserCart = saveUserCart;
window.updateCartCount = updateCartCount;
window.addToCart = addToCart;

// Make inventory functions globally available
window.checkInventoryBatch = checkInventoryBatch;
window.checkBookAvailability = checkBookAvailability;  // ✅ Add this line
window.reserveBookStock = reserveBookStock;            // Optional: also export this
window.releaseBookStock = releaseBookStock;            // Optional: also export this
window.validateCartBeforeCheckout = validateCartBeforeCheckout; // Optional

// Make common functions globally available
window.initCommon = initCommon;
window.showToast = showToast;
window.refreshAuthUI = refreshAuthUI;
window.logout = logout;

// Add to global exports in common.js:
window.addToCartWithInventory = addToCartWithInventory;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCartWithInventory = removeFromCartWithInventory;
window.updateInventoryAfterCheckout = updateInventoryAfterCheckout;
window.addStockStatusToBookCards = addStockStatusToBookCards;
window.initInventorySystem = initInventorySystem;

window.renderAdminShields = renderAdminShields;
window.logout = logout;

// ==================== INITIALIZATION ====================

// Only auto-initialize if not on books page (books page handles its own initialization)
const currentPage = window.location.pathname.split('/').pop();
if (currentPage !== 'all_book_grid.html') {
  // Initialize when page loads
  // document.addEventListener('DOMContentLoaded', initCommon);
}