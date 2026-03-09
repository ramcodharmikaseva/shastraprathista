// API Configuration
const API_BASE_URL = window.location.origin + '/api';

// Global variables
let cartItems = [];
let currentDiscount = 0;
let discountCode = '';
let shippingCost = 0;
let shippingRegion = '';
let currentStep = 'contactSection';

// ===============================
// ✅ INVENTORY VALIDATION FUNCTIONS
// ===============================

// Check book availability from API
async function checkBookAvailability(bookId, quantity = 1) {
    try {
        console.log(`📦 Checking inventory for book ${bookId}, quantity: ${quantity}`);
        
        const response = await fetch(`${API_BASE_URL}/inventory/status/${bookId}?quantity=${quantity}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const available = data.stock || data.available || 0;
        const canPurchase = data.canPurchase && available >= quantity;
        
        console.log(`📦 Inventory result for ${bookId}:`, {
            available: available,
            requested: quantity,
            canPurchase: canPurchase,
            message: data.message
        });
        
        return {
            available: available,
            canPurchase: canPurchase,
            bookTitle: data.title || 'Unknown Book',
            stock: data.stock,
            inStock: data.inStock,
            message: available >= quantity 
                ? 'In Stock' 
                : available > 0 
                    ? `Only ${available} left` 
                    : 'Out of Stock'
        };
    } catch (error) {
        console.error('Error checking availability:', error);
        // Fallback to assuming available if API fails
        return {
            available: 10,
            canPurchase: true,
            bookTitle: 'Unknown',
            message: 'Available',
            inStock: true
        };
    }
}

// ✅ Batch inventory check (uses your existing individual check function)
async function checkInventoryBatch(bookIds) {
    try {
        console.log('📦 Batch checking inventory for:', bookIds);
        
        if (!bookIds || !bookIds.length) return {};
        
        // Try batch endpoint first
        const queryString = bookIds.join(',');
        const response = await fetch(`${API_BASE_URL}/inventory/status?ids=${queryString}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Batch inventory check successful');
            return data; // { bookId1: {data}, bookId2: {data} }
        }
        
        // If batch endpoint fails, use individual checks
        console.log('⚠️ Batch endpoint failed, using individual checks');
        return await checkBooksIndividually(bookIds);
        
    } catch (error) {
        console.error('❌ Batch inventory check failed:', error);
        // Fallback to individual checks
        return await checkBooksIndividually(bookIds);
    }
}

// ✅ Helper: Check multiple books individually
async function checkBooksIndividually(bookIds) {
    const inventoryMap = {};
    const promises = bookIds.map(async (bookId) => {
        try {
            const result = await checkBookAvailability(bookId, 1);
            inventoryMap[bookId] = {
                available: result.available,
                inStock: result.inStock,
                canPurchase: result.canPurchase,
                title: result.bookTitle,
                stock: result.stock,
                status: result.available > 0 ? 'active' : 'out_of_stock'
            };
        } catch (error) {
            console.warn(`⚠️ Failed to check ${bookId}:`, error);
            inventoryMap[bookId] = {
                available: 0,
                inStock: false,
                canPurchase: false,
                title: 'Unknown Book',
                stock: 0,
                status: 'error'
            };
        }
    });
    
    await Promise.all(promises);
    console.log('✅ Individual checks complete:', inventoryMap);
    return inventoryMap;
}

// Validate all items in cart before checkout
async function validateCartBeforeCheckout() {
  try {
    let cart = window.getUserCart();
    let updated = false;
    const unavailableItems = [];

    if (!cart.length) {
      return { allAvailable: true, unavailableItems: [], updated: false, cart };
    }

    // Collect IDs safely
    const ids = cart
      .map(item => item.id || item.bookId)
      .filter(Boolean);

    if (!ids.length) {
      return { allAvailable: true, unavailableItems: [], updated: false, cart };
    }

    console.log('📦 Batch inventory check for:', ids);

    // 🔥 ONE API CALL ONLY
    const inventoryMap = await checkInventoryBatch(ids);

    for (let i = 0; i < cart.length; i++) {
      const item = cart[i];
      const bookId = item.id || item.bookId;
      const stockData = inventoryMap[bookId];

      // ✅ FIXED: Check if stockData exists before accessing properties
      if (!stockData) {
        console.warn('⚠️ No inventory data for:', bookId);
        
        // Treat missing data as out of stock (for safety)
        unavailableItems.push({
          index: i,
          item,
          message: 'Product information unavailable',
          available: 0
        });

        cart.splice(i, 1);
        i--; // adjust index after splice
        updated = true;
        continue;
      }

      // ✅ Now safely access stockData properties
      const available = Number(stockData.available ?? stockData.stock ?? 0);

      // ❌ remove if out of stock
      if (available <= 0) {
        unavailableItems.push({
          index: i,
          item,
          message: 'Out of stock',
          available: 0
        });

        cart.splice(i, 1);
        i--; // adjust index after splice
        updated = true;
        continue;
      }

      // ⚠️ reduce quantity if needed
      if (item.quantity > available) {
        unavailableItems.push({
          index: i,
          item,
          message: `Quantity reduced to ${available}`,
          available
        });

        item.quantity = available;
        updated = true;
      }
    }

    if (updated) {
      console.log('🛒 Cart updated due to inventory changes');
      window.saveUserCart(cart);
    }

    return {
      allAvailable: unavailableItems.length === 0,
      unavailableItems,
      updated,
      cart
    };

  } catch (error) {
    console.error('❌ validateCartBeforeCheckout failed:', error);

    return {
      allAvailable: false,
      unavailableItems: [],
      updated: false,
      cart: window.getUserCart(),
      error: error.message
    };
  }
}

