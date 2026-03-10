// profile-main.js - Main Controller (100 lines)
class ProfileManager {
    constructor() {
        this.api = new window.ProfileAPI();
        this.ui = window.ProfileUI;
        this.orders = window.ProfileOrders;
        this.invoice = window.ProfileInvoice;
        this.utils = window.ProfileUtils;
        
        this.initialized = false;
        this.userRole = null; // ✅ ADD THIS to store user role
    }

    async loadProfile() {
        try {
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            const token = localStorage.getItem('token');
            
            if (!currentUser || !token) {
                this.utils.showTopToast("Please login to view your profile", "error");
                setTimeout(() => window.location.href = "login.html", 1500);
                return;
            }

            console.log('🔍 Loading profile for:', currentUser.email);

            // Try API first
            try {
                console.log('📡 Fetching profile from API...');
                const responseData = await this.api.getProfile();
                
                console.log('📊 Full API response:', responseData);
                
                // Check different possible response formats
                if (responseData && responseData.success && responseData.profile) {
                    // Format 1: {success: true, profile: {...}, recentOrders: [...]}
                    console.log('✅ Profile data loaded from API (format 1)');
                    console.log('📧 Email from API:', responseData.profile.email);
                    
                    // ✅ ADD THIS: Store user role
                    this.userRole = responseData.profile.role || 'user';
                    console.log('👤 User role detected:', this.userRole);
                    
                    this.ui.displayProfileData(responseData.profile);
                    return;
                    
                } else if (responseData && responseData.email) {
                    // Format 2: Direct profile object {email: "...", name: "...", ...}
                    console.log('✅ Profile data loaded from API (format 2)');
                    console.log('📧 Email from API:', responseData.email);
                    
                    // ✅ ADD THIS: Store user role if available
                    this.userRole = responseData.role || 'user';
                    
                    this.ui.displayProfileData(responseData);
                    return;
                    
                } else {
                    console.warn('⚠️ API returned data in unexpected format');
                    console.warn('Response keys:', Object.keys(responseData || {}));
                    throw new Error('Invalid API response format');
                }
                
            } catch (apiError) {
                console.warn('⚠️ API fetch failed:', apiError.message);
                console.log('🔄 Falling back to localStorage...');
                this.loadProfileFromLocalStorage();
            }
            
        } catch (error) {
            console.error('❌ Error in loadProfile:', error);
            this.utils.showTopToast("Failed to load profile", "error");
        }
    }

    loadProfileFromLocalStorage() {
        try {
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            if (!currentUser) return;

            // ✅ ADD THIS: Get role from localStorage
            this.userRole = currentUser.role || 'user';
            
            this.ui.displayProfileData(currentUser);
            this.orders.loadHistory(currentUser);
            
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }
    

    async saveProfile() {
        const nameInput = document.getElementById("editName");
        const phoneInput = document.getElementById("editPhone");
        
        if (!nameInput || !phoneInput) {
            this.utils.showTopToast("Profile edit form not found", "error");
            return;
        }
        
        // Validate inputs
        const isNameValid = this.utils.validateFormInput(nameInput, 'name');
        const isPhoneValid = this.utils.validateFormInput(phoneInput, 'phone');
        
        if (!isNameValid || !isPhoneValid) {
            this.utils.showTopToast("Please fix validation errors before saving", "error");
            return;
        }
        
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        
        const profileData = { name, phone };
        
        try {
            const result = await this.api.updateProfile(profileData);
            
            if (result.success) {
                localStorage.setItem("currentUser", JSON.stringify(result.profile));
                this.utils.showTopToast("Profile updated successfully!", "success");
                this.loadProfile();
            }
        } catch (apiError) {
            console.warn('API update failed, saving to localStorage only:', apiError);
            
            // Fallback to localStorage
            const currentUser = JSON.parse(localStorage.getItem("currentUser") || '{}');
            const updatedUser = { ...currentUser, ...profileData };
            
            const users = JSON.parse(localStorage.getItem("users")) || [];
            const userIndex = users.findIndex(u => u.email === currentUser.email);
            if (userIndex !== -1) {
                users[userIndex] = updatedUser;
                localStorage.setItem("users", JSON.stringify(users));
            }
            
            localStorage.setItem("currentUser", JSON.stringify(updatedUser));
            this.utils.showTopToast("Profile updated (offline mode)!", "success");
            this.loadProfile();
        }
    }

    setupEventListeners() {
        if (this.eventListenersSetup) {
            console.log('⚠️ Event listeners already setup, skipping...');
            return;
        }
        this.eventListenersSetup = true;
        
        // Search input
        const searchInput = document.getElementById("orderSearch");
        if (searchInput) {
            searchInput.replaceWith(searchInput.cloneNode(true));
            const newSearchInput = document.getElementById("orderSearch");
            const debouncedFilter = this.utils.debounce(() => this.orders.filterOrders(), 300);
            newSearchInput.addEventListener('input', debouncedFilter);
            console.log('✅ Search event listener added');
        }

        // Edit profile button
        const editProfileBtn = document.getElementById("editProfileBtn");
        if (editProfileBtn) {
            editProfileBtn.replaceWith(editProfileBtn.cloneNode(true));
            const newEditBtn = document.getElementById("editProfileBtn");
            newEditBtn.addEventListener('click', () => this.ui.enableProfileEdit());
            console.log('✅ Edit profile button listener added');
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') this.ui.closeModal();
        });

        // Close modal when clicking outside
        if (!window.modalClickListenerAdded) {
            window.addEventListener('click', (event) => {
                const modal = document.getElementById("orderModal");
                if (event.target === modal) this.ui.closeModal();
            });
            window.modalClickListenerAdded = true;
        }
        
        console.log('✅ All event listeners setup complete');
    }

