const START_YEAR = 2025;
const END_YEAR = 2030;

let adminBookings = {};

const params = new URLSearchParams(window.location.search);
let currentHall = params.get("hall") || "CHOKKAR";

// ✅ ROLE-BASED ACCESS CONTROL - Add this function
// In hall-admin.js, update the checkHallAdminAccess function:
async function checkHallAdminAccess() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login.html';
      return false;
    }
    
    // Get user profile to check role
    const response = await fetch('/api/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const userRole = data.profile.role;
      
      // ✅ FIXED: Include 'admin' role in the list
      const hallAdminRoles = ['hall_admin', 'super_admin', 'admin'];
      
      if (!hallAdminRoles.includes(userRole)) {
        // Redirect based on role
        const redirectMap = {
          'super_admin': '/admin.html',
          'admin': '/admin.html', // Add this line
          'music_admin': '/music-admin.html',
          'user': '/profile.html'
        };
        
        window.location.href = redirectMap[userRole] || '/profile.html';
        return false;
      }
      
      return true; // Access granted
    } else {
      window.location.href = '/login.html';
      return false;
    }
  } catch (error) {
    console.error('Error checking hall admin access:', error);
    window.location.href = '/login.html';
    return false;
  }
}

function loadSharedHeader() {
  fetch("../header.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("header-container").innerHTML = html;
      if (typeof initCommon === "function") {
        initCommon();
      }
    })
    .catch(err => console.error("Header load failed", err));
}

// ✅ REPLACE THE OLD protectAdminPage function with this:
(function protectAdminPage() {
  const token = localStorage.getItem("token");
  
  if (!token) {
    alert("Authentication required");
    window.location.href = "/login.html";
    return;
  }
  
  // We'll check the role asynchronously
  checkHallAdminAccess().then(hasAccess => {
    if (!hasAccess) {
      alert("Access denied. Hall admin access required.");
      // User will be redirected by checkHallAdminAccess()
    }
  });
})();

const API = "/api/halls";

function buildAdminYearSelector() {
  const sel = document.getElementById("adminYear");
  sel.innerHTML = "";

  const currentYear = new Date().getFullYear();

  for (let y = START_YEAR; y <= END_YEAR; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true; // ⭐ REQUIRED
    sel.appendChild(opt);
  }

  sel.onchange = () => loadAdminBookings();
}