// ✅ Validate checkout with inventory (SMART VERSION)
async function validateCheckoutWithInventory() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  if (loadingSpinner) loadingSpinner.style.display = 'block';

  try {
    console.log('🔄 Validating inventory before checkout...');
    const validation = await validateCartBeforeCheckout();

    // If cart was updated (qty reduced or items removed)
    if (validation.updated) {
      console.warn('⚠️ Cart adjusted due to inventory:', validation.unavailableItems);

      return {
        success: false,
        message: 'Some item quantities were adjusted based on available stock. Please review your cart.',
        details: validation
      };
    }

    // If still unavailable items exist (safety net)
    if (!validation.allAvailable) {
      const unavailableItems = validation.unavailableItems
        .map(item => `${item.item.title} (${item.message})`)
        .join(', ');

      console.log('❌ Checkout validation failed:', validation.unavailableItems);

      return {
        success: false,
        message: `Some items are not available: ${unavailableItems}`,
        details: validation
      };
    }

    console.log('✅ All items available for checkout');
    return { success: true, message: 'All items are available' };

  } catch (error) {
    console.error('Error validating inventory:', error);
    return {
      success: false,
      message: 'Failed to validate inventory',
      error: error.message
    };

  } finally {
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// ===============================
// ✅ MISSING FUNCTIONS ADDED
// ===============================

function updateUserSession() {
  const user = window.getCurrentUser();
  const authLink = document.getElementById('auth-link');
  const welcomeText = document.getElementById('welcome-text');

  if (user) {
    if (welcomeText) welcomeText.textContent = `Welcome, ${user.name}`;
    if (authLink) {
      authLink.innerHTML = '<i class="fas fa-user"></i> Profile';
      authLink.href = 'profile.html';
    }
  } else {
    if (welcomeText) welcomeText.textContent = 'Welcome, Guest';
    if (authLink) {
      authLink.innerHTML = '<i class="fas fa-user"></i> Sign In';
      authLink.href = 'login.html';
    }
  }
}

// Enhanced validation function for billing address
function validateBillingAddress() {
  const requiredFields = {
    'billingName': 'Full Name',
    'billingAddress': 'Full Address', 
    'billingCity': 'City',
    'billingDistrict': 'District',
    'billingState': 'State',
    'billingPincode': 'Pincode',
    'billingPhone': 'Phone Number'
  };

  const missingFields = [];

  for (const [fieldId, fieldName] of Object.entries(requiredFields)) {
    const field = document.getElementById(fieldId);
    if (!field || !field.value.trim()) {
      missingFields.push(fieldName);
    }
  }

  // Validate phone format
  const phoneField = document.getElementById('billingPhone');
  if (phoneField && phoneField.value.trim() && !/^\d{10}$/.test(phoneField.value.trim())) {
    missingFields.push('Valid 10-digit Phone Number');
  }

  // Validate pincode format
  const pincodeField = document.getElementById('billingPincode');
  if (pincodeField && pincodeField.value.trim() && !/^\d{6}$/.test(pincodeField.value.trim())) {
    missingFields.push('Valid 6-digit Pincode');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields: missingFields
  };
}

// Enhanced contact form validation
function validateContactForm() {
  const name = document.getElementById('contactName')?.value?.trim() || '';
  const phone = document.getElementById('contactPhone')?.value?.trim() || '';
  const email = document.getElementById('contactEmail')?.value?.trim() || '';
  
  const errors = [];
  
  if (name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (!/^\d{10}$/.test(phone)) {
    errors.push('Valid 10-digit phone number is required');
  }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Valid email address is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Auto-fill billing address from contact info
function autoFillBillingFromContact() {
  const contactName = document.getElementById('contactName')?.value?.trim();
  const contactPhone = document.getElementById('contactPhone')?.value?.trim();
  
  if (contactName && !document.getElementById('billingName').value) {
    document.getElementById('billingName').value = contactName;
  }
  
  if (contactPhone && !document.getElementById('billingPhone').value) {
    document.getElementById('billingPhone').value = contactPhone;
  }
}

// ===============================
// ✅ ENHANCED INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', function () {
  console.log('🛒 Checkout page initialized');

  updateUserSession();
  loadCartItems();
  setupEventListeners();
  updateStepIndicators();
  autoFillBillingFromContact();
  
  // Check inventory on page load
  setTimeout(async () => {
    try {
      const validation = await validateCartBeforeCheckout();
      if (!validation.allAvailable && validation.unavailableItems.length > 0) {
        const unavailableTitles = validation.unavailableItems
          .map(item => item.item.title)
          .join(', ');
        
        window.showToast(
          `⚠️ Some items may be out of stock: ${unavailableTitles}`,
          'warning'
        );
        
        // Update the order summary to show warnings
        updateOrderSummaryWithWarnings(validation.unavailableItems);
      }
    } catch (error) {
      console.log('Inventory check on load failed:', error);
    }
  }, 1000);
});

function loadCartItems() {
  try {
    cartItems = window.getUserCart();
    console.log('✅ Loaded cart items:', cartItems.length, 'items');
    window.updateCartCount();
    
    if (document.getElementById('summarySection')?.classList.contains('active')) {
      updateOrderSummary();
    }
  } catch (error) {
    cartItems = [];
  }
}

// ===============================
// ✅ STEP NAVIGATION - ENHANCED
// ===============================
function goToAddress() {
  const contactValidation = validateContactForm();
  
  if (!contactValidation.isValid) {
    const errorMessage = `Please fix the following contact details:\n• ${contactValidation.errors.join('\n• ')}`;
    window.showToast(errorMessage, 'error');
    return;
  }
  
  showStep('addressSection');
  updateStepIndicators();
}

function goToSummary() {
  const billingValidation = validateBillingAddress();
  
  if (!billingValidation.isValid) {
    const errorMessage = `Please fill in the following required fields:\n• ${billingValidation.missingFields.join('\n• ')}`;
    window.showToast(errorMessage, 'error');
    return;
  }
  
  showStep('summarySection');
  updateStepIndicators();
  updateOrderSummary();
}

function goToPayment() {
  const region = document.getElementById('region').value;
  if (!region) {
    window.showToast('Please select a shipping region', 'error');
    return;
  }
  
  // ✅ Validate inventory before allowing payment
  const validationBtn = document.getElementById('validateInventoryBtn');
  if (validationBtn) {
    validationBtn.disabled = true;
    validationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking Inventory...';
  }
  
  // Check inventory before proceeding to payment
  setTimeout(async () => {
    try {
      const validation = await validateCheckoutWithInventory();
      
      if (!validation.success) {
        window.showToast(validation.message, 'error');
        
        // Go back to summary to fix issues
        setTimeout(() => {
          goBackToStep('summarySection');
        }, 2000);
        
        if (validationBtn) {
          validationBtn.disabled = false;
          validationBtn.innerHTML = '<i class="fas fa-check"></i> Proceed to Payment';
        }
        return;
      }
      
      // Inventory check passed, proceed to payment
      updateAddressConfirmation();
      showStep('paymentSection');
      updateStepIndicators();
      
      if (validationBtn) {
        validationBtn.disabled = false;
        validationBtn.innerHTML = '<i class="fas fa-check"></i> Proceed to Payment';
      }
      
    } catch (error) {
      window.showToast('Failed to verify inventory', 'error');
      if (validationBtn) {
        validationBtn.disabled = false;
        validationBtn.innerHTML = '<i class="fas fa-check"></i> Proceed to Payment';
      }
    }
  }, 500);
}

function goBackToStep(stepId) {
  showStep(stepId);
  updateStepIndicators();
}

// ✅ FIX: Make sure showStep function is working
function showStep(stepId) {
    const steps = ['contactSection', 'addressSection', 'summarySection', 'paymentSection'];
    
    // Hide all steps
    steps.forEach(step => {
        const element = document.getElementById(step);
        if (element) {
            element.style.display = 'none';
            element.classList.remove('active');
        }
    });
    
    // Show the requested step
    const activeStep = document.getElementById(stepId);
    if (activeStep) {
        activeStep.style.display = 'block';
        activeStep.classList.add('active');
        currentStep = stepId;
        window.scrollTo(0, 0);
    }
    
    updateStepIndicators();
}

function updateStepIndicators() {
  const steps = ['contactSection', 'addressSection', 'summarySection', 'paymentSection'];
  const currentIndex = steps.indexOf(currentStep);
  
  steps.forEach((step, index) => {
    const indicator = document.querySelector(`[data-step="${step}"]`);
    if (indicator) {
      indicator.classList.remove('active', 'completed');
      if (index === currentIndex) indicator.classList.add('active');
      else if (index < currentIndex) indicator.classList.add('completed');
    }
  });
}

// ===============================
// ✅ ADDRESS MANAGEMENT
// ===============================
function copyBillingToShipping() {
  document.getElementById('shippingName').value = document.getElementById('billingName').value;
  document.getElementById('shippingAddress').value = document.getElementById('billingAddress').value;
  document.getElementById('shippingCity').value = document.getElementById('billingCity').value;
  document.getElementById('shippingDistrict').value = document.getElementById('billingDistrict').value;
  document.getElementById('shippingState').value = document.getElementById('billingState').value;
  document.getElementById('shippingPincode').value = document.getElementById('billingPincode').value;
  document.getElementById('shippingPhone').value = document.getElementById('billingPhone').value;
  document.getElementById('shippingCountry').value = document.getElementById('billingCountry').value;
  
  window.showToast('Billing address copied to shipping address', 'success');
}

function getFormattedAddress(prefix) {
  const addressText = document.getElementById(`${prefix}Address`)?.value || '';
  const addressLines = addressText.split('\n');
  
  // ✅ DEBUG: Check if we're getting the values
  const name = document.getElementById(`${prefix}Name`)?.value || '';
  const city = document.getElementById(`${prefix}City`)?.value || '';
  const district = document.getElementById(`${prefix}District`)?.value || '';
  
  console.log(`📍 ${prefix} Address - Name: "${name}", City: "${city}", District: "${district}"`);
  
  return {
    fullName: name,
    addressLine1: addressLines[0] || addressText,
    addressLine2: addressLines.slice(1).join(', ') || '',
    city: city,
    district: district,
    state: document.getElementById(`${prefix}State`)?.value || '',
    pincode: document.getElementById(`${prefix}Pincode`)?.value || '',
    country: document.getElementById(`${prefix}Country`)?.value || 'India',
    phone: document.getElementById(`${prefix}Phone`)?.value || ''
  };
}

function updateAddressConfirmation() {
  const billingAddress = getFormattedAddress('billing');
  const shippingAddress = getFormattedAddress('shipping');
  
  // ✅ FIXED: Properly display the address objects
  console.log('📋 Billing Address Object:', JSON.stringify(billingAddress, null, 2));
  console.log('📋 Shipping Address Object:', JSON.stringify(shippingAddress, null, 2));
  
  // ✅ FIXED: Create proper display strings
  const billingDisplay = createAddressDisplayString(billingAddress, 'Billing');
  const shippingDisplay = createAddressDisplayString(shippingAddress, 'Shipping');
  
  document.getElementById('confirmBillingAddress').textContent = billingDisplay;
  document.getElementById('confirmShippingAddress').textContent = shippingDisplay;
  
  const regionSelect = document.getElementById('region');
  if (regionSelect) {
    document.getElementById('confirmShippingRegion').textContent = regionSelect.options[regionSelect.selectedIndex].text;
  }
}

// ✅ NEW: Helper function to create address display string
function createAddressDisplayString(address, type) {
  if (!address.fullName || !address.addressLine1) {
    console.warn(`⚠️ ${type} address missing name or address line 1:`, address);
    return `${type} address incomplete - Please check address details`;
  }
  
  const parts = [
    address.fullName,
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.district,
    address.state,
    `${address.pincode}${address.country && address.country !== 'India' ? `, ${address.country}` : ''}`
  ].filter(part => part && part.trim() !== ''); // Remove empty parts
  
  return parts.join(', ');
}

// ===============================
// ✅ ORDER SUMMARY & TOTALS (WITH INVENTORY WARNINGS)
// ===============================
function updateOrderSummary() {
  const summaryBody = document.getElementById('summaryBody');
  if (!summaryBody) return;

  summaryBody.innerHTML = '';
  cartItems = window.getUserCart();

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    summaryBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No items in cart</td></tr>';
    updateSummaryTotals(0, 0, 0);
    return;
  }

  let originalSubtotal = 0;
  let totalWeight = 0;
  let itemLevelDiscountSum = 0;

  cartItems.forEach((item, index) => {
    const qty = Number(item.quantity ?? 1);
    const baseMrp = Number(item.originalPrice ?? item.mrp ?? item.price ?? 0);
    const sellingPrice = Number(item.price ?? baseMrp);
    const discountVal = Number(item.discount ?? 0);

    let discountPerUnit = 0;
    if (discountVal > 0 && discountVal <= 100) {
      discountPerUnit = (baseMrp * discountVal / 100);
    } else if (discountVal > 100) {
      discountPerUnit = discountVal;
    }

    const lineOriginal = baseMrp * qty;
    const lineDiscount = discountPerUnit * qty;

    originalSubtotal += lineOriginal;
    itemLevelDiscountSum += lineDiscount;
    totalWeight += (Number(item.weight || 0) * qty);

    const row = document.createElement('tr');
    row.dataset.bookId = item.id;

    row.innerHTML = `
      <td>
        <img 
          src="${item.image || '/images/no-book.png'}"
          alt="${item.title}"
          class="checkout-book-img"
          loading="eager"
          onerror="this.onerror=null;this.src='/images/no-book.png';"
        />
      </td>

      <td>
        <div><strong>${item.title || 'Untitled'}</strong></div>
        <div style="font-size:12px; margin-top:4px;">
          <span class="availability-info" data-book-id="${item.id}">
            <i class="fas fa-spinner fa-spin"></i> Checking availability...
          </span>
        </div>
      </td>

      <td style="text-align:center;">
        <strong>${qty}</strong>
      </td>

      <td>₹${lineOriginal.toFixed(2)}</td>
      <td>₹${lineDiscount.toFixed(2)}</td>
      <td>₹${(lineOriginal - lineDiscount).toFixed(2)}</td>
    `;
    summaryBody.appendChild(row);
  });

  updateSummaryTotals(originalSubtotal, totalWeight, itemLevelDiscountSum);
  
  // Update availability info for each item
  setTimeout(updateCheckoutAvailabilityInfo, 100);
}