    startOrderStatusMonitor() {
        console.log('🔍 Starting order status monitor...');

        let isRefreshing = false;
        let lastRun = 0;
        let intervalId = null;

        const refreshOrders = async (source = "interval") => {
            const now = Date.now();
            
            // ✅ FIX: Increase cooldown to prevent rapid refreshes
            if (isRefreshing || (now - lastRun < 30000)) { // 30 seconds cooldown
                console.log(`⏸️ Skipping refresh - too soon (${Math.round((now - lastRun)/1000)}s ago)`);
                return;
            }

            try {
                isRefreshing = true;
                lastRun = now;
                console.log(`🔄 Refreshing orders (${source})...`);
                
                // Only refresh orders, not profile
                await this.orders.loadHistory();
                
            } catch (error) {
                console.error("❌ Order refresh failed:", error);
            } finally {
                isRefreshing = false;
            }
        };

        // 🕒 Interval-based refresh (every 30s)
        intervalId = setInterval(() => {
            if (document.visibilityState === 'visible') {
                refreshOrders("interval");
            }
        }, 30000); // ✅ 30 seconds

        // 👁️ Refresh when user returns to tab (with delay)
        const visibilityHandler = () => {
            if (document.visibilityState === 'visible') {
                // ✅ Add delay to prevent immediate refresh
                setTimeout(() => refreshOrders("visibility"), 2000);
            }
        };

        document.addEventListener('visibilitychange', visibilityHandler);

        // 🧹 Cleanup when leaving page
        window.addEventListener('beforeunload', () => {
            if (intervalId) clearInterval(intervalId);
            document.removeEventListener('visibilitychange', visibilityHandler);
            console.log('🧹 Order monitor cleaned up');
        });

        console.log('✅ Order status monitor started (30s interval)');
    }

    initializeApp() {
        if (this.initialized) {
            console.log('⚠️ App already initialized, skipping...');
            return;
        }
        this.initialized = true;
        
        console.log('Initializing profile app...');
        
        this.ui.ensureModalExists();
        this.setupEventListeners();
        
        // ✅ FIX: Load profile immediately
        this.loadProfile();
        
        // ✅ FIX: Wait a bit for DOM to be fully ready before loading orders
        setTimeout(() => {
            if (document.getElementById('historyBody')) {
                // Load orders immediately
                this.orders.loadHistory();
                // Then start the monitor
                this.startOrderStatusMonitor();
            } else {
                console.warn('History table not found yet, retrying...');
                // Retry after 500ms
                setTimeout(() => {
                    if (document.getElementById('historyBody')) {
                        this.orders.loadHistory();
                        this.startOrderStatusMonitor();
                    }
                }, 500);
            }
        }, 100); // Small delay to ensure DOM is ready
        
        console.log('✅ Profile app initialized');
    }
}

// Export as global
window.ProfileManager = new ProfileManager();