// ✅ Update the loadAdminBookings function to handle role-based API responses
async function loadAdminBookings() {
  const hallVal = currentHall;
  const year = document.getElementById("adminYear").value;

  try {
    const res = await fetch(`/api/halls/bookings?hall=${hallVal}&year=${year}`, {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem('token')
      }
    });

    // Handle 403 (Forbidden) - User doesn't have hall_admin role
    if (res.status === 403) {
      alert("Access denied. You need hall admin permissions to view bookings.");
      window.location.href = '/profile.html';
      return;
    }

    if (!res.ok) throw new Error("API failed");

    const data = await res.json();
    adminBookings = {};

    data.forEach(b => {
      adminBookings[b.date] = b;
    });

  } catch (err) {
    console.warn("Booking API failed:", err);
    adminBookings = {};
    
    // Show error message
    const cal = document.getElementById("adminCalendar");
    if (cal) {
      cal.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #e74c3c;">
          <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
          <h3>Error Loading Bookings</h3>
          <p>${err.message || 'Failed to load bookings. Please check your permissions.'}</p>
        </div>
      `;
    }
  }

  renderAdminCalendar(year);
}

function renderAdminCalendar(year) {
  const cal = document.getElementById("adminCalendar");
  cal.innerHTML = "";

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let currentMonthElement = null;

  for (let m = 0; m < 12; m++) {
    const monthEl = renderAdminMonth(year, m);
    cal.appendChild(monthEl);

    if (Number(year) === currentYear && m === currentMonth) {
      currentMonthElement = monthEl;
    }
  }

  // 🎯 Auto-scroll ONLY for today’s year
  if (currentMonthElement && Number(year) === currentYear) {
    setTimeout(() => {
      currentMonthElement.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 120);
  }
}

function renderAdminMonth(y, m) {
  const box = document.createElement("div");
  box.className = "month";

  box.innerHTML = `
    <h3>${new Date(y, m).toLocaleString("en", { month: "long" })} ${y}</h3>
  `;

  /* Weekday header */
  const week = document.createElement("div");
  week.className = "weekdays";
  ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(d => {
    const w = document.createElement("div");
    w.textContent = d;
    week.appendChild(w);
  });

  /* Days grid */
  const grid = document.createElement("div");
  grid.className = "days-grid";

  const firstDay = new Date(y, m, 1).getDay();
  const totalDays = new Date(y, m + 1, 0).getDate();

  /* Empty cells */
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "day empty";
    grid.appendChild(empty);
  }

  /* Real days */
  for (let d = 1; d <= totalDays; d++) {
    const dateKey = `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const b = adminBookings[dateKey];

    const day = document.createElement("div");
    day.className = "day";
    day.textContent = d;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday =
      Number(y) === today.getFullYear() &&
      m === today.getMonth() &&
      d === today.getDate();

    /* ⭐ Highlight TODAY */
    if (isToday) {
      day.classList.add("today");
    }

    /* 🔒 Block past dates (EXCEPT TODAY) */
    if (!isToday && isPastDate(y, m, d)) {
      day.classList.add("blocked");
      day.style.pointerEvents = "none";
      grid.appendChild(day);
      continue;
    }

    /* 🎨 Booking colors - WITH BLOCKED DATES SUPPORT */
    if (b) {
      if (b.isBlocked) {
        day.classList.add("blocked-date"); // Green color
        day.setAttribute('title', b.blockedReason || 'Blocked by admin');
      } else if (b.morning && b.evening) {
        day.classList.add("full");
      } else if (b.morning) {
        day.classList.add("morning");
      } else if (b.evening) {
        day.classList.add("evening");
      }
    }

    /* CLICK HANDLER - Modified for select mode */
    day.onclick = (e) => {
      e.stopPropagation();
      
      if (isSelectMode) {
        // Toggle selection
        if (selectedDates.includes(dateKey)) {
          selectedDates = selectedDates.filter(d => d !== dateKey);
          day.classList.remove('selected');
        } else {
          selectedDates.push(dateKey);
          day.classList.add('selected');
        }
        
        // Update apply button text
        const applyBtn = document.getElementById('applyBlockBtn');
        if (applyBtn) {
          applyBtn.style.display = selectedDates.length > 0 ? 'inline-flex' : 'none';
          applyBtn.innerHTML = `<i class="fas fa-check-circle"></i> Apply Block (${selectedDates.length})`;
        }
      } else {
        // Normal click - open modal
        openModal(dateKey, b || {});
      }
    };

    grid.appendChild(day);
  }

  box.appendChild(week);
  box.appendChild(grid);
  return box;
}

// ✅ Update the saveModalBooking function to check for 403 AND blocked dates
async function saveModalBooking() {
  const hall = currentHall;
  const date = modalDate.value;

  const morning = modalMorning.checked;
  const evening = modalEvening.checked;

  const bookedBy = modalBookedBy.value.trim();
  const contact = modalContact.value.trim();
  const functionType = modalFunctionType.value.trim();

  /* ---------- CHECK IF DATE IS BLOCKED ---------- */
  const existing = adminBookings[date];
  if (existing && (existing.isBlocked === true || existing.bookedBy === 'SYSTEM_BLOCKED')) {
    showModalMessage("❌ Cannot modify a blocked date. Use unblock feature first.", true);
    return;
  }

  /* ---------- VALIDATION ---------- */
  if (!morning && !evening) {
    showModalMessage("Select at least one slot", true);
    return;
  }

  if (!bookedBy) {
    showModalMessage("Booked By (Name) is required", true);
    return;
  }

  if (!contact) {
    showModalMessage("Contact number is required", true);
    return;
  }

  /* ---------- CONFIRM UPDATE ---------- */
  if (
    existing &&
    existing.bookedBy === bookedBy &&
    existing.contact === contact &&
    existing.functionType === functionType &&
    existing.morning === morning &&
    existing.evening === evening
  ) {
    showModalMessage("No changes detected", true);
    return;
  }

  /* ---------- API CALL ---------- */
  try {
    const res = await fetch("/api/halls/book", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem('token')
      },
      body: JSON.stringify({
        hall,
        date,
        morning,
        evening,
        bookedBy,
        contact,
        functionType,
        isBlocked: false, // Explicitly set as NOT blocked
        blockedReason: ''
      })
    });

    // Handle 403 (Forbidden)
    if (res.status === 403) {
      showModalMessage("Access denied. Hall admin permissions required.", true);
      return;
    }

    // Handle 400 (Bad Request)
    if (res.status === 400) {
      const error = await res.json();
      showModalMessage(error.message || "Invalid request", true);
      return;
    }

    const data = await res.json();

    if (data.success) {
      showModalMessage("✅ Booking saved successfully!", false);
      setTimeout(() => {
        closeModal();
        loadAdminBookings();
      }, 500);
    } else {
      showModalMessage(data.message || "Failed to save booking", true);
    }
  } catch (error) {
    console.error("Save booking error:", error);
    showModalMessage("Failed to save booking: " + error.message, true);
  }
}

