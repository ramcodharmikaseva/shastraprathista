// app.js - Books page specific functionality
// Wrap in IIFE to avoid variable conflicts with common.js
(function () {
  'use strict';

  // ===============================
  // STATE
  // ===============================
  let allBooks = [];
  let filteredBooks = [];
  let currentPage = 1;
  const booksPerPage = 12;

  // ===============================
  // DOM ELEMENTS
  // ===============================
  const bookGridContainer = document.getElementById('book-grid-container');
  const paginationElement = document.getElementById('pagination');
  const bookDetailModal = document.getElementById('book-detail-modal');
  const modalContent = document.getElementById('modal-content');
  const closeModalBtn = document.getElementById('close-modal');
  const searchInput = document.getElementById('book-search');
  const searchBtn = document.getElementById('search-btn');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const zoomOverlay = document.getElementById('zoom-overlay');
  const zoomImg = document.getElementById('zoom-img');

  // ❗ Exit if not books page
  if (!bookGridContainer) {
    console.warn('📕 app.js skipped (not books page)');
    return;
  }

  // ===============================
  // CONSTANTS
  // ===============================
  const INVENTORY_API = window.INVENTORY_API || window.location.origin + '/api/inventory';

  // ===============================
  // UTILITIES
  // ===============================
  function calculateDiscountedPrice(price, discount) {
    if (!discount || discount <= 0) return price;
    return Math.round(price - (price * discount) / 100);
  }

  function formatPrice(price) {
    if (!price || isNaN(price)) return 'Rs. 0';
    return 'Rs. ' + price.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function announceToScreenReader(message) {
    const announcer = document.getElementById('sr-announcements');
    if (announcer) {
      announcer.textContent = message;
      setTimeout(() => announcer.textContent = '', 100);
    }
  }

  function handleImageError(img, title) {
    if (!img || !img.parentNode) return;
    
    img.style.display = 'none';
    const placeholder = document.createElement('div');
    placeholder.className = 'img-placeholder';
    const safeTitle = title.replace(/['"<>]/g, '');
    placeholder.innerHTML = `<i class="fas fa-book"></i><div>${safeTitle}</div>`;
    img.parentNode.appendChild(placeholder);
  }

  // ===============================
  // LOAD BOOKS FROM BACKEND
  // ===============================
  async function loadBooksFromBackend() {
    try {
      console.log('📚 Loading books from backend...');
      announceToScreenReader('Loading books...');

      // Show loading state
      bookGridContainer.innerHTML = `
        <div class="loading">
          <div class="loading-dots">
            <div></div><div></div><div></div><div></div>
          </div>
        </div>
      `;

      const response = await fetch('/api/books');

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        console.warn('⚠️ API returned unexpected format:', data);
        allBooks = [];
      } else {
        // Normalize book data
        allBooks = data.map(book => ({
          ...book,
          id: book._id,   // ALWAYS MongoDB _id
          title: book.title || 'Untitled Book',
          author: book.author || 'Unknown Author',
          price: Number(book.price) || 0,
          discount: Number(book.discount) || 0,
          images: (Array.isArray(book.images) && book.images.length > 0)
            ? book.images
            : ['images/no-book.png'],

          specs: book.specs || {},
          description: book.description || '',
          stock: book.stock || 0
        }));
      }

      filteredBooks = [...allBooks];
      currentPage = 1;

      console.log(`✅ Loaded ${allBooks.length} books from MongoDB`);
      announceToScreenReader(`Loaded ${allBooks.length} books`);

      if (allBooks.length === 0) {
        bookGridContainer.innerHTML =
          `<div class="no-results">No books available</div>`;
        return;
      }

      renderBooks();

    } catch (err) {
      console.error('❌ Failed to load books:', err);
      announceToScreenReader('Failed to load books. Please try again.');

      bookGridContainer.innerHTML = `
        <div class="no-results">
          Unable to load books.<br>
          Please try again later.
        </div>
      `;
    }
  }

  // ===============================
  // SEARCH & FILTER
  // ===============================
  function handleSearch() {
    const term = searchInput.value.toLowerCase().trim();
    filteredBooks = term
      ? allBooks.filter(b =>
          b.title.toLowerCase().includes(term) ||
          (b.author && b.author.toLowerCase().includes(term)) ||
          (b.description && b.description.toLowerCase().includes(term))
        )
      : [...allBooks];
    
    currentPage = 1;
    renderBooks();
    announceToScreenReader(`Found ${filteredBooks.length} books`);
  }

  function applyFilter(filter) {
    // Update active button
    filterButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    let filterName = '';
    switch (filter) {
      case 'all':
        filteredBooks = [...allBooks];
        filterName = 'all books';
        break;
      case 'author-Smt Sudarsanam':
        filteredBooks = allBooks.filter(b => 
          b.author && b.author.toLowerCase().includes('sudarsanam')
        );
        filterName = 'books by Smt Sudarsanam';
        break;
      case 'author-Sri Gnanananda':
        filteredBooks = allBooks.filter(b => 
          b.author && b.author.toLowerCase().includes('gnanananda')
        );
        filterName = 'books by Sri Gnanananda';
        break;
      case 'author-Sringeri':
        filteredBooks = allBooks.filter(b => 
          b.author && b.author.toLowerCase().includes('sringeri')
        );
        filterName = 'books by Sringeri Mutt';
        break;
      case 'discount':
        filteredBooks = allBooks.filter(b => b.discount > 0);
        filterName = 'discounted books';
        break;
      case 'price-low':
        filteredBooks = [...allBooks].sort(
          (a, b) =>
            calculateDiscountedPrice(a.price, a.discount) -
            calculateDiscountedPrice(b.price, b.discount)
        );
        filterName = 'price: low to high';
        break;
      case 'price-high':
        filteredBooks = [...allBooks].sort(
          (a, b) =>
            calculateDiscountedPrice(b.price, b.discount) -
            calculateDiscountedPrice(a.price, a.discount)
        );
        filterName = 'price: high to low';
        break;
      default:
        filteredBooks = [...allBooks];
        filterName = 'all books';
    }
    
    currentPage = 1;
    renderBooks();
    announceToScreenReader(`Showing ${filterName}`);
  }

  // ===============================
  // RENDER BOOK GRID
  // ===============================
  function renderBooks() {
    if (!bookGridContainer || !paginationElement) {
      console.warn('⚠️ Missing DOM elements for rendering books');
      return;
    }

    if (!Array.isArray(filteredBooks) || filteredBooks.length === 0) {
      bookGridContainer.innerHTML = '<div class="no-results">No books found</div>';
      paginationElement.innerHTML = '';
      announceToScreenReader('No books found');
      return;
    }

    const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
    const start = (currentPage - 1) * booksPerPage;
    const booksToShow = filteredBooks.slice(start, start + booksPerPage);

    bookGridContainer.innerHTML = booksToShow.map(book => {

      const bookKey = book._id; // ✅ always MongoDB id
      const title = book.title || 'Untitled Book';
      const author = book.author || 'Unknown Author';

      // ✅ image path fix
      const cover = (Array.isArray(book.images) && book.images.length > 0)
        ? `/${book.images[0]}`
        : '/images/no-book.png';

      const price = calculateDiscountedPrice(
        Number(book.price) || 0,
        Number(book.discount) || 0
      );

      const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');

      return `
        <div class="book-card"
          data-id="${book._id}"
          aria-label="${title} by ${author}, Price: ${formatPrice(price)}">

          ${book.discount ? `<div class="discount-badge">${book.discount}% OFF</div>` : ''}

          <div class="book-img-container">
            <img 
              src="${cover}" 
              class="book-img"
              alt="${title}"
              loading="lazy"
              onerror="this.onerror=null;this.src='/images/no-book.png';"
            >
          </div>

          <h3 class="book-title">${title}</h3>
          <p class="book-author">${author}</p>

          <div class="book-price">
            ${book.discount ? `<span class="original-price">${formatPrice(book.price)}</span>` : ''}
            <span class="discounted-price">${formatPrice(price)}</span>
          </div>

          <button class="view-btn" onclick="window.openBookDetail('${book._id}')">
            View
          </button>
        </div>
      `;
    }).join('');

    renderPagination(totalPages);

    announceToScreenReader(`Showing page ${currentPage} of ${totalPages}`);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      paginationElement.innerHTML = '';
      return;
    }

    paginationElement.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const button = document.createElement('button');
      button.textContent = i;
      button.className = i === currentPage ? 'active' : '';
      button.setAttribute('aria-label', `Go to page ${i}`);
      button.setAttribute('aria-current', i === currentPage ? 'page' : 'false');
      button.addEventListener('click', () => changePage(i));
      paginationElement.appendChild(button);
    }
  }

  function changePage(page) {
    currentPage = page;
    renderBooks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===============================
  // MODAL FUNCTIONS - FIXED VERSION
  // ===============================
  async function openBookDetail(bookKey) {
    const book = allBooks.find(b => b._id === bookKey);
    if (!book) return;

    const images = (Array.isArray(book.images) && book.images.length > 0)
      ? book.images
      : ['images/no-book.png'];
    const mainImage = images[0];
    const totalImages = images.length;
    const price = calculateDiscountedPrice(book.price, book.discount);
    
    // ✅ Calculate weight display for modal
    const weightGrams = book.weight || book.specs?.weight || 500;
    const weightDisplay = weightGrams >= 1000 
      ? `${(weightGrams/1000).toFixed(1)} kg` 
      : `${weightGrams} g`;

    // ✅ Get ISBN from book data
    const isbn = book.isbn || book.specs?.isbn || '';
    
    // In openBookDetail function, update the inventory check section:
    let availability = {
      available: 0, // START WITH 0, not 10
      canPurchase: false,
      bookTitle: book.title,
      message: 'Checking...'
    };

    let maxQuantity = 0; // START WITH 0

    try {
      availability = await window.checkBookAvailability(bookKey);
      
      // Check if there was an API error
      if (availability.apiError || availability.error) {
        console.warn(`⚠️ Inventory API error for ${book.title}, showing as unavailable`);
        maxQuantity = 0;
        availability.available = 0;
        availability.canPurchase = false;
        availability.message = 'Unable to check stock';
      } else {
        // Set max quantity to available stock (capped at 10 per order)
        maxQuantity = Math.min(availability.available, 10);
        
        console.log(`📦 Modal inventory for ${book.title}:`, {
          available: availability.available,
          maxAllowed: maxQuantity
        });
      }
    } catch (error) {
      console.warn('Failed to check inventory for modal:', error);
      // Default to unavailable
      availability.available = 0;
      availability.canPurchase = false;
      availability.message = 'Unable to check stock';
      maxQuantity = 0;
    }
    
    const stockStatusClass = availability.available <= 0 ? 'out-of-stock' : 
                            availability.available <= 5 ? 'low-stock' : 'in-stock';
    const stockStatusText = availability.available <= 0 ? 'Out of Stock' : 
                          availability.available <= 5 ? `Only ${availability.available} left` : 'In Stock';

    // Generate thumbnails
    const thumbs = images.map((img, i) => {
      const safeImg = encodeURI(img);
      return `
        <button class="thumb ${i === 0 ? 'active' : ''}" 
          data-index="${i}"
          data-image="${safeImg}"
          onclick="window.changeMainImageByIndex(${i})"
          aria-label="View image ${i + 1} of ${totalImages}">
          ${totalImages > 1 ? `<span class="image-count">${i + 1}</span>` : ''}
          <img src="${img}" 
              alt="Thumbnail ${i + 1}" 
              onerror="this.onerror=null; this.src='images/no-book.png'; this.parentElement.classList.add('no-thumb');">
        </button>
      `;
    }).join('');

    // Generate slider dots
    const sliderDots = totalImages > 1 ? 
      Array.from({ length: totalImages }, (_, i) => 
        `<button class="slider-dot ${i === 0 ? 'active' : ''}" 
                data-index="${i}"
                onclick="window.goToSlide(${i})"
                aria-label="Go to image ${i + 1}"></button>`
      ).join('') : '';

    modalContent.innerHTML = `
      <div class="modal-left-panel ${totalImages <= 1 ? 'single-image' : ''}">
        <div class="main-image-container">
          ${totalImages > 1 ? `
            <div class="image-counter">
              <i class="fas fa-images"></i>
              <span>1 / ${totalImages}</span>
            </div>
            <button class="image-nav prev ${totalImages <= 1 ? 'hidden' : ''}" 
                    onclick="window.prevSlide()"
                    aria-label="Previous image">❮</button>
            <button class="image-nav next ${totalImages <= 1 ? 'hidden' : ''}" 
                    onclick="window.nextSlide()"
                    aria-label="Next image">❯</button>
          ` : ''}
          
          <img src="${mainImage}" 
              class="main-book-img fade-in" 
              id="main-book-image"
              onclick="window.toggleZoom()" 
              alt="${book.title} cover"
              data-current-index="0"
              tabindex="0">
          
          ${totalImages > 1 ? `
            <div class="slider-controls">
              ${sliderDots}
            </div>
            <div class="zoom-indicator">
              <i class="fas fa-search-plus"></i>
              Click to zoom
            </div>
          ` : ''}
        </div>
        
        ${totalImages > 1 ? `
          <div class="thumbnails-container">
            ${thumbs}
          </div>
        ` : ''}
      </div>

      <div class="modal-right-panel">
        <h2>${book.title}</h2>

        <p><strong>Author:</strong> ${book.author}</p>

        ${isbn ? `<p><strong>ISBN:</strong> ${isbn}</p>` : ''}

        <div class="price-container">
          ${book.discount
            ? `<span class="original-price">${formatPrice(book.price)}</span>`
            : ''}
          <span class="discounted-price">${formatPrice(price)}</span>
          
          <!-- ✅ STOCK STATUS IN MODAL -->
          <div class="stock-status ${stockStatusClass}" style="margin-top: 8px;">
            <i class="fas fa-${availability.available <= 0 ? 'times-circle' : 
                              availability.available <= 5 ? 'exclamation-triangle' : 'check-circle'}"></i>
            ${stockStatusText}
          </div>
        </div>

        <!-- ✅ WEIGHT SHOWS ONLY IN MODAL -->
        <div class="specs">
          <p><strong>Publisher:</strong> ${book.specs?.publisher || book.publisher || '-'}</p>
          <p><strong>Language:</strong> ${book.specs?.language || book.language || '-'}</p>
          <p><strong>Pages:</strong> ${book.specs?.pages || book.pages || '-'}</p>
          <p><strong>Size:</strong> ${book.specs?.size || book.size || '-'}</p>
          <p><strong>Weight:</strong> ${weightDisplay}</p>
        </div>

        <!-- QUANTITY SECTION WITH INVENTORY LIMITS -->
        <div class="quantity-section">
          <label for="modal-qty"><strong>Quantity</strong></label>
          <div class="quantity-controls">
            <button class="qty-btn minus" onclick="decreaseModalQty('${bookKey}')" ${availability.available <= 0 ? 'disabled' : ''}>-</button>
            <input type="number" 
                  id="modal-qty" 
                  value="1" 
                  min="1" 
                  max="${maxQuantity}" 
                  class="qty-input"
                  onchange="validateModalQty('${bookKey}')"
                  ${availability.available <= 0 ? 'disabled' : ''}>
            <button class="qty-btn plus" onclick="increaseModalQty('${bookKey}')" ${availability.available <= 0 ? 'disabled' : ''}>+</button>
          </div>
          <small style="display: block; color: #666; margin-top: 5px;">
            ${availability.available <= 0 ? 'Out of stock' : 
              maxQuantity === 1 ? 'Only 1 copy available' :
              `Maximum: ${maxQuantity} items available`}
          </small>
        </div>

        <!-- ACTION BUTTONS -->
        <div class="modal-buttons">
          <button class="add-btn"
            onclick="window.addToCartModal('${bookKey}')"
            ${availability.available <= 0 ? 'disabled' : ''}>
            🛒 ${availability.available <= 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>

          <button class="buy-btn"
            onclick="window.buyNowModal('${bookKey}')"
            ${availability.available <= 0 ? 'disabled' : ''}>
            ⚡ ${availability.available <= 0 ? 'Unavailable' : 'Buy Now'}
          </button>
        </div>

        <div class="book-description">
          <h3>Description</h3>
          <p>${book.description || book.specs?.description || 'No description available.'}</p>
        </div>
      </div>
    `;

    // Store current book data for quantity controls
    window.currentBookData = {
      id: bookKey,
      available: availability.available,
      maxQuantity: maxQuantity,
      title: book.title
    };

    // Store current book images globally for slider navigation
    window.currentBookImages = images;
    window.currentImageIndex = 0;

    bookDetailModal.style.display = 'flex';
    bookDetailModal.setAttribute('aria-hidden', 'false');
    
    // Focus first element
    const focusableElements = bookDetailModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  // Add these quantity control functions for the modal
  function increaseModalQty(bookKey) {
    const qtyInput = document.getElementById('modal-qty');
    if (!qtyInput || qtyInput.disabled) return;
    
    const currentQty = parseInt(qtyInput.value);
    const maxQty = parseInt(qtyInput.max);
    
    if (currentQty < maxQty) {
      qtyInput.value = currentQty + 1;
      validateModalQty(bookKey);
    } else {
      window.showToast(`Maximum ${maxQty} items available`, 'warning');
    }
  }

  function decreaseModalQty(bookKey) {
    const qtyInput = document.getElementById('modal-qty');
    if (!qtyInput || qtyInput.disabled) return;
    
    const currentQty = parseInt(qtyInput.value);
    const minQty = parseInt(qtyInput.min);
    
    if (currentQty > minQty) {
      qtyInput.value = currentQty - 1;
      validateModalQty(bookKey);
    }
  }

  function validateModalQty(bookKey) {
    const qtyInput = document.getElementById('modal-qty');
    if (!qtyInput) return;
    
    const currentQty = parseInt(qtyInput.value);
    const minQty = parseInt(qtyInput.min);
    const maxQty = parseInt(qtyInput.max);
    
    if (isNaN(currentQty) || currentQty < minQty) {
      qtyInput.value = minQty;
    } else if (currentQty > maxQty) {
      qtyInput.value = maxQty;
      window.showToast(`Maximum ${maxQty} items available`, 'warning');
    }
  }

  // Update the modal CSS for quantity controls
  function updateModalStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .quantity-controls {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
      }
      
      .qty-btn {
        width: 36px;
        height: 36px;
        border: 1px solid #ddd;
        background: #f8f9fa;
        border-radius: 4px;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      
      .qty-btn:hover:not(:disabled) {
        background: #e9ecef;
        border-color: #ccc;
      }
      
      .qty-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .qty-input {
        width: 60px;
        text-align: center;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;
      }
      
      .qty-input:disabled {
        background: #f5f5f5;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);
  }

  // Call this when app.js initializes
  updateModalStyles();

  // Create a wrapper for inline onclick (since async doesn't work in inline)
  function openBookDetailWrapper(bookKey) {
    openBookDetail(bookKey).catch(error => {
      console.error('Error opening book detail:', error);
      window.showToast('Failed to load book details', 'error');
    });
  }

  // ===============================
  // SLIDER FUNCTIONS
  // ===============================
  function nextSlide() {
    const images = window.currentBookImages;
    if (!images || images.length <= 1) return;
    
    const currentIndex = window.currentImageIndex || 0;
    const nextIndex = (currentIndex + 1) % images.length;
    
    goToSlide(nextIndex);
  }

  function prevSlide() {
    const images = window.currentBookImages;
    if (!images || images.length <= 1) return;
    
    const currentIndex = window.currentImageIndex || 0;
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    
    goToSlide(prevIndex);
  }

  function goToSlide(index) {
    const images = window.currentBookImages;
    if (!images || index < 0 || index >= images.length) return;
    
    const mainImg = document.getElementById('main-book-image');
    const sliderDots = document.querySelectorAll('.slider-dot');
    const thumbs = document.querySelectorAll('.thumb');
    const imageCounter = document.querySelector('.image-counter span');
    
    if (!mainImg) return;
    
    // Update current index
    window.currentImageIndex = index;
    
    // Add fade-out effect
    mainImg.classList.remove('fade-in');
    mainImg.classList.add('fade-out');
    
    // Update after fade out
    setTimeout(() => {
      mainImg.src = images[index];
      mainImg.alt = `Book image ${index + 1}`;
      mainImg.dataset.currentIndex = index;
      
      // Remove fade-out, add fade-in
      mainImg.classList.remove('fade-out');
      mainImg.classList.add('fade-in');
      
      // Update active states
      sliderDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
      
      thumbs.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
        // Scroll active thumbnail into view
        if (i === index) {
          thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      });
      
      // Update image counter
      if (imageCounter) {
        imageCounter.textContent = `${index + 1} / ${images.length}`;
      }
      
      // Announce to screen reader
      announceToScreenReader(`Image ${index + 1} of ${images.length}`);
      
    }, 200); // Match the CSS transition duration
  }

  function changeMainImageByIndex(index) {
    goToSlide(index);
  }

  // Add keyboard navigation
  function handleKeyboardNavigation(e) {
    if (!bookDetailModal || bookDetailModal.style.display !== 'flex') return;
    
    const images = window.currentBookImages;
    if (!images || images.length <= 1) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        prevSlide();
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextSlide();
        break;
      case 'Home':
        e.preventDefault();
        goToSlide(0);
        break;
      case 'End':
        e.preventDefault();
        goToSlide(images.length - 1);
        break;
    }
  }

  function closeBookDetail() {
    bookDetailModal.style.display = 'none';
    bookDetailModal.setAttribute('aria-hidden', 'true');
  }

  function changeMainImage(el, src) {
    const mainImg = document.querySelector('.main-book-img');
    if (mainImg) {
      mainImg.src = src;
    }
    
    // Update active thumbnail
    document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
    if (el) {
      el.classList.add('active');
    }
    
    // Update slider dots if they exist
    const sliderDots = document.querySelectorAll('.slider-dot');
    if (sliderDots.length > 0 && el) {
      const index = parseInt(el.dataset.index) || 0;
      sliderDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
      
      // Update image counter
      const imageCounter = document.querySelector('.image-counter span');
      if (imageCounter && window.currentBookImages) {
        imageCounter.textContent = `${index + 1} / ${window.currentBookImages.length}`;
      }
      
      // Update current index
      window.currentImageIndex = index;
    }
  }

  function toggleZoom() {
    const mainImg = document.querySelector('.main-book-img');
    if (!mainImg || !zoomOverlay || !zoomImg) return;
    
    zoomImg.src = mainImg.src;
    zoomOverlay.style.display = 'flex';
    zoomOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeZoom() {
    if (!zoomOverlay) return;
    
    zoomOverlay.style.display = 'none';
    zoomOverlay.setAttribute('aria-hidden', 'true');
  }

  async function addToCartModal(bookKey) {
    const book = allBooks.find(b => b._id === bookKey); // ✅ Always use _id
    if (!book) {
      console.error('Book not found for cart:', bookKey);
      window.showToast('Book not found!', 'error');
      return;
    }

    const qtyInput = document.getElementById('modal-qty');
    const requestedQty = qtyInput ? parseInt(qtyInput.value) : 1;
    
    if (isNaN(requestedQty) || requestedQty <= 0) {
      window.showToast('Please enter a valid quantity', 'error');
      return;
    }

    // Get the max allowed quantity from the input
    const maxAllowed = qtyInput ? parseInt(qtyInput.max) : 10;
    
    // STRICT: Check if requested quantity exceeds max allowed
    if (requestedQty > maxAllowed) {
      window.showToast(`Maximum ${maxAllowed} items available. Setting quantity to ${maxAllowed}`, 'warning');
      
      // Auto-correct to maximum available
      if (qtyInput) {
        qtyInput.value = maxAllowed;
      }
      
      // Add with corrected quantity
      addToCartWithCorrectedQuantity(book, maxAllowed);
      return;
    }

    // STRICT: Check inventory before adding
    try {
      const availability = await window.checkBookAvailability(book._id, requestedQty);
      
      console.log(`📦 Inventory check for ${book.title}:`, {
        requested: requestedQty,
        available: availability.available,
        canPurchase: availability.canPurchase,
        maxAllowed: maxAllowed
      });
      
      if (!availability.canPurchase) {
        if (availability.available <= 0) {
          window.showToast(`❌ "${book.title}" is out of stock`, 'error');
          return;
        } else {
          // Auto-correct to maximum available
          const actualMax = Math.min(availability.available, 10);
          window.showToast(`⚠️ Only ${availability.available} available. Setting quantity to ${actualMax}`, 'warning');
          
          if (qtyInput) {
            qtyInput.value = actualMax;
            qtyInput.max = actualMax;
          }
          
          // Add with corrected quantity
          addToCartWithCorrectedQuantity(book, actualMax);
          return;
        }
      }
      
      // Everything is fine, add with requested quantity
      addToCartWithCorrectedQuantity(book, requestedQty);
      
    } catch (error) {
      console.error('Error checking inventory:', error);
      window.showToast('Failed to check inventory', 'error');
    }
  }

  function addToCartWithCorrectedQuantity(book, quantity) {
    const price = calculateDiscountedPrice(book.price, book.discount);
    let cart = window.getUserCart();

    const existingItem = cart.find(item =>
      item.id === book._id // ✅ Compare with book._id
    );

    if (existingItem) {
      // Check if adding would exceed max per item (10)
      const newTotal = existingItem.quantity + quantity;
      existingItem.quantity = Math.min(newTotal, 10);
    } else {
      cart.push({
        id: book._id, // ✅ Use book._id
        bookId: book._id, // ✅ Consistent ID
        title: book.title,
        author: book.author,
        price: price,
        originalPrice: book.price,
        discount: book.discount,
        image: book.images?.[0] || '',
        quantity: Math.min(quantity, 10), // Respect max per item
        weight: book.weight || 500,
        description: book.description
      });
    }

    window.saveUserCart(cart);
    window.showToast(`✅ ${quantity} "${book.title}" added to cart!`, 'success');
    announceToScreenReader(`Added ${quantity} ${book.title} to cart`);
    
    const card = document.querySelector(`.book-card[data-id="${book._id}"]`);
    if (card) {
      refreshSingleBookStock(book._id); // ✅ Make sure this function exists!
    }
  }

  async function refreshSingleBookStock(bookId) {
    const card = document.querySelector(`.book-card[data-id="${bookId}"]`);
    if (!card) return;

    try {
      const res = await fetch(`${INVENTORY_API}/status/${bookId}`);
      if (!res.ok) throw new Error("Inventory API failed");

      const data = await res.json();
      
      // Get available stock (handle both .available and .stock)
      const available = data.available || data.stock || 0;
      
      // Update the stock status on the card
      let stockElement = card.querySelector('.stock-status');
      if (!stockElement) {
        stockElement = document.createElement('span');
        stockElement.className = 'stock-status';
        const priceContainer = card.querySelector('.book-price');
        if (priceContainer) priceContainer.appendChild(stockElement);
      }

      if (available <= 0) {
        stockElement.innerHTML = '❌ Out of Stock';
        stockElement.className = 'stock-status out-of-stock';
      } else if (available <= 5) {
        stockElement.innerHTML = `⚠️ Only ${available} left`;
        stockElement.className = 'stock-status low-stock';
      } else {
        stockElement.innerHTML = '✅ In Stock';
        stockElement.className = 'stock-status in-stock';
      }

    } catch (e) {
      console.warn('❌ Failed to refresh stock for', bookId, e);
    }
  }

  // Also update the buyNowModal function for consistency
  async function buyNowModal(bookKey) {
    const book = allBooks.find(b => b._id === bookKey); // ✅ Always use _id
    if (!book) {
      window.showToast('Book not found!', 'error');
      return;
    }

    const qtyInput = document.getElementById('modal-qty');
    const requestedQty = qtyInput ? parseInt(qtyInput.value) : 1;
    
    if (isNaN(requestedQty) || requestedQty <= 0) {
      window.showToast('Please enter a valid quantity', 'error');
      return;
    }

    // Get the max allowed quantity from the input
    const maxAllowed = qtyInput ? parseInt(qtyInput.max) : 10;
    
    // STRICT: Check if requested quantity exceeds max allowed
    if (requestedQty > maxAllowed) {
      window.showToast(`Maximum ${maxAllowed} items available. Setting quantity to ${maxAllowed}`, 'warning');
      
      // Auto-correct to maximum available
      if (qtyInput) {
        qtyInput.value = maxAllowed;
      }
      
      // Use corrected quantity for buy now
      const price = calculateDiscountedPrice(book.price, book.discount);
      const cart = [{
        id: book._id, // ✅ Use book._id instead of bookKey
        bookId: book._id, // ✅ Consistent ID
        title: book.title,
        author: book.author,
        price: price,
        originalPrice: book.price,
        discount: book.discount,
        image: book.images?.[0] || '',
        quantity: maxAllowed,
        weight: book.weight || book.specs?.weight || 0
      }];

      window.saveUserCart(cart);
      window.showToast(`✅ ${maxAllowed} "${book.title}" ready for checkout`, 'success');
      
      setTimeout(() => {
        window.location.href = 'checkout.html';
      }, 500);
      return;
    }

    // STRICT: Check inventory before buy now
    try {
      const availability = await window.checkBookAvailability(book._id, requestedQty);
      
      if (!availability.canPurchase) {
        if (availability.available <= 0) {
          window.showToast(`❌ "${book.title}" is out of stock`, 'error');
          return;
        } else {
          // Auto-correct to maximum available
          const actualMax = Math.min(availability.available, 10);
          window.showToast(`⚠️ Only ${availability.available} available. Setting quantity to ${actualMax}`, 'warning');
          
          if (qtyInput) {
            qtyInput.value = actualMax;
            qtyInput.max = actualMax;
          }
          
          // Use corrected quantity
          const price = calculateDiscountedPrice(book.price, book.discount);
          const cart = [{
            id: book._id, // ✅ Use book._id
            bookId: book._id, // ✅ Consistent ID
            title: book.title,
            author: book.author,
            price: price,
            originalPrice: book.price,
            discount: book.discount,
            image: book.images?.[0] || '',
            quantity: actualMax,
            weight: book.weight || book.specs?.weight || 0
          }];

          window.saveUserCart(cart);
          window.showToast(`✅ ${actualMax} "${book.title}" ready for checkout`, 'success');
          
          setTimeout(() => {
            window.location.href = 'checkout.html';
          }, 500);
          return;
        }
      }
      
      // Everything is fine, proceed with requested quantity
      const price = calculateDiscountedPrice(book.price, book.discount);
      const cart = [{
        id: book._id, // ✅ Use book._id
        bookId: book._id, // ✅ Consistent ID
        title: book.title,
        author: book.author,
        price: price,
        originalPrice: book.price,
        discount: book.discount,
        image: book.images?.[0] || '',
        quantity: requestedQty,
        weight: book.weight || book.specs?.weight || 0
      }];

      window.saveUserCart(cart);
      window.showToast('Redirecting to checkout...', 'success');
      announceToScreenReader('Proceeding to checkout');
      
      setTimeout(() => {
        window.location.href = 'checkout.html';
      }, 500);
      
    } catch (error) {
      console.error('Error checking inventory for buy now:', error);
      window.showToast('Failed to check inventory', 'error');
    }
  }

  // ===============================
  // EVENT LISTENERS
  // ===============================
  function setupEventListeners() {
    // Search functionality
    if (searchBtn) {
      searchBtn.addEventListener('click', handleSearch);
    }

    if (searchInput) {
      searchInput.addEventListener('keyup', e => {
        if (e.key === 'Enter') handleSearch();
      });
    }

    // Filter buttons
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        if (filter) applyFilter(filter);
      });
    });

    // Modal close
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeBookDetail);
    }

    // Close modal when clicking outside
    if (bookDetailModal) {
      bookDetailModal.addEventListener('click', (e) => {
        if (e.target === bookDetailModal) {
          closeBookDetail();
        }
      });
    }

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (bookDetailModal.style.display === 'flex') {
          closeBookDetail();
        }
        if (zoomOverlay && zoomOverlay.style.display === 'flex') {
          closeZoom();
        }
      }
    });

    // Thumbnail click for image change
    document.addEventListener('click', (e) => {
      if (e.target.closest('.thumb')) {
        const thumb = e.target.closest('.thumb');
        const imgSrc = decodeURIComponent(thumb.dataset.image);
        changeMainImage(thumb, imgSrc);
      }
    });

    // Zoom overlay close
    if (zoomOverlay) {
      zoomOverlay.addEventListener('click', closeZoom);
    }

    // Add keyboard event listener for image navigation
    document.addEventListener('keydown', handleKeyboardNavigation);

    // Add swipe support for touch devices
    let touchStartX = 0;
    let touchEndX = 0;
    
    bookDetailModal.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true }); // ✅ Add this
    
    bookDetailModal.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });
    
    function handleSwipe() {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          nextSlide(); // Swipe left = next image
        } else {
          prevSlide(); // Swipe right = previous image
        }
      }
    }
  }

  // ===============================
  // INITIALIZATION
  // ===============================
  function initializeBooksPage() {
    console.log('📚 Initializing books page...');
    
    // Wait for DOM to be fully ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        loadBooksFromBackend();
        setupEventListeners();
      });
    } else {
      loadBooksFromBackend();
      setupEventListeners();
    }
    
    // Initialize default active filter
    const defaultFilter = document.querySelector('.filter-btn.active');
    if (defaultFilter && defaultFilter.dataset.filter) {
      applyFilter(defaultFilter.dataset.filter);
    }
  }

  // ===============================