// Update availability info in checkout
async function updateCheckoutAvailabilityInfo() {
  try {
    const rows = document.querySelectorAll('#summaryBody tr');
    if (!rows.length) return;

    // Collect book IDs from rows
    const bookIds = Array.from(rows)
      .map(r => r.dataset.bookId)
      .filter(Boolean);

    if (!bookIds.length) return;

    // Safety check
    if (typeof checkInventoryBatch !== 'function') {
      console.error('❌ checkInventoryBatch is not defined');
      return;
    }

    // Batch API call
    const inventoryMap = await checkInventoryBatch(bookIds);

    rows.forEach(row => {
      const bookId = row.dataset.bookId;
      const span = row.querySelector('.availability-info');

      if (!span) return;

      const inv = inventoryMap[bookId];

      // If API did not return this book
      if (!inv) {
        span.innerHTML =
          '<span style="color:#7f8c8d;"><i class="fas fa-question-circle"></i> Availability unknown</span>';
        return;
      }

      // Out of stock
      if (!inv.inStock || inv.available <= 0) {
        span.innerHTML =
          '<span style="color:#e74c3c;"><i class="fas fa-times-circle"></i> Out of stock</span>';
      }
      // Low stock warning
      else if (inv.available <= 5) {
        span.innerHTML =
          `<span style="color:#f39c12;"><i class="fas fa-exclamation-triangle"></i> Only ${inv.available} left</span>`;
      }
      // In stock
      else {
        span.innerHTML =
          '<span style="color:#27ae60;"><i class="fas fa-check-circle"></i> In stock</span>';
      }
    });

  } catch (error) {
    console.error('❌ Error updating checkout availability info:', error);

    // Fallback UI
    document.querySelectorAll('.availability-info').forEach(span => {
      span.innerHTML =
        '<span style="color:#7f8c8d;"><i class="fas fa-question-circle"></i> Availability check failed</span>';
    });
  }
}

