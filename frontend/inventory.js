  /* inventory.js - Final Fixed Version */
  const API_BASE = window.location.origin + '/api/books';
  const ORDER_API = `${window.location.origin}/api/admin/orders`;

  const SYNC_INTERVAL = 60 * 1000; // 1 minute
  const SYNC_KEY = "inventory_last_sync";

  function checkAdminAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    console.log('🔐 Auth Check (Inventory):', { 
      hasToken: !!token, 
      userRole: user.role,
      userEmail: user.email 
    });

    if (!token) {
      alert("Session expired. Please log in again.");
      window.location.href = "login.html";
      return false;
    }

    // ✅ FIXED: Allow both super_admin and admin roles
    const allowedRoles = ['admin', 'super_admin'];
    
    if (!allowedRoles.includes(user.role)) {
      alert("Access denied! Only admin and super admin can view this page.");
      window.location.href = "all_book_grid.html";
      return false;
    }

    return true;
  }

  /* ----------------------------- Global State ----------------------------- */
  let allBooks = [];
  let selectedBookIds = new Set();
  let currentPage = 1;
  let filteredBooks = [];
  const booksPerPage = 12;
  let isSyncing = false;

  let filteredActivities = [];
  let currentActivitiesPage = 1;

  // Activity tracking
  let allActivities = [];
  const activitiesPerPage = 10;

  /* ----------------------------- Utilities ----------------------------- */
  function showToast(message, type = "info", duration = 3000) {
    const toast = document.getElementById("toast");
    if (!toast) {
      alert(`${type.toUpperCase()}: ${message}`);
      return;
    }
    toast.textContent = message;
    toast.className = "";
    toast.classList.add("show", type);
    setTimeout(() => toast.classList.remove("show", type), duration);
  }

  function sanitize(str) {
    if (str == null) return "";
    return String(str);
  }

  function debounce(fn, delay = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function showLoading(show = true) {
    const spinner = document.getElementById("loading-spinner");
    if (!spinner) return;

    spinner.style.display = show ? "block" : "none";
  }

  /* ====================== API HELPER ====================== */

  async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("token");

    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg);
    }

    return res.json();
  }

  /* ----------------------------- Core Inventory Functions ----------------------------- */
  async function loadInventory() {
    if (!checkAdminAuth()) return;

    // Prevent duplicate sync calls
    if (isSyncing) {
      console.log('⏸️ Sync already in progress, skipping...');
      return;
    }

    try {
      isSyncing = true;
      console.log('📚 Loading inventory data...');

      const response = await fetch(API_BASE, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const books = await response.json();

      console.log(`✅ Inventory loaded: ${books.length} books`);

      // Render inventory
      displayInventory(books);

      // ✅ Sync order-based inventory updates (safe & throttled)
      setTimeout(() => {
        syncOrderInventoryActivities();
      }, 800);

      return books;

    } catch (error) {
      console.error('❌ Error loading inventory:', error);
      showToast('Failed to load inventory from server', 'error');

      // ❌ Removed localStorage fallback (backend is source of truth)
      return [];

    } finally {
      isSyncing = false;
    }
  }

  function displayInventory(books) {
      console.log('🔄 Displaying inventory:', books.length, 'books');
      allBooks = books;
      filteredBooks = [...books];
      updateDashboardCards();
      renderInventoryPage(1);
      updateBulkButtonsState();
  }

  async function addItem(bookData) {
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(bookData),
      });
    
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to add book: ${res.status} - ${errorText}`);
      }
    
      const newBook = await res.json();
      showToast("Book added successfully", "success");
    
      // ✅ ADD ACTIVITY RECORDING HERE
      recordActivity('add', newBook, { 
        reason: 'New book added to inventory' 
      });
    
      await loadInventory();
      return newBook;
    } catch (err) {
      console.error("Error adding book:", err);
      showToast("Error adding book: " + err.message, "error");
      throw err;
    }
  }

  async function editItem(id, updatedData) {
    try {
      // ✅ FIRST get the current book data BEFORE updating
      const currentBook = await getBookById(id);
      
      if (!currentBook) {
        throw new Error("Book not found");
      }
    
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedData),
      });
    
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Book not found in database");
        }
        throw new Error(`Failed to update book: ${res.status}`);
      }
    
      const updatedBook = await res.json();
      showToast("Book updated successfully", "success");
    
      // ✅ FIXED: Ensure we have book title for activity
      if (updatedData.stock !== undefined) {
        const oldStock = currentBook.stock || 0;
        const newStock = updatedData.stock;
        const stockChange = newStock - oldStock;
        
        // ✅ Create a proper book object with all necessary data
        const bookForActivity = {
          _id: id,
          id: id,
          title: currentBook.title || "Unknown Book",
          stock: newStock,
          ...currentBook // Spread all properties
        };
      
        recordActivity('update', bookForActivity, {
          reason: 'Manual stock adjustment',
          stockChange: stockChange,
          previousStock: oldStock,
          newStock: newStock
        });
      }
    
      await loadInventory();
      return updatedBook;
    } catch (err) {
      console.error("Error updating book:", err);
      showToast(err.message, "error");
      throw err;
    }
  }

  async function deleteItem(id) {
    if (!confirm("Are you sure you want to delete this book?")) return;

    try {
      // First get the book details before deleting
      const book = await getBookById(id);
    
      const res = await fetch(`${API_BASE}/${id}`, { 
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
    
      if (!res.ok) {
        throw new Error(`Failed to delete book: ${res.status}`);
      }
    
      showToast("Book deleted successfully", "success");
      
      // ✅ ADD ACTIVITY RECORDING HERE
      recordActivity('delete', book, {
        reason: 'Book deleted from inventory'
      });
    
      await loadInventory();
    } catch (err) {
      console.error("Error deleting book:", err);
      showToast("Error deleting book: " + err.message, "error");
    }
  }

  async function getBookById(id) {
    // ✅ ADD: Check authentication
    if (!checkAdminAuth()) return;
  
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        // ✅ ADD: Authentication header
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // ✅ CORRECT
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Book not found");
        }
        throw new Error(`Failed to fetch book: ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.error('Error fetching book:', error);
      throw error;
    }
  }

  /* ----------------------------- UI Rendering ----------------------------- */
  function updateDashboardCards() {
    const totalBooksElem = document.getElementById("total-books");
    const totalStockElem = document.getElementById("total-stock");
    const lowStockElem = document.getElementById("low-stock");
    const inventoryValueElem = document.getElementById("inventory-value");

    const totalBooks = allBooks.length;
    const totalStock = allBooks.reduce((s, b) => s + (Number(b.stock) || 0), 0);
    const lowStockCount = allBooks.filter(b => {
      const stock = Number(b.stock) || 0;
      const threshold = b.threshold ?? 5;
      return stock > 0 && stock <= threshold;
    }).length;
    const inventoryValue = allBooks.reduce((s, b) => s + (Number(b.stock) || 0) * (Number(b.price) || 0), 0);

    if (totalBooksElem) totalBooksElem.textContent = totalBooks;
    if (totalStockElem) totalStockElem.textContent = totalStock;
    if (lowStockElem) lowStockElem.textContent = lowStockCount;
    if (inventoryValueElem) inventoryValueElem.textContent = `₹${inventoryValue.toFixed(2)}`;
  }

  function renderInventoryPage(page = 1) {
    currentPage = page;
    const tbody = document.getElementById("inventory-body");
    if (!tbody) return;

    const start = (page - 1) * booksPerPage;
    const sliced = filteredBooks.slice(start, start + booksPerPage);

    tbody.innerHTML = sliced.map(bookRowHtml).join("") || `<tr><td colspan="9" style="text-align:center;color:#777;padding:20px;">No books found</td></tr>`;

    renderPagination();
    attachRowEventHandlers();
  }

  function bookRowHtml(book) {
    const id = sanitize(book._id || book.id || "");
    const title = sanitize(book.title);
    const category = sanitize(book.category || "");
    const stock = Number(book.stock || 0);
    const price = Number(book.price || 0);
    const value = (stock * price).toFixed(2);
    const statusClass = stock <= 0 ? "stock-out" : stock <= (book.threshold ?? 5) ? "stock-low" : "stock-adequate";

    return `
      <tr data-id="${id}">
        <td><input type="checkbox" class="row-select" data-id="${id}" ${selectedBookIds.has(id) ? "checked" : ""}></td>
        <td class="id-cell">${id.substring(0, 8)}...</td>
        <td>${title}</td>
        <td>${category || "-"}</td>
        <td class="stock-cell ${statusClass}">${stock} <button class="stock-edit" data-id="${id}" title="Adjust stock">✎</button></td>
        <td>₹${price.toFixed(2)}</td>
        <td>₹${value}</td>
        <td>${stock <= 0 ? "Out of stock" : stock <= (book.threshold ?? 5) ? "Low stock" : "In stock"}</td>
        <td>
          <a class="btn btn-info btn-sm" href="add-book.html?id=${id}">
            <i class="fas fa-edit"></i>
          </a>
          <button class="btn btn-danger btn-sm" onclick="deleteItem('${id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
  }

  function renderPagination() {
    const pagination = document.getElementById("pagination");
    if (!pagination) return;
    const totalPages = Math.max(1, Math.ceil(filteredBooks.length / booksPerPage));
    let html = "";

    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === currentPage ? "active" : ""}" onclick="renderInventoryPage(${i})">${i}</button>`;
    }

    pagination.innerHTML = html;
  }

  /* ----------------------------- Event Handlers ----------------------------- */
  function attachRowEventHandlers() {
    document.querySelectorAll(".row-select").forEach(cb => {
      cb.onchange = (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) selectedBookIds.add(id); 
        else selectedBookIds.delete(id);
        updateBulkButtonsState();
      };
    });

    document.querySelectorAll(".stock-edit").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        openStockModal(id);
      };
    });
  }

  function updateBulkButtonsState() {
    const bulkDelete = document.getElementById("bulk-delete-btn");
    const bulkAdjust = document.getElementById("bulk-adjust-btn");
    const hasSelected = selectedBookIds.size > 0;
    if (bulkDelete) bulkDelete.disabled = !hasSelected;
    if (bulkAdjust) bulkAdjust.disabled = !hasSelected;
  }

  /* ----------------------------- Modal Functions ----------------------------- */
  // ✅ FIXED: Enhanced closeModal function
  function closeModal() {
    const modals = document.querySelectorAll(".modal");
    modals.forEach(modal => {
      modal.style.display = "none";
    });
    
    const itemModal = document.getElementById("itemModal");
    if (itemModal) {
      delete itemModal.dataset.mode;
      delete itemModal.dataset.editId;
    }
  }

  // ✅ FIXED: Specific modal close functions
  function closeStockModal() {
    const modal = document.getElementById("stockModal");
    if (modal) modal.style.display = "none";
  }

  function closeBulkStockModal() {
    const modal = document.getElementById("bulkStockModal");
    if (modal) modal.style.display = "none";
  }

  function closeReportModal() {
    const modal = document.getElementById("reportModal");
    if (modal) modal.style.display = "none";
  }

  /* ----------------------------- Stock Modal ----------------------------- */
  async function openStockModal(id) {
    try {
      showLoading(true);
      const book = await getBookById(id);
      document.getElementById("stock-item-id").value = id;
      document.getElementById("stock-item-name").textContent = book.title || "";
      document.getElementById("current-stock-value").textContent = Number(book.stock || 0);
      document.getElementById("adjustment-quantity").value = 1;
      document.getElementById("adjustment-reason").value = "";
      document.getElementById("adjustment-type").value = "add";
      updateAdjustmentUI();
      document.getElementById("stockModal").style.display = "block";
    } catch (err) {
      console.error("Open stock modal error:", err);
      showToast("Failed to load stock details", "error");
    } finally {
      showLoading(false);
    }
  }

  function updateAdjustmentUI() {
    const type = document.getElementById("adjustment-type").value;
    const help = document.getElementById("adjustment-help");
    if (help) {
      if (type === "add") help.textContent = "Enter how many items to add to the stock.";
      else if (type === "remove") help.textContent = "Enter how many items to remove from the stock.";
      else help.textContent = "Set the exact stock level for this item.";
    }
  }

  /* ----------------------------- Search & Filter ----------------------------- */
  function filterInventory() {
    const q = (document.getElementById("search-input")?.value || "").toLowerCase().trim();
    const category = (document.getElementById("category-filter")?.value || "").trim();
    const stockFilter = (document.getElementById("stock-filter")?.value || "").trim();
    const minPrice = Number(document.getElementById("price-min")?.value || 0);
    const maxPrice = Number(document.getElementById("price-max")?.value || 99999999);

    filteredBooks = allBooks.filter(b => {
      const title = (b.title || "").toLowerCase();
      const author = (b.author || "").toLowerCase();
      const categoryMatch = !category || (b.category || "") === category;
      const price = Number(b.price || 0);
      const stock = Number(b.stock || 0);

      if (q && !(`${title} ${author}`).includes(q)) return false;
      if (!categoryMatch) return false;
      if (price < minPrice || price > maxPrice) return false;

      const threshold = b.threshold ?? 5;

      if (stockFilter === "low" && !(stock > 0 && stock <= threshold)) return false;
      if (stockFilter === "out" && stock > 0) return false;
      if (stockFilter === "adequate" && stock <= threshold) return false;

      return true;
    });

    renderInventoryPage(1);
  }

  /* ----------------------------- Bulk Operations ----------------------------- */
  function toggleSelectAll(cb) {
    const allCbs = document.querySelectorAll("#inventory-body .row-select");
    const checked = cb.checked;

    allCbs.forEach(cb2 => {
      cb2.checked = checked;
      const id = cb2.dataset.id;
      checked ? selectedBookIds.add(id) : selectedBookIds.delete(id);
    });

    updateBulkButtonsState();
  }

  function toggleSelectAllHeader(cb) {
    toggleSelectAll(cb);
  }

  function confirmBulkDeleteItems() {
    if (selectedBookIds.size === 0) { 
      showToast("No items selected", "warning"); 
      return; 
    }
    if (!confirm(`Delete ${selectedBookIds.size} selected items? This cannot be undone.`)) return;
    
    (async () => {
      showLoading(true);
      try {
        for (const id of Array.from(selectedBookIds)) {
          await deleteItem(id);
        }
        selectedBookIds.clear();
        updateBulkButtonsState();
        await loadInventory();
        showToast("Selected items deleted", "success");
      } catch (err) {
        console.error("Bulk delete error:", err);
        showToast("Bulk delete failed", "error");
      } finally {
        showLoading(false);
      }
    })();
  }

  function bulkAdjustStock() {
    if (selectedBookIds.size === 0) {
      showToast("No items selected", "warning");
      return;
    }
    
    const modal = document.getElementById("bulkStockModal");
    if (!modal) return;
    document.getElementById("selected-items-count").textContent = selectedBookIds.size;
    modal.style.display = "block";
  }

  /* ----------------------------- Data Management - FIXED ----------------------------- */
  function backupInventory() {
    // ✅ ADD: Check authentication
    if (!checkAdminAuth()) return;

    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      totalBooks: allBooks.length,
      books: allBooks
    };

    const data = JSON.stringify(backupData, null, 2);
    
    // ✅ FIXED: Use data URL instead of blob URL
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(data);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `books-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    showToast(`Backup created with ${allBooks.length} books`, "success");
  }

  // ✅ FIXED: Restore function that only ADDS books (no updates)
  function restoreInventory(event) {
    // ✅ ADD: Check authentication
    if (!checkAdminAuth()) return;
  
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      showToast("Please select a valid JSON backup file", "error");
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        console.log('📁 File content preview:', content.substring(0, 200) + '...');
        
        let data;
        try {
          data = JSON.parse(content);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          showToast("Invalid JSON format in backup file", "error");
          event.target.value = '';
          return;
        }
        
        // Extract books array from backup data
        let booksArray = [];
        if (Array.isArray(data)) {
          booksArray = data;
        } else if (typeof data === 'object' && data.books && Array.isArray(data.books)) {
          booksArray = data.books;
        } else {
          throw new Error("Backup file must contain an array of books");
        }
        
        if (booksArray.length === 0) {
          showToast("Backup file is empty", "warning");
          event.target.value = '';
          return;
        }
        
        // Always ADD books, never update during restore
        if (!confirm(`Add ${booksArray.length} books from backup? This will create new books.`)) {
          event.target.value = '';
          return;
        }

        showLoading(true);
        let successCount = 0;
        let errorCount = 0;

        try {
          for (const book of booksArray) {
            try {
              // Normalize book data - IGNORE existing _id
              const newBook = {
                title: book.title || "Untitled Book",
                author: book.author || "Unknown Author",
                price: Number(book.price) || 0,
                stock: Number(book.stock) || 0,
                description: book.description || "",
                category: book.category || "Other",
                weight: Number(book.weight) || 0,
                isbn: book.isbn || ""
              };

              // Always add as new book (ignore _id from backup)
              await addItem(newBook);
              successCount++;
              
              // Small delay to avoid overwhelming server
              await new Promise(resolve => setTimeout(resolve, 100));
              
            } catch (bookError) {
              console.warn("Failed to add book:", bookError);
              errorCount++;
            }
          }
          
          showToast(`Restore complete: ${successCount} books added, ${errorCount} errors`, 
                    errorCount > 0 ? "warning" : "success");
        } catch (err) {
          console.error("Restore process error:", err);
          showToast("Restore process failed", "error");
        } finally {
          showLoading(false);
          event.target.value = '';
        }
        
      } catch (err) {
        console.error("Restore failed:", err);
        showToast("Failed to restore: " + err.message, "error");
        event.target.value = '';
      }
    };
    
    reader.onerror = () => {
      showToast("Error reading file", "error");
      event.target.value = '';
    };
    
    reader.readAsText(file);
  }

  // ✅ FIXED: CSV Import function
  function handleCSVImport(event) {
    // ✅ ADD: Check authentication
    if (!checkAdminAuth()) return;
  
  const file = event.target.files[0];
  if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showToast("Please select a valid CSV file", "error");
      event.target.value = '';
      return;
    }

    showToast("Reading CSV file...", "info");

    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const csvText = e.target.result;
        console.log('📄 CSV content preview:', csvText.substring(0, 200));
        
        const books = parseCSV(csvText);

        if (!books.length) {
          showToast("CSV file is empty or invalid", "error");
          event.target.value = '';
          return;
        }

        const importSummary = `Found ${books.length} records.\n\nColumns: ${Object.keys(books[0]).join(', ')}\n\nProceed with import?`;
        
        if (!confirm(importSummary)) {
          event.target.value = '';
          return;
        }

        showLoading(true);
        let successCount = 0;
        let errorCount = 0;

        for (const book of books) {
          try {
            const newBook = {
              title: book.title || book.Title || "Untitled Book",
              author: book.author || book.Author || "Unknown Author",
              price: parseFloat(book.price || book.Price || 0),
              stock: parseInt(book.stock || book.Stock || 0),
              description: book.description || book.Description || "",
              category: book.category || book.Category || "Other",
              weight: parseFloat(book.weight || book.Weight || 0),
              isbn: book.isbn || book.ISBN || ""
            };

            if (!newBook.title || newBook.title === "Untitled Book") {
              console.warn("Skipping book with no title:", book);
              errorCount++;
              continue;
            }

            await addItem(newBook);
            successCount++;
            
          } catch (err) {
            console.error("Error importing book:", book, err);
            errorCount++;
          }
        }

        // ✅ SHOW TOAST FIRST
        showToast(`CSV import completed: ${successCount} successful, ${errorCount} failed`, 
                  errorCount > 0 ? "warning" : "success");
      
        // ✅ THEN ADD ACTIVITY RECORDING HERE (RIGHT AFTER THE TOAST)
        if (successCount > 0) {
          // Record import activity
          recordActivity('import', { 
            title: 'Multiple Books', 
            _id: 'csv_import',
            stock: successCount 
          }, {
            reason: `CSV import: ${successCount} books added`,
            booksAdded: successCount,
            booksFailed: errorCount
          });
      }
        
      } catch (err) {
        console.error("CSV import error:", err);
        showToast("Failed to import CSV: " + err.message, "error");
      } finally {
        showLoading(false);
        event.target.value = '';
      }
    };
    
    reader.onerror = () => {
      showToast("Error reading CSV file", "error");
      event.target.value = '';
    };
    
    reader.readAsText(file);
  }

  function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = values[i] || '';
      });
      return obj;
    });
  }

  /* ----------------------------- Additional Functions ----------------------------- */
  function manualSyncInventory() {
      console.log('🔄 Manual sync triggered');
      loadInventory();
      showToast("Inventory synced", "info");
  }

  async function updateBookStock(bookId, newStock) {
      try {
          const response = await fetch(`${API_BASE}/${bookId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // ✅ CORRECT
              },
              body: JSON.stringify({ stock: parseInt(newStock) })
          });
          if (!response.ok) throw new Error(`Failed to update stock: ${response.status}`);
          const updatedBook = await response.json();
          console.log('✅ Stock updated:', updatedBook.title, '->', updatedBook.stock);
          showToast(`Stock updated for ${updatedBook.title}`, "success");
          await loadInventory();
      } catch (error) {
          console.error('❌ Error updating stock:', error);
          showToast('Error updating stock', "error");
      }
  }

  function showLowStockReport() {
      // ✅ ADD: Check authentication
      if (!checkAdminAuth()) return;
  
      const lowStockBooks = allBooks.filter(book => {
        const stock = Number(book.stock) || 0;
        const threshold = book.threshold ?? 5;
        return stock > 0 && stock <= threshold;
      });
      const reportBody = document.getElementById("report-body");
      if (reportBody) {
          reportBody.innerHTML = lowStockBooks.map(book => `
              <tr>
                  <td>${book.title}</td>
                  <td class="stock-low">${book.stock}</td>
                  <td>5</td>
                  <td>${book.stock <= 0 ? "Out of Stock" : "Low Stock"}</td>
                  <td>
                      <button class="btn btn-info btn-sm" onclick="openStockModal('${book._id}')">
                          <i class="fas fa-edit"></i> Adjust
                      </button>
                  </td>
              </tr>
          `).join('') || '<tr><td colspan="5">No low stock items</td></tr>';
      }
      document.getElementById("reportModal").style.display = "block";
  }

  function printReport() { 
      window.print(); 
  }

  function exportLowStockReport() {
    // ✅ ADD: Check authentication
    if (!checkAdminAuth()) return;

    const lowStockBooks = allBooks.filter(book => (Number(book.stock) || 0) <= 5);
    const csvContent = "Book Title,Current Stock,Threshold,Status\n" +
      lowStockBooks.map(book => 
        `"${book.title}",${book.stock},5,"${book.stock <= 0 ? "Out of Stock" : "Low Stock"}"`
      ).join("\n");
    
    // ✅ FIXED: Use data URL instead of blob URL
    const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csvContent);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `low-stock-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    showToast("Low stock report exported", "success");
  }

  function exportInventory() {
    // ✅ ADD: Check authentication
    if (!checkAdminAuth()) return;

    const csvContent = "Title,Author,Category,Stock,Price,ISBN,Weight\n" +
      allBooks.map(book => 
        `"${book.title || ''}","${book.author || ''}","${book.category || ''}",${book.stock || 0},${book.price || 0},"${book.isbn || ''}",${book.weight || 0}`
      ).join("\n");
    
    // ✅ FIXED: Use data URL instead of blob URL
    const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csvContent);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    showToast("Inventory exported to CSV", "success");
  }

  function sortInventory(field) {
      filteredBooks.sort((a, b) => {
          let aVal = a[field] || '';
          let bVal = b[field] || '';
          if (field === 'stock' || field === 'price') {
              aVal = Number(aVal) || 0;
              bVal = Number(bVal) || 0;
          }
          if (aVal < bVal) return -1;
          if (aVal > bVal) return 1;
          return 0;
      });
      renderInventoryPage(currentPage);
      showToast(`Sorted by ${field}`, "info");
  }

  /* ----------------------------- Confirmation Dialogs ----------------------------- */
  let currentConfirmationCallback = null;

  function confirmClearAllData() {
      showConfirmationDialog(
          "Clear All Data",
          "Are you sure you want to delete ALL inventory data? This action cannot be undone!",
          async () => {
              showLoading(true);
              try {
                  for (const book of allBooks) {
                      await fetch(`${API_BASE}/${book._id}`, { method: "DELETE" });
                  }
                  await loadInventory();
              } catch (error) {
                  console.error("Error clearing data:", error);
                  showToast("Error clearing data", "error");
              } finally {
                  showLoading(false);
              }
          }
      );
  }

  function showConfirmationDialog(title, message, confirmCallback) {
      const dialog = document.getElementById("confirmationDialog");
      const titleElem = document.getElementById("confirmation-title");
      const messageElem = document.getElementById("confirmation-message");
      const confirmBtn = document.getElementById("confirm-action-btn");
      if (dialog && titleElem && messageElem && confirmBtn) {
          titleElem.textContent = title;
          messageElem.textContent = message;
          currentConfirmationCallback = confirmCallback;
          confirmBtn.replaceWith(confirmBtn.cloneNode(true));
          document.getElementById("confirm-action-btn").onclick = executeConfirmation;
          dialog.style.display = "block";
      }
  }

  function executeConfirmation() {
      if (currentConfirmationCallback) currentConfirmationCallback();
      closeConfirmation();
  }

  function closeConfirmation() {
      const dialog = document.getElementById("confirmationDialog");
      if (dialog) dialog.style.display = "none";
      currentConfirmationCallback = null;
  }

  /* ==================== INVENTORY ACTIVITIES SYSTEM ==================== */

  // Initialize activities system
  function initializeActivitiesSystem() {
    loadActivities();
    setupActivitiesFilters();
  }

  // Load activities from localStorage
  function loadActivities() {
    try {
      const savedActivities = localStorage.getItem('inventoryActivities');
      allActivities = savedActivities ? JSON.parse(savedActivities) : [];
      
      // Sort by date (newest first)
      allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
      filteredActivities = [...allActivities];
      renderActivities();
      updateActivitiesSummary();
    
    } catch (error) {
      console.error('Error loading activities:', error);
      allActivities = [];
      filteredActivities = [];
    }
  }

  // Save activities to localStorage
  function saveActivities() {
    try {
      localStorage.setItem('inventoryActivities', JSON.stringify(allActivities));
    } catch (error) {
      console.error('Error saving activities:', error);
    }
  }

  // Record a new activity
  function recordActivity(type, book, details = {}) {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

    // ✅ FIX: Get book title properly from multiple sources
    let bookTitle = 'Unknown Book';
    
    if (typeof book === 'object' && book !== null) {
      // Try multiple possible title fields
      bookTitle = book.title || book.Title || book.bookTitle || 'Unknown Book';
    }

    const activity = {
      id: generateActivityId(),
      timestamp: new Date().toISOString(),
      type: type,
      bookId: book._id || book.id || details.bookId || '',
      bookTitle: bookTitle, // ✅ Now properly set
      details: details,
      user: currentUser.email || "Admin",
      stockChange: details.stockChange || 0,
      newStock: details.newStock || book.stock,
      previousStock: details.previousStock || book.stock
    };

    // Prevent duplicates
    if (allActivities.some(a => a.id === activity.id)) return;

    allActivities.unshift(activity);

    // Limit to last 1000 records
    if (allActivities.length > 1000) {
      allActivities = allActivities.slice(0, 1000);
    }

    saveActivities();
    loadActivities(); // Refresh the display

    console.log('📝 Activity recorded:', activity);
  }

  // Generate unique activity ID
  function generateActivityId() {
    return 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Render activities table
  function renderActivities(page = 1) {
    currentActivitiesPage = page;
    const tbody = document.getElementById('activities-body');
    const pagination = document.getElementById('activities-pagination');
    
    if (!tbody) return;
    
    const startIndex = (page - 1) * activitiesPerPage;
    const paginatedActivities = filteredActivities.slice(startIndex, startIndex + activitiesPerPage);
  
    if (paginatedActivities.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: #6c757d; padding: 20px;">
            <i class="fas fa-search" style="font-size: 48px; margin-bottom: 10px; opacity: 0.5;"></i>
            <div>No activities found</div>
            <small>Try adjusting your filters</small>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = paginatedActivities.map(activity => `
        <tr>
          <td>
            <div>${formatActivityDate(activity.timestamp)}</div>
            <small style="color: #6c757d;">${formatActivityTime(activity.timestamp)}</small>
          </td>
          <td>
            <span class="activity-badge ${getActivityBadgeClass(activity.type)}">
              ${getActivityTypeLabel(activity.type)}
            </span>
          </td>
          <td>
            <strong>${activity.bookTitle}</strong>
            ${activity.bookId ? `<br><small style="color: #6c757d;">ID: ${activity.bookId.substring(0, 8)}...</small>` : ''}
          </td>
          <td>${getActivityDetails(activity)}</td>
          <td>
            <i class="fas fa-user-shield"></i>
            ${activity.user}
          </td>
          <td>${formatStockChange(activity)}</td>
          <td>
            <strong>${activity.newStock || 0}</strong>
            ${activity.previousStock !== undefined ? `<br><small>Prev: ${activity.previousStock}</small>` : ''}
          </td>
        </tr>
      `).join('');
    }
  
    // Render pagination with limited visible pages
    if (pagination) {
      const totalPages = Math.ceil(filteredActivities.length / activitiesPerPage);
      let paginationHtml = '';
      
      // Show max 10 page buttons with first/last and prev/next
      const maxVisible = 10;
      let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
      let endPage = Math.min(totalPages, startPage + maxVisible - 1);
      
      // Adjust if we're near the end
      if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
      }
      
      // First page button
      if (startPage > 1) {
        paginationHtml += `
          <button onclick="renderActivities(1)" title="First Page">
            <i class="fas fa-angle-double-left"></i>
          </button>
        `;
      }
      
      // Previous button
      if (page > 1) {
        paginationHtml += `
          <button onclick="renderActivities(${page - 1})" title="Previous">
            <i class="fas fa-chevron-left"></i>
          </button>
        `;
      }
      
      // Page numbers
      for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `
          <button class="${i === page ? 'active' : ''}" onclick="renderActivities(${i})">
            ${i}
          </button>
        `;
      }
      
      // Next button
      if (page < totalPages) {
        paginationHtml += `
          <button onclick="renderActivities(${page + 1})" title="Next">
            <i class="fas fa-chevron-right"></i>
          </button>
        `;
      }
      
      // Last page button
      if (endPage < totalPages) {
        paginationHtml += `
          <button onclick="renderActivities(${totalPages})" title="Last Page">
            <i class="fas fa-angle-double-right"></i>
          </button>
        `;
      }
      
      // Page info
      paginationHtml += `
        <div class="page-info">
          Page ${page} of ${totalPages} | ${filteredActivities.length} activities
        </div>
      `;
      
      pagination.innerHTML = paginationHtml;
    }
  }

  // Update activities summary cards
  function updateActivitiesSummary() {
    const totalElem = document.getElementById('total-activities');
    const addElem = document.getElementById('add-activities');
    const updateElem = document.getElementById('update-activities');
    const deleteElem = document.getElementById('delete-activities');
  
    if (totalElem) totalElem.textContent = filteredActivities.length;
    if (addElem) addElem.textContent = filteredActivities.filter(a => a.type === 'add').length;
    if (updateElem) updateElem.textContent = filteredActivities.filter(a => a.type === 'update').length;
    if (deleteElem) deleteElem.textContent = filteredActivities.filter(a => a.type === 'delete').length;
  }

  // Filter activities based on current filters
  function filterActivities() {
    const typeFilter = document.getElementById('activity-type-filter').value;
    const userFilter = document.getElementById('activity-user-filter').value;
    const dateFrom = document.getElementById('activity-date-from').value;
    const dateTo = document.getElementById('activity-date-to').value;
    const searchTerm = document.getElementById('activity-search').value.toLowerCase();
  
    filteredActivities = allActivities.filter(activity => {
      // Type filter
      if (typeFilter && activity.type !== typeFilter) return false;
    
      // User filter
      if (userFilter && activity.user !== userFilter) return false;
    
      // Date range filter
      const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
      if (dateFrom && activityDate < dateFrom) return false;
      if (dateTo && activityDate > dateTo) return false;
    
      // Search filter
      if (searchTerm) {
        const searchableText = `
          ${activity.bookTitle} 
          ${activity.details.reason || ''} 
          ${getActivityTypeLabel(activity.type)}
          ${activity.user}
        `.toLowerCase();
        
        if (!searchableText.includes(searchTerm)) return false;
      }
    
      return true;
    });
    
    renderActivities(1);
    updateActivitiesSummary();
  }

  // Clear all activity filters
  function clearActivitiesFilters() {
    document.getElementById('activity-type-filter').value = '';
    document.getElementById('activity-user-filter').value = '';
    document.getElementById('activity-date-from').value = '';
    document.getElementById('activity-date-to').value = '';
    document.getElementById('activity-search').value = '';
    
    filteredActivities = [...allActivities];
    renderActivities(1);
    updateActivitiesSummary();
  }

  // Apply predefined date ranges
  function applyDateRange(range) {
    const today = new Date();
    let fromDate = '';
    let toDate = today.toISOString().split('T')[0];
  
    switch (range) {
      case 'today':
        fromDate = toDate;
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        fromDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        fromDate = monthAgo.toISOString().split('T')[0];
        break;
      case 'all':
        fromDate = '';
        toDate = '';
        break;
    }
  
    document.getElementById('activity-date-from').value = fromDate;
    document.getElementById('activity-date-to').value = toDate;
    filterActivities();
  }

  // Setup activities filters (users dropdown)
  function setupActivitiesFilters() {
    const userFilter = document.getElementById('activity-user-filter');
    if (!userFilter) return;
    
    // Get unique users from activities
    const users = [...new Set(allActivities.map(activity => activity.user))];
  
    // Clear existing options except "All Users"
    userFilter.innerHTML = '<option value="">All Users</option>';
  
    // Add user options
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user;
      option.textContent = user;
      userFilter.appendChild(option);
    });
  }

  // Export activities to CSV
  function exportActivities() {
    if (filteredActivities.length === 0) {
      showToast('No activities to export', 'warning');
      return;
    }

    const headers = ['Date', 'Time', 'Activity Type', 'Book Title', 'Book ID', 'Details', 'User', 'Stock Change', 'Previous Stock', 'New Stock'];
    
    const csvContent = headers.join(',') + '\n' +
      filteredActivities.map(activity => {
        const date = new Date(activity.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
      
        return [
          `"${dateStr}"`,
          `"${timeStr}"`,
          `"${getActivityTypeLabel(activity.type)}"`,
          `"${activity.bookTitle}"`,
          `"${activity.bookId}"`,
          `"${getActivityDetails(activity, true)}"`,
          `"${activity.user}"`,
          activity.stockChange || 0,
          activity.previousStock || '',
          activity.newStock || ''
        ].join(',');
      }).join('\n');

    // ✅ FIXED: Use data URL instead of blob URL
    const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csvContent);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `inventory-activities-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
      
    showToast(`Exported ${filteredActivities.length} activities`, 'success');
  }

  // Clear all activities history
  function confirmClearActivities() {
    showConfirmationDialog(
      'Clear All Activities',
      'Are you sure you want to clear ALL activity history? This action cannot be undone!',
      () => {
        allActivities = [];
        filteredActivities = [];
        saveActivities();
        renderActivities();
        updateActivitiesSummary();
        showToast('All activities history cleared', 'success');
      }
    );
  }

  /* ==================== ACTIVITY HELPER FUNCTIONS ==================== */

  function getActivityTypeLabel(type) {
    const labels = {
      'add': 'Book Added',
      'update': 'Stock Updated',
      'delete': 'Book Deleted',
      'bulk_update': 'Bulk Update',
      'import': 'CSV Import',
      'restore': 'Data Restore'
    };
    return labels[type] || type;
  }

  function getActivityBadgeClass(type) {
    const classes = {
      'add': 'badge-add',
      'update': 'badge-update',
      'delete': 'badge-delete',
      'bulk_update': 'badge-update',
      'import': 'badge-add',
      'restore': 'badge-add'
    };
    return classes[type] || 'badge-update';
  }

  function getActivityDetails(activity, forExport = false) {
    switch (activity.type) {
      case 'add':
        return forExport ? 'New book added to inventory' : 'New book added to inventory';
      
      case 'update':
        if (activity.details.reason) {
          return forExport ? `Stock adjustment: ${activity.details.reason}` : 
                `Stock adjustment<br><small>Reason: ${activity.details.reason}</small>`;
        }
        return forExport ? 'Stock level updated' : 'Stock level updated';
    
      case 'delete':
        return forExport ? 'Book removed from inventory' : 'Book removed from inventory';
    
      case 'bulk_update':
        return forExport ? `Bulk stock update: ${activity.details.reason}` : 
              `Bulk stock update<br><small>Reason: ${activity.details.reason}</small>`;
        
      case 'import':
        return forExport ? 'Books imported from CSV' : 'Books imported from CSV file';
        
      case 'restore':
        return forExport ? 'Inventory data restored from backup' : 'Inventory data restored from backup';
    
      default:
        return forExport ? 'Inventory activity' : 'Inventory activity';
    }
  }

  function formatStockChange(activity) {
    if (activity.stockChange > 0) {
      return `<span style="color: #28a745;">+${activity.stockChange}</span>`;
    } else if (activity.stockChange < 0) {
      return `<span style="color: #dc3545;">${activity.stockChange}</span>`;
    }
    return '<span style="color: #6c757d;">-</span>';
  }

  function formatActivityDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatActivityTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /* ==================== ORDER INVENTORY SYNC ==================== */

  // Sync inventory activities from orders
  async function syncOrderInventoryActivities() {
    try {
      const lastSync = localStorage.getItem(SYNC_KEY);
      const now = Date.now();

      // Prevent excessive syncing
      if (lastSync && now - Number(lastSync) < SYNC_INTERVAL) {
        console.log("⏳ Skipping sync (recently synced)");
        return;
      }

      console.log('🔄 Syncing order inventory activities...');

      const token = localStorage.getItem('token');
      const response = await fetch(ORDER_API, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      const orders = Array.isArray(data) ? data : data.orders || [];

      let added = 0;

      for (const order of orders) {
        if (!order.items || !Array.isArray(order.items)) continue;

        for (const item of order.items) {
          const activityKey = `order-${order._id}-${item.id}`;

          const exists = allActivities.some(
            a => a.details?.activityKey === activityKey
          );

          if (exists) continue;

          recordActivity(
            'update',
            {
              _id: item.id,
              title: item.title || 'Unknown'
            },
            {
              reason: `Order #${order.orderId}`,
              stockChange: -Math.abs(item.quantity),
              orderId: order._id,
              activityKey
            },
            'Customer Order'
          );

          added++;
        }
      }

      if (added > 0) {
        console.log(`✅ ${added} order activities synced`);
        showToast(`Synced ${added} order updates`, 'success');
      }

      localStorage.setItem(SYNC_KEY, now.toString());

    } catch (err) {
      console.error("❌ Order sync failed:", err);
    }
  }

  /* ----------------------------- Initialization ----------------------------- */
  function setupInitialUI() {
    const search = document.getElementById("search-input");
    if (search) search.addEventListener("input", debounce(filterInventory, 250));
    const priceMin = document.getElementById("price-min");
    const priceMax = document.getElementById("price-max");
    if (priceMin) priceMin.addEventListener("change", () => filterInventory());
    if (priceMax) priceMax.addEventListener("change", () => filterInventory());
  }

  document.addEventListener("DOMContentLoaded", () => {
    console.log('🏁 Inventory page loaded');

    // ✅ Auth check
    if (!checkAdminAuth()) return;

    // ✅ Setup UI
    setupInitialUI();

    // ✅ Load inventory & activities
    loadInventory();
    initializeActivitiesSystem();

    // ================= STOCK ADJUSTMENT FORM =================
    const stockForm = document.getElementById("stockForm");
    if (stockForm) {
      stockForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("stock-item-id").value;
        const type = document.getElementById("adjustment-type").value;
        const qty = Number(document.getElementById("adjustment-quantity").value) || 0;

        if (!id || qty <= 0) {
          showToast("Invalid stock adjustment", "warning");
          return;
        }

        try {
          const currentBook = await getBookById(id);
          if (!currentBook) throw new Error("Book not found");

          let newStock = Number(currentBook.stock || 0);

          if (type === "add") newStock += qty;
          else if (type === "remove") newStock = Math.max(0, newStock - qty);
          else if (type === "set") newStock = qty;

          await editItem(id, { stock: newStock });

          closeStockModal();
        } catch (err) {
          console.error("Stock adjust error:", err);
          showToast("Failed to adjust stock", "error");
        }
      });
    }

    // ================= BULK STOCK FORM =================
    // Find the bulkStockForm event listener
    const bulkStockForm = document.getElementById("bulkStockForm");
    if (bulkStockForm) {
      bulkStockForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const type = document.getElementById("bulk-adjustment-type").value;
        const qty = Number(document.getElementById("bulk-adjustment-quantity").value) || 0;
        const reason = document.getElementById("bulk-adjustment-reason").value || "Bulk adjustment";

        if (qty <= 0 || selectedBookIds.size === 0) {
          showToast("Select items and enter a valid quantity", "warning");
          return;
        }

        showLoading(true);

        try {
          for (const id of selectedBookIds) {
            const currentBook = await getBookById(id);
            if (!currentBook) continue;

            let newStock = Number(currentBook.stock || 0);
            if (type === "add") newStock += qty;
            else if (type === "set") newStock = qty;
            
            const stockChange = newStock - currentBook.stock;
            
            // ✅ Record activity for each book
            recordActivity('update', currentBook, {
              reason: reason,
              stockChange: stockChange,
              previousStock: currentBook.stock,
              newStock: newStock
            });

            await editItem(id, { stock: newStock });
          }

          showToast("Bulk update applied", "success");
          selectedBookIds.clear();
          updateBulkButtonsState();
          closeBulkStockModal();
          await loadInventory();

        } catch (err) {
          console.error("Bulk update error:", err);
          showToast("Bulk update failed", "error");
        } finally {
          showLoading(false);
        }
      });
    }

    // ================= MODAL OUTSIDE CLICK =================
    window.addEventListener("click", (event) => {
      document.querySelectorAll(".modal").forEach(modal => {
        if (event.target === modal) modal.style.display = "none";
      });
    });

    // ================= ESC KEY =================
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal();
        closeConfirmation();
      }
    });

    // ================= AUTO SYNC =================
    setInterval(() => {
      if (document.visibilityState === 'visible' && !isSyncing) {
        loadInventory();
      }
    }, 30000); // 30 seconds
  });

  function updateBulkAdjustmentUI() {
    const type = document.getElementById("bulk-adjustment-type").value;
    const help = document.getElementById("bulk-adjustment-help");

    if (!help) return;

    if (type === "add") {
      help.textContent = "This will add stock to all selected items.";
    } else {
      help.textContent = "This will set the same stock value for all selected items.";
    }
  }

  // ✅ Export functions for global access
  window.closeModal = closeModal;
  window.closeStockModal = closeStockModal;
  window.closeBulkStockModal = closeBulkStockModal;
  window.closeReportModal = closeReportModal;
  window.closeConfirmation = closeConfirmation;
  window.deleteItem = deleteItem;
  window.confirmBulkDeleteItems = confirmBulkDeleteItems;
  window.bulkAdjustStock = bulkAdjustStock;
  window.toggleSelectAll = toggleSelectAll;
  window.updateAdjustmentUI = updateAdjustmentUI;
  window.showLowStockReport = showLowStockReport;
  window.closeReportModal = closeReportModal;
  window.printReport = printReport;
  window.exportLowStockReport = exportLowStockReport;
  window.exportInventory = exportInventory;
  window.sortInventory = sortInventory;
  window.backupInventory = backupInventory;
  window.restoreInventory = restoreInventory;
  window.handleCSVImport = handleCSVImport;
  window.manualSyncInventory = manualSyncInventory;
  window.confirmClearAllData = confirmClearAllData;
  
  // ✅ ADD ACTIVITIES EXPORTS
  window.filterActivities = filterActivities;
  window.clearActivitiesFilters = clearActivitiesFilters;
  window.applyDateRange = applyDateRange;
  window.exportActivities = exportActivities;
  window.confirmClearActivities = confirmClearActivities;
  window.renderActivities = renderActivities;
  window.syncOrderInventoryActivities = syncOrderInventoryActivities;