// EXPORT GLOBALS
// ===============================
// Only export app.js specific functions
window.openBookDetail = openBookDetailWrapper;
window.changePage = changePage;
window.handleImageError = handleImageError;
window.changeMainImage = changeMainImage;
window.toggleZoom = toggleZoom;
window.closeZoom = closeZoom;
window.addToCartModal = addToCartModal;
window.buyNowModal = buyNowModal;
window.handleSearch = handleSearch;
window.applyFilter = applyFilter;
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.goToSlide = goToSlide;
window.changeMainImageByIndex = changeMainImageByIndex;

// Export quantity control functions
window.increaseModalQty = increaseModalQty;
window.decreaseModalQty = decreaseModalQty;
window.validateModalQty = validateModalQty;

// Export app.js specific inventory functions if needed
// window.updateInventoryForVisibleBooks = updateInventoryForVisibleBooks;
// window.refreshSingleBookStock = refreshSingleBookStock;
  
  // ===============================
  // STARTUP
  // ===============================
  
  // Wait for common.js to load
  let initialized = false;

  function waitForCommonJS() {
    if (initialized) return;

    if (typeof initCommon === 'function' && typeof window.showToast === 'function') {
      initialized = true;
      initializeBooksPage();
    } else {
      setTimeout(waitForCommonJS, 100);
    }
  }

  // Start initialization
  waitForCommonJS();

})();