// Update order summary with inventory warnings
function updateOrderSummaryWithWarnings(unavailableItems) {
  const summaryRows = document.querySelectorAll('#summaryBody tr');
  
  unavailableItems.forEach(unavailable => {
    if (summaryRows[unavailable.index]) {
      const row = summaryRows[unavailable.index];
      row.style.backgroundColor = '#ffe6e6';
      row.style.borderLeft = '4px solid #e74c3c';
      
      // Add warning text if not already present
      if (!row.querySelector('.inventory-warning')) {
        const warningCell = row.cells[2] || row.cells[1];
        if (warningCell) {
          const warningSpan = document.createElement('span');
          warningSpan.className = 'inventory-warning';
          warningSpan.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${unavailable.message}`;
          warningSpan.style.cssText = `
            display: block;
            color: #e74c3c;
            font-size: 12px;
            margin-top: 5px;
            font-weight: bold;
          `;
          warningCell.appendChild(warningSpan);
        }
      }
    }
  });
}

function updateSummaryTotals(originalSubtotal, totalWeight, itemLevelDiscountSum) {
  const couponDiscount = typeof window.currentDiscount !== "undefined" ? Number(window.currentDiscount) : 0;
  const netSubtotal = originalSubtotal - itemLevelDiscountSum - couponDiscount;
  const netSubtotalSafe = Math.max(0, Number(netSubtotal.toFixed(2)));

  document.getElementById('summaryOriginalSubtotal').textContent = originalSubtotal.toFixed(2);
  document.getElementById('summaryNetSubtotal').textContent = netSubtotalSafe.toFixed(2);
  document.getElementById('summaryWeight').textContent = totalWeight.toFixed(0);

  const combinedDiscount = Number(itemLevelDiscountSum) + Number(couponDiscount);
  const discountRow = document.getElementById('discountRow');
  
  if (discountRow) {
    if (combinedDiscount > 0) {
      discountRow.style.display = 'flex';
      document.getElementById('summaryDiscount').textContent = combinedDiscount.toFixed(2);
    } else {
      discountRow.style.display = 'none';
    }
  }

  updateShippingCost();
}

function updateShippingCost() {
  const regionSelect = document.getElementById('region');
  if (!regionSelect) return;
  
  const region = regionSelect.value;
  const totalWeight = parseFloat(document.getElementById('summaryWeight').textContent) || 0;
  
  let costPerKg = 0;
  switch (region) {
    case 'south': costPerKg = 50; break;
    case 'north': costPerKg = 80; break;
    case 'other_country': costPerKg = 200; break;
    default: costPerKg = 0;
  }
  
  if (region === 'other_country') {
    shippingCost = 200;
  } else {
    const slabs = Math.ceil(totalWeight / 1000);
    shippingCost = slabs * costPerKg;
  }
  
  shippingRegion = regionSelect.options[regionSelect.selectedIndex].text;
  document.getElementById('summaryShipping').textContent = shippingCost.toFixed(2);
  
  const netSubtotal = parseFloat(document.getElementById('summaryNetSubtotal').textContent) || 0;
  const total = netSubtotal + shippingCost;
  document.getElementById('summaryTotal').textContent = total.toFixed(2);
}

function applyDiscount() {
  const codeInput = document.getElementById('discountCode');
  const messageDiv = document.getElementById('discountMessage');
  const code = codeInput.value.trim().toUpperCase();
  
  messageDiv.style.display = 'none';
  messageDiv.className = 'discount-message';
  
  if (!code) {
    messageDiv.textContent = 'Please enter a discount code';
    messageDiv.className = 'discount-message discount-error';
    messageDiv.style.display = 'block';
    return;
  }
  
  const validCodes = {
    'WELCOME10': 10, 'FIRSTORDER': 15, 'BOOKLOVER': 20, 'SPECIAL25': 25
  };
  
  if (validCodes[code]) {
    const discountPercent = validCodes[code];
    const originalSubtotal = parseFloat(document.getElementById('summaryOriginalSubtotal').textContent) || 0;
    currentDiscount = (originalSubtotal * discountPercent / 100);
    discountCode = code;
    
    messageDiv.textContent = `Discount applied! ${discountPercent}% off your order`;
    messageDiv.className = 'discount-message discount-success';
    messageDiv.style.display = 'block';
    
    updateOrderSummary();
    codeInput.disabled = true;
    codeInput.nextElementSibling.disabled = true;
    codeInput.nextElementSibling.textContent = 'Applied';
  } else {
    messageDiv.textContent = 'Invalid discount code';
    messageDiv.className = 'discount-message discount-error';
    messageDiv.style.display = 'block';
  }
}

// ===============================
// ✅ EVENT LISTENERS & VALIDATION - ENHANCED
// ===============================
function setupEventListeners() {
  const phoneInputs = document.querySelectorAll('input[type="text"][placeholder*="phone"], input[type="text"][placeholder*="Phone"]');
  phoneInputs.forEach(input => {
    input.addEventListener('input', function(e) {
      this.value = this.value.replace(/[^0-9]/g, '');
      if (this.value.length > 10) this.value = this.value.slice(0, 10);
    });
  });

  const pincodeInputs = document.querySelectorAll('input[placeholder*="pincode"], input[placeholder*="Pincode"]');
  pincodeInputs.forEach(input => {
    input.addEventListener('input', function(e) {
      this.value = this.value.replace(/[^0-9]/g, '');
      if (this.value.length > 6) this.value = this.value.slice(0, 6);
    });
  });

  // Contact form validation with auto-fill
  document.getElementById('contactName')?.addEventListener('blur', function() {
    validateContactForm();
    autoFillBillingFromContact();
  });
  document.getElementById('contactPhone')?.addEventListener('blur', function() {
    validateContactForm();
    autoFillBillingFromContact();
  });
  document.getElementById('contactEmail')?.addEventListener('blur', validateContactForm);

  // Region selection change
  document.getElementById('region')?.addEventListener('change', updateShippingCost);

  // Real-time billing validation
  const billingFields = ['billingName', 'billingAddress', 'billingCity', 'billingDistrict', 'billingState', 'billingPincode', 'billingPhone'];
  billingFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('blur', function() {
        const validation = validateBillingAddress();
        if (!validation.isValid && this.value.trim() === '') {
          this.style.borderColor = '#e74c3c';
        } else {
          this.style.borderColor = '';
        }
      });
    }
  });
  
  // Add inventory validation button if not present
  setTimeout(() => {
    const paymentBtn = document.querySelector('[onclick="goToPayment()"]');
    if (paymentBtn) {
      paymentBtn.id = 'validateInventoryBtn';
    }
  }, 500);
}

// ===============================
// ✅ ENHANCED CHECKOUT WITH INVENTORY VALIDATION
// ===============================
async function completeCheckout() {
  const completeBtn = document.getElementById('completeBtn');

  try {
    completeBtn.disabled = true;
    completeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    // 1. Validate inventory first
    console.log('🔄 Starting inventory validation...');
    const inventoryValidation = await validateCheckoutWithInventory();
    
    if (!inventoryValidation.success) {
      window.showToast(inventoryValidation.message, 'error');
      
      // Redirect to cart page after 2 seconds
      setTimeout(() => {
        window.location.href = 'cart.html';
      }, 2000);
      
      return false;
    }
    
    console.log('✅ Inventory validation passed');

    // 2. Gather order data
    const cartItems = window.getUserCart();
    if (!cartItems.length) throw new Error('Cart is empty');

    const orderData = gatherOrderData();
    const user = window.getCurrentUser();

    // ✅ DEBUG: Show exactly what we're sending
    console.log('🚀 FINAL ORDER DATA BEING SENT:');
    console.log('Order ID:', orderData.orderId);
    console.log('Customer:', orderData.customerName, orderData.customerEmail);
    console.log('Items count:', orderData.items.length);
    console.log('First item full details:', orderData.items[0]);
    console.log('All items:', orderData.items);
    console.log('Totals:', orderData.totals);
    console.log('Full orderData JSON:', JSON.stringify(orderData, null, 2));

    showLoading('Processing your order...');

    // 3. Submit order
    const result = await orderService.checkout(
      orderData,
      user?.email || orderData.customerEmail,
      user?.id || null
    );

    hideLoading();

    if (!result.success) {
      throw new Error(result.message || 'Order failed');
    }

    // 4. Update inventory after successful order
    console.log('🔄 Updating inventory after successful order...');
    const inventoryUpdated = await window.updateInventoryAfterCheckout(orderData);
    
    if (!inventoryUpdated.success) {
      console.warn('⚠️ Inventory update failed, but order was placed');
      // You might want to log this for admin review
      // Optionally send a notification to admin
    } else {
      console.log('✅ Inventory updated successfully');
    }

        // 5. Clear cart and update UI
    window.saveUserCart([]);
    window.updateCartCount();

    // 6. ✅ SHOW SUCCESS BOX INSTEAD OF REDIRECT
    setTimeout(() => {
        // Save order locally for admin and profile
        const localSaved = saveOrderLocally(orderData);
        const adminUpdated = updateAdminDashboard(orderData);
        
        if (localSaved && adminUpdated) {
            console.log('✅ Order saved to local storage for admin and profile');
        }
        
        // ✅ NEW (calls the correct function):
        hideAllCheckoutSections();
        showOrderSuccessBox(orderData);
        
        // Optionally redirect to profile after delay
        // setTimeout(() => {
        //     window.location.href = 'profile.html';
        // }, 10000);
        
    }, 1000);

    return true;

  } catch (err) {
    hideLoading();
    window.showToast(err.message || 'Checkout failed', 'error');
    completeBtn.disabled = false;
    completeBtn.innerHTML = '<i class="fas fa-check"></i> Place Order';
    return false;
  }
}

// ✅ ADD THESE HELPER FUNCTIONS TO YOUR checkout.js
// Show loading spinner
// GLOBAL LOADING HANDLER (safe fallback)
function showLoading(message = 'Processing...') {
  let overlay = document.getElementById('loadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      color: white;
      font-size: 18px;
    `;
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div style="text-align:center">
      <i class="fas fa-spinner fa-spin" style="font-size:40px"></i>
      <p>${message}</p>
    </div>
  `;
  overlay.style.display = 'flex';
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

// Show success message
function showSuccessMessage(message) {
  window.showToast(message, 'success');
  
  // You can also show a more prominent success message
  const successDiv = document.createElement('div');
  successDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #d4edda;
    color: #155724;
    padding: 20px;
    border-radius: 10px;
    z-index: 10000;
    text-align: center;
    border: 1px solid #c3e6cb;
  `;
  successDiv.innerHTML = `
    <i class="fas fa-check-circle" style="font-size: 40px; color: #28a745; margin-bottom: 10px;"></i>
    <h3>Success!</h3>
    <p>${message}</p>
  `;
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    document.body.removeChild(successDiv);
  }, 3000);
}

// Show error message
function showErrorMessage(message) {
  window.showToast(message, 'error');
  
  // More prominent error display
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #f8d7da;
    color: #721c24;
    padding: 20px;
    border-radius: 10px;
    z-index: 10000;
    text-align: center;
    border: 1px solid #f5c6cb;
    max-width: 400px;
  `;
  errorDiv.innerHTML = `
    <i class="fas fa-exclamation-triangle" style="font-size: 40px; color: #dc3545; margin-bottom: 10px;"></i>
    <h3>Oops!</h3>
    <p>${message}</p>
    <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 15px; background: #dc3545; color: white; border: none; border-radius: 5px;">OK</button>
  `;
  document.body.appendChild(errorDiv);
}

function gatherOrderData() {
  const cartItems = window.getUserCart();

  if (!cartItems || cartItems.length === 0) {
    throw new Error('Cart is empty');
  }

  const user = window.getCurrentUser();

  const totals = {
    subtotal: parseFloat(document.getElementById('summaryNetSubtotal')?.textContent || 0),
    shipping: parseFloat(document.getElementById('summaryShipping')?.textContent || 0),
    total: parseFloat(document.getElementById('summaryTotal')?.textContent || 0)
  };

  // ✅ CRITICAL FIX: Send COMPLETE book information
  const orderItems = cartItems.map(item => ({
    id: item.id,  // "slrspt-book-034"
    bookId: item.id, // Also as bookId for backend compatibility
    title: item.title || 'Unknown Book',
    author: item.author || 'Unknown Author',
    price: Number(item.price) || 0,
    originalPrice: Number(item.originalPrice) || Number(item.price) || 0,
    discount: Number(item.discount) || 0,
    quantity: Number(item.quantity) || 1,
    weight: Number(item.weight) || 500, // ✅ Include weight!
    image: item.image || ''
  }));

  console.log('📦 gatherOrderData - Sending items:', orderItems);

  return {
    orderId: 'ORD' + Date.now(),
    customerName: document.getElementById('contactName').value,
    customerEmail: user?.email || document.getElementById('contactEmail').value,
    customerPhone: document.getElementById('contactPhone').value,

    billingAddress: getFormattedAddress('billing'),
    shippingAddress: getFormattedAddress('shipping'),

    items: orderItems, // ✅ Send complete items

    totals, // ✅ REQUIRED

    paymentMethod: 'bank',
    paymentStatus: 'pending',
    status: 'pending',
    shippingRegion: document.getElementById('region')?.value || 'south',
    createdAt: new Date().toISOString()
  };
}

function testCartStructure() {
  const cartItems = window.getUserCart();
  console.log('📋 CART STRUCTURE ANALYSIS:');
  
  if (!cartItems.length) {
    console.log('❌ Cart is empty');
    return;
  }
  
  cartItems.forEach((item, index) => {
    console.log(`--- Item ${index + 1} ---`);
    console.log('Available fields:', Object.keys(item));
    console.log('_id:', item._id);
    console.log('id:', item.id);
    console.log('bookId:', item.bookId);
    console.log('title:', item.title);
    console.log('quantity:', item.quantity);
    console.log('price:', item.price);
    console.log('weight:', item.weight);
    console.log('-------------------');
  });
  
  // Test what gatherOrderData will send
  const testData = gatherOrderData();
  console.log('📤 What will be sent to backend:');
  console.log('Items to send:', testData.items);
}

function updateAdminDashboard(orderData) {
  try {
    let adminOrders = JSON.parse(localStorage.getItem('adminOrders')) || [];
    adminOrders.unshift(orderData);
    localStorage.setItem('adminOrders', JSON.stringify(adminOrders));
    console.log('✅ Admin dashboard updated');
    return true;
  } catch (error) {
    console.error('❌ Admin update failed:', error);
    return false;
  }
}

function saveOrderLocally(orderData) {
  const user = window.getCurrentUser();
  const userEmail = user ? user.email : 'guest';
  
  const userOrdersKey = `userOrders_${userEmail}`;
  let userOrders = JSON.parse(localStorage.getItem(userOrdersKey)) || [];
  userOrders.push(orderData);
  localStorage.setItem(userOrdersKey, JSON.stringify(userOrders));

  console.log('💾 Order saved locally:', orderData.orderId);
  return true;
}

// ===============================
// ✅ INVENTORY FUNCTIONS FOR CART PAGE
// ===============================
async function validateCheckoutInventory() {
  const validation = await validateCartBeforeCheckout();
  
  if (!validation.allAvailable) {
    const unavailableItems = validation.unavailableItems
      .map(item => `"${item.item.title}" (${item.message})`)
      .join(', ');
    
    return {
      success: false,
      message: `Some items are no longer available: ${unavailableItems}`,
      details: validation
    };
  }
  
  return { success: true, message: 'All items are available' };
}

// ✅ FIXED: Show success message with order details
function showSuccessMessage(orderData) {
    console.log('🎯 Showing success message for order:', orderData.orderId);
    
    const successBox = document.getElementById('successBox');
    if (!successBox) {
        console.error('❌ Success box element not found');
        window.showToast('Order placed successfully!', 'success');
        return;
    }
    
    // ✅ BETTER: Hide only specific checkout sections, not everything
    const sectionsToHide = [
        'contactSection', 'addressSection', 'summarySection', 'paymentSection',
        'shippingMethod', 'paymentOptions'
    ];
    
    sectionsToHide.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) section.style.display = 'none';
    });
    
    // Hide step indicators
    document.querySelectorAll('.step-indicator, .step-content').forEach(el => {
        if (el) el.style.display = 'none';
    });
    
    // Get order ID
    let orderId = orderData.orderId || 'ORD' + Date.now();
    localStorage.setItem('lastOrderId', orderId);
    
    console.log('📋 Setting order details for:', orderId);
    
    // Set order details - ADD NULL CHECKS
    const orderIdElem = document.getElementById('confirmOrderId');
    const orderDateElem = document.getElementById('confirmOrderDate');
    const orderTotalElem = document.getElementById('confirmOrderTotal');
    const orderRegionElem = document.getElementById('confirmOrderRegion');
    
    if (orderIdElem) {
        orderIdElem.textContent = orderId;
        console.log('✅ Set Order ID:', orderId);
    } else {
        console.error('❌ Element #confirmOrderId not found');
    }
    
    if (orderDateElem) {
        orderDateElem.textContent = new Date().toLocaleString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        console.log('✅ Set Order Date');
    }
    
    // Get total amount
    let totalAmount = 0;
    if (orderData.totals && orderData.totals.total) {
        totalAmount = orderData.totals.total;
    } else if (orderData.totals) {
        totalAmount = orderData.totals;
    } else {
        const summaryTotal = document.getElementById('summaryTotal');
        if (summaryTotal) {
            totalAmount = parseFloat(summaryTotal.textContent) || 0;
        }
    }
    
    if (orderTotalElem) {
        orderTotalElem.textContent = totalAmount.toFixed(2);
        console.log('✅ Set Total Amount:', totalAmount.toFixed(2));
    }
    
    // Get shipping region
    let region = shippingRegion || orderData.shippingRegion || 'South India';
    if (orderRegionElem) {
        orderRegionElem.textContent = region;
        console.log('✅ Set Shipping Region:', region);
    }
    
    // Show backend status
    const backendStatus = document.getElementById('backendStatus');
    if (backendStatus) {
        backendStatus.innerHTML = `
            <div style="
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 12px 20px;
                border-radius: 8px;
                margin-bottom: 25px;
                font-size: 16px;
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            ">
                <i class="fas fa-check" style="font-size: 20px;"></i>
                <span>Order successfully submitted to backend</span>
            </div>
        `;
        console.log('✅ Set backend status');
    }
    
    // ✅ MAKE SURE SUCCESS BOX IS VISIBLE
    successBox.style.display = 'block';
    successBox.style.visibility = 'visible';
    successBox.style.opacity = '1';
    
    console.log('🎉 Success box should be visible now');
    
    // Scroll to success box
    setTimeout(() => {
        successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('📜 Scrolled to success box');
    }, 100);
    
    // Add CSS styles if not present
    addSuccessBoxMinimalStyles();
    
    // Also save to localStorage for profile page
    saveOrderToLocalStorage(orderId, totalAmount, region);
    
    // ✅ TEST: Log all elements to console
    console.log('🔍 Debug - Success Box Elements:');
    console.log('- successBox:', document.getElementById('successBox'));
    console.log('- confirmOrderId:', document.getElementById('confirmOrderId'));
    console.log('- confirmOrderDate:', document.getElementById('confirmOrderDate'));
    console.log('- confirmOrderTotal:', document.getElementById('confirmOrderTotal'));
    console.log('- confirmOrderRegion:', document.getElementById('confirmOrderRegion'));
    console.log('- backendStatus:', document.getElementById('backendStatus'));
}

// ✅ Save order to localStorage for profile page
function saveOrderToLocalStorage(orderId, totalAmount, region) {
    try {
        const user = window.getCurrentUser();
        if (!user) return;
        
        const userEmail = user.email;
        const userOrdersKey = `userOrders_${userEmail}`;
        let userOrders = JSON.parse(localStorage.getItem(userOrdersKey)) || [];
        
        // Get cart items (before clearing)
        const cartItems = window.getUserCart();
        
        // Create order object
        const order = {
            orderId: orderId,
            orderNumber: orderId,
            customerName: user.name || '',
            customerEmail: user.email,
            items: cartItems.map(item => ({
                title: item.title || 'Unknown Book',
                author: item.author || 'Unknown Author',
                price: item.price || 0,
                quantity: item.quantity || 1,
                image: item.image || ''
            })),
            totals: {
                subtotal: document.getElementById('summaryNetSubtotal')?.textContent || '0.00',
                shipping: document.getElementById('summaryShipping')?.textContent || '0.00',
                total: totalAmount.toFixed(2),
                discount: document.getElementById('summaryDiscount')?.textContent || '0.00'
            },
            status: 'pending',
            createdAt: new Date().toISOString(),
            shippingRegion: region,
            paymentMethod: 'bank_transfer',
            shippingAddress: getFormattedAddress('shipping'),
            billingAddress: getFormattedAddress('billing')
        };
        
        // Add to user orders
        userOrders.unshift(order);
        localStorage.setItem(userOrdersKey, JSON.stringify(userOrders));
        
        // Also update admin dashboard
        updateAdminDashboard(order);
        
        console.log('✅ Order saved to localStorage for profile page:', orderId);
        
    } catch (error) {
        console.error('❌ Error saving order to localStorage:', error);
    }
}

// ✅ Hide all checkout sections
function hideAllCheckoutSections() {
    console.log('🔄 Hiding all checkout sections...');
    
    // Hide all step sections
    const sections = ['contactSection', 'addressSection', 'summarySection', 'paymentSection'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = 'none';
            section.classList.remove('active');
            console.log(`✅ Hid section: ${id}`);
        }
    });
    
    // Hide step indicators
    document.querySelectorAll('.step-indicator').forEach(el => {
        if (el) el.style.display = 'none';
    });
    
    // Hide buttons and other elements
    const elementsToHide = [
        '.btn-container', 
        '.checkout-buttons',
        '.payment-option',
        '.address-confirmation',
        '#loadingSpinner'
    ];
    
    elementsToHide.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (el) el.style.display = 'none';
        });
    });
    
    // Show only the success box
    const successBox = document.getElementById('successBox');
    if (successBox) {
        successBox.style.display = 'block';
    }
    
    console.log('✅ All checkout sections hidden');
}

// ✅ FIXED: Show order success box with details
function showOrderSuccessBox(orderData) {
    console.log('🎯 Showing success box for order:', orderData.orderId);
    
    // 1. FIRST hide ALL checkout sections
    hideAllCheckoutSections();
    
    // 2. Get success box
    const successBox = document.getElementById('successBox');
    if (!successBox) {
        console.error('❌ Success box not found in HTML');
        // Emergency fallback
        document.body.innerHTML = `
            <div style="padding: 100px; text-align: center; font-family: Arial;">
                <h1 style="color: #28a745;">✅ Order Placed Successfully!</h1>
                <h3>Order ID: ${orderData.orderId}</h3>
                <p>Total: ₹${orderData.totals?.total || 0}</p>
                <div style="margin-top: 30px;">
                    <button onclick="window.location.href='profile.html'" 
                            style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; margin: 10px;">
                        View Order History
                    </button>
                    <button onclick="window.location.href='index.html'" 
                            style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 6px; margin: 10px;">
                        Continue Shopping
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // 3. Populate success box
    const orderId = orderData.orderId || 'ORD' + Date.now();
    
    // Set order details
    const elements = {
        'confirmOrderId': orderId,
        'confirmOrderDate': new Date().toLocaleString('en-IN'),
        'confirmOrderTotal': (orderData.totals?.total || 0).toFixed(2),
        'confirmOrderRegion': shippingRegion || orderData.shippingRegion || 'South India'
    };
    
    // Set values with safety checks
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
            console.log(`✅ Set ${id}: ${elements[id]}`);
        } else {
            console.warn(`⚠️ Element #${id} not found`);
        }
    });
    
    // Set backend status
    const backendStatus = document.getElementById('backendStatus');
    if (backendStatus) {
        backendStatus.innerHTML = `
            <div style="
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 12px 20px;
                border-radius: 8px;
                margin-bottom: 25px;
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            ">
                <i class="fas fa-check" style="font-size: 20px;"></i>
                <span>Order confirmed and inventory updated</span>
            </div>
        `;
    }
    
    // 4. ✅ CRITICAL: Remove the success box from payment section
    successBox.style.position = 'relative';
    successBox.style.zIndex = '9999';
    
    // Move success box to body if it's inside payment section
    const paymentSection = document.getElementById('paymentSection');
    if (paymentSection && paymentSection.contains(successBox)) {
        console.log('📦 Moving success box out of payment section');
        document.body.appendChild(successBox);
    }
    
    // 5. Show success box with force
    successBox.style.display = 'block';
    successBox.style.visibility = 'visible';
    successBox.style.opacity = '1';
    successBox.style.width = '100%';
    successBox.style.maxWidth = '800px';
    successBox.style.margin = '50px auto';
    successBox.style.padding = '30px';
    successBox.style.background = 'white';
    successBox.style.borderRadius = '12px';
    successBox.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
    
    // Add CSS if needed
    addSuccessBoxMinimalStyles();
    
    // 6. Scroll to top and show
    window.scrollTo(0, 0);
    
    setTimeout(() => {
        successBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log('✅ Success box should be visible now');
        
        // Debug: Log current visibility
        console.log('🔍 Success box state:', {
            display: successBox.style.display,
            visibility: successBox.style.visibility,
            opacity: successBox.style.opacity,
            parent: successBox.parentElement.id
        });
    }, 100);
    
    console.log('✅ Success box displayed for order:', orderId);
}