// ✅ Update the deleteModalBooking function with blocked date protection
async function deleteModalBooking() {
  const hall = currentHall;
  const date = modalDate.value;

  /* ---------- CHECK IF DATE IS BLOCKED ---------- */
  const existing = adminBookings[date];
  if (existing && (existing.isBlocked === true || existing.bookedBy === 'SYSTEM_BLOCKED')) {
    alert("❌ Cannot delete a blocked date. Use the 'Unblock' feature instead.");
    return;
  }

  if (!confirm("Are you sure you want to delete this booking? This action cannot be undone.")) {
    return;
  }

  try {
    const res = await fetch("/api/halls/book", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem('token')
      },
      body: JSON.stringify({ hall, date })
    });

    // Handle 403 (Forbidden)
    if (res.status === 403) {
      alert("Access denied. Hall admin permissions required.");
      return;
    }

    // Handle 404 (Not Found)
    if (res.status === 404) {
      alert("Booking not found. It may have been already deleted.");
      closeModal();
      loadAdminBookings();
      return;
    }

    if (res.ok) {
      const data = await res.json();
      alert("✅ " + (data.message || "Booking deleted successfully"));
      closeModal();
      loadAdminBookings();
    } else {
      const error = await res.json();
      alert("❌ Failed to delete: " + (error.message || "Unknown error"));
    }
  } catch (error) {
    console.error("Delete booking error:", error);
    alert("❌ Failed to delete booking: " + error.message);
  }
}

// =============================================
// NEW: BLOCKED DATES FUNCTIONS TO ADD
// =============================================