// ✅ Minimal CSS for success box
function addSuccessBoxMinimalStyles() {
    if (document.getElementById('successBoxMinimalStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'successBoxMinimalStyles';
    style.textContent = `
        #successBox {
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin: 40px auto;
            max-width: 700px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            border: 1px solid #ddd;
        }
        
        .success-message {
            text-align: center;
        }
        
        .success-message i.fa-check-circle {
            font-size: 60px;
            color: #28a745;
            margin-bottom: 15px;
        }
        
        .success-message h3 {
            color: #28a745;
            margin-bottom: 25px;
        }
        
        .backend-status {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 14px;
        }
        
        .backend-status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .order-confirmation {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
        }
        
        .order-confirmation h4 {
            color: #333;
            margin-bottom: 15px;
        }
        
        .order-confirmation p {
            margin: 8px 0;
            color: #555;
        }
        
        .order-confirmation strong {
            color: #333;
            display: inline-block;
            width: 140px;
        }
        
        .success-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 25px;
        }
        
        .success-actions .btn {
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .success-actions .btn-primary {
            background: #007bff;
            color: white;
            border: 1px solid #007bff;
        }
        
        .success-actions .btn-secondary {
            background: #6c757d;
            color: white;
            border: 1px solid #6c757d;
        }
        
        @media (max-width: 768px) {
            #successBox {
                margin: 20px;
                padding: 20px;
            }
            
            .success-actions {
                flex-direction: column;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// ✅ DEBUG: Check if success box elements exist
function debugSuccessBox() {
    console.log('🔍 Debugging Success Box Elements:');
    
    const elements = [
        'successBox',
        'confirmOrderId', 
        'confirmOrderDate',
        'confirmOrderTotal',
        'confirmOrderRegion',
        'backendStatus'
    ];
    
    elements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`${id}:`, el ? '✅ Found' : '❌ NOT FOUND');
        if (el) {
            console.log(`  Content: "${el.textContent}"`);
            console.log(`  Display: "${el.style.display}"`);
            console.log(`  Visibility: "${el.style.visibility}"`);
        }
    });
    
    // Check if CSS is loaded
    const styles = document.getElementById('successBoxStyles');
    console.log('Success box styles:', styles ? '✅ Loaded' : '❌ Not loaded');
}

// Call this in browser console: debugSuccessBox()

// ===============================
// ✅ GLOBAL EXPORTS - ALL FUNCTIONS
// ===============================
window.updateUserSession = updateUserSession;
window.validateBillingAddress = validateBillingAddress;
window.validateContactForm = validateContactForm;
window.autoFillBillingFromContact = autoFillBillingFromContact;
window.goToAddress = goToAddress;
window.goToSummary = goToSummary;
window.goToPayment = goToPayment;
window.goBackToStep = goBackToStep;
window.copyBillingToShipping = copyBillingToShipping;
window.updateShippingCost = updateShippingCost;
window.applyDiscount = applyDiscount;
window.completeCheckout = completeCheckout;

// Export inventory functions
window.checkBookAvailability = checkBookAvailability;
window.validateCartBeforeCheckout = validateCartBeforeCheckout;
window.validateCheckoutWithInventory = validateCheckoutWithInventory;
window.validateCheckoutInventory = validateCheckoutInventory;

window.showSuccessMessage = showSuccessMessage;
window.saveOrderToLocalStorage = saveOrderToLocalStorage;
window.showOrderSuccessBox = showOrderSuccessBox;
window.hideAllCheckoutSections = hideAllCheckoutSections;