// Function to unblock a date (add this new function)
async function unblockDate(date) {
  if (!confirm(`Are you sure you want to unblock this date?`)) return;
  
  try {
    const res = await fetch("/api/halls/unblock-date", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem('token')
      },
      body: JSON.stringify({
        hall: currentHall,
        date: date
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      alert("✅ Date unblocked successfully");
      closeModal();
      loadAdminBookings();
    } else {
      alert("❌ Failed to unblock date: " + data.message);
    }
  } catch (error) {
    console.error("Unblock date error:", error);
    alert("❌ Error unblocking date");
  }
}

function showModalMessage(msg, error=false) {
  const el = document.getElementById("modalMessage");
  el.textContent = msg;
  el.style.color = error ? "red" : "green";
}

function openModal(dateKey, booking = {}) {
  modalDate.value = dateKey;

  modalMorning.checked = !!booking.morning;
  modalEvening.checked = !!booking.evening;

  modalBookedBy.value = booking.bookedBy || "";
  modalContact.value = booking.contact || "";
  modalFunctionType.value = booking.functionType || "";

  modalBookedAt.value = booking.createdAt
    ? new Date(booking.createdAt).toLocaleString()
    : "—";

  modalBookedByEmail.value = booking.createdByName || "Admin";

  modalMessage.textContent = "";
  modalMessage.style.color = "";

  // 🔴 CHECK IF THIS IS A BLOCKED DATE
  const isBlocked = booking.isBlocked === true || booking.bookedBy === 'SYSTEM_BLOCKED';
  
  const hasBooking = !!booking.bookedBy;

  if (isBlocked) {
    // Blocked date - show special message and unblock button
    setEditMode(false);
    document.getElementById("editBtn").style.display = "none";
    document.getElementById("saveBtn").style.display = "none";
    
    // Create or show unblock button
    let unblockBtn = document.getElementById("unblockBtn");
    if (!unblockBtn) {
      const actionsDiv = document.querySelector(".form-actions");
      unblockBtn = document.createElement("button");
      unblockBtn.id = "unblockBtn";
      unblockBtn.className = "warning";
      unblockBtn.innerHTML = '<i class="fas fa-unlock"></i> Unblock Date';
      unblockBtn.onclick = () => unblockDate(dateKey);
      actionsDiv.appendChild(unblockBtn);
    } else {
      unblockBtn.style.display = "inline-block";
    }
    
    modalMessage.innerHTML = `🔒 <strong>Blocked Date</strong><br>Reason: ${booking.blockedReason || 'Not specified'}`;
    modalMessage.style.color = "#27ae60";
  } else {
    // Regular booking or new booking
    // Hide unblock button if it exists
    const unblockBtn = document.getElementById("unblockBtn");
    if (unblockBtn) unblockBtn.style.display = "none";
    
    setEditMode(!hasBooking);
    document.getElementById("editBtn").style.display = hasBooking ? "inline-block" : "none";
    document.getElementById("saveBtn").style.display = hasBooking ? "none" : "inline-block";
  }

  bookingModal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function setEditMode(enabled) {
  modalMorning.disabled = !enabled;
  modalEvening.disabled = !enabled;
  modalBookedBy.disabled = !enabled;
  modalContact.disabled = !enabled;
  modalFunctionType.disabled = !enabled;

  document.getElementById("editBtn").style.display = enabled ? "none" : "inline-block";
  document.getElementById("saveBtn").style.display = enabled ? "inline-block" : "none";
}

function enableEdit() {
  setEditMode(true);
}

function closeModal() {
  bookingModal.style.display = "none";

  modalDate.value = "";
  modalMorning.checked = false;
  modalEvening.checked = false;
  modalBookedBy.value = "";
  modalContact.value = "";
  modalFunctionType.value = "";
  modalBookedAt.value = "";
  modalBookedByEmail.value = "";
  modalMessage.textContent = "";

  document.body.style.overflow = "";
}

window.onclick = e => {
  if (e.target === bookingModal) closeModal();
};

function isPastDate(year, month, day) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const check = new Date(year, month, day);
  check.setHours(0, 0, 0, 0);

  return check < today;
}

document.querySelectorAll(".hall-tab").forEach(btn => {
  btn.addEventListener("click", () => {

    /* ---------- UI STATE ---------- */
    document.querySelectorAll(".hall-tab").forEach(b =>
      b.classList.remove("active")
    );
    btn.classList.add("active");

    /* ---------- SET CURRENT HALL ---------- */
    currentHall = btn.dataset.hall;

    /* ---------- UPDATE URL (NO RELOAD) ---------- */
    const url = new URL(window.location);
    url.searchParams.set("hall", currentHall);
    window.history.replaceState({}, "", url);

    /* ---------- RESET MODAL IF OPEN ---------- */
    if (bookingModal.style.display === "flex") {
      closeModal();
    }

    /* ---------- CLEAR OLD DATA ---------- */
    adminBookings = {};
    document.getElementById("adminCalendar").innerHTML = "";

    /* ---------- RELOAD BOOKINGS ---------- */
    loadAdminBookings();
  });
});

// ✅ Update DOMContentLoaded to ensure access check completes
document.addEventListener("DOMContentLoaded", async () => {
  // First check access
  const hasAccess = await checkHallAdminAccess();
  if (!hasAccess) {
    return; // User will be redirected
  }
  
  // If access granted, load the page
  loadSharedHeader();
  buildAdminYearSelector();
  loadAdminBookings();

  // Set active hall tab from URL
  document.querySelectorAll(".hall-tab").forEach(btn => {
    if (btn.dataset.hall === currentHall) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
});

// =============================================
// NEW: BLOCKED DATES FUNCTIONS
// =============================================

let selectedDates = [];
let isSelectMode = false;

// Toggle selection mode
function toggleSelectMode() {
  isSelectMode = !isSelectMode;
  const btn = document.getElementById('selectModeBtn');
  
  if (isSelectMode) {
    btn.classList.add('active');
    btn.innerHTML = '<i class="fas fa-check"></i> Select Mode ON';
    selectedDates = [];
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '<i class="fas fa-lock"></i> Block Dates';
    selectedDates = [];
  }
  
  // Refresh calendar to show selection mode
  const year = document.getElementById('adminYear').value;
  renderAdminCalendar(year);
}

// Block selected dates
async function blockSelectedDates() {
  if (selectedDates.length === 0) {
    alert('Please select dates to block');
    return;
  }
  
  const reason = prompt('Enter reason for blocking (e.g., "Maintenance", "Private Event"):');
  if (reason === null) return;
  
  try {
    const res = await fetch('/api/halls/block-dates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        hall: currentHall,
        dates: selectedDates,
        reason: reason,
        morning: true,
        evening: true
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      alert(`✅ Successfully blocked ${selectedDates.length} dates`);
      selectedDates = [];
      isSelectMode = false;
      document.getElementById('selectModeBtn').classList.remove('active');
      document.getElementById('selectModeBtn').innerHTML = '<i class="fas fa-lock"></i> Block Dates';
      loadAdminBookings(); // Reload calendar
    } else {
      alert('❌ Failed to block dates: ' + data.message);
    }
  } catch (error) {
    console.error('Block dates error:', error);
    alert('❌ Error blocking dates');
  }
}
