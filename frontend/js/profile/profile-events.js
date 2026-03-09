// profile-events.js - Event handlers and exports
(function() {
    'use strict';
    
    // Check if already initialized
    if (window.profileInitialized) {
        console.log('Profile.js already initialized, skipping...');
        return;
    }
    window.profileInitialized = true;
    
    console.log('Initializing profile events...');
    
    // Setup initialization
    function setupInitialization() {
        console.log('🔧 Setting up profile app initialization...');
        
        let initialized = false;
        
        function safeInitialize() {
            if (initialized) {
                console.log('🔄 Profile app already initialized, skipping...');
                return;
            }
            
            console.log('🚀 Initializing profile app...');
            initialized = true;
            window.profileAppInitialized = true;
            
            try {
                window.ProfileManager.initializeApp();
            } catch (error) {
                console.error('❌ Failed to initialize profile app:', error);
                initialized = false;
                window.profileAppInitialized = false;
            }
        }
        
        // Method 1: If DOM is already ready, initialize immediately
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                console.log('📄 DOM Content Loaded');
                safeInitialize();
            });
        } else {
            console.log('📄 DOM already ready');
            setTimeout(safeInitialize, 100);
        }
        
        // Method 2: Fallback for slow-loading pages
        window.addEventListener('load', function() {
            console.log('🌐 Window fully loaded');
            setTimeout(function() {
                if (!window.profileAppInitialized) {
                    console.log('⚠️ Initializing from window.load fallback');
                    safeInitialize();
                }
            }, 500);
        });
    }
    
    // Export all functions to window
    window.enableProfileEdit = () => window.ProfileUI.enableProfileEdit();
    window.cancelEdit = () => window.ProfileUI.cancelEdit();
    window.saveProfile = () => window.ProfileManager.saveProfile();
    window.loadProfile = () => window.ProfileManager.loadProfile();
    window.viewOrderDetails = (orderId) => window.ProfileOrders.viewOrderDetails(orderId);
    window.closeModal = () => window.ProfileUI.closeModal();
    window.downloadInvoice = (orderId, event) => window.ProfileInvoice.downloadInvoice(orderId, event);
    window.cancelOrder = (orderId) => window.ProfileOrders.cancelOrder(orderId);
    window.filterOrders = () => window.ProfileOrders.filterOrders();
    window.changePage = (page) => window.ProfileOrders.changePage(page);
    window.showTopToast = (message, type) => window.ProfileUtils.showTopToast(message, type);
    
    // Start the initialization
    setupInitialization();
    
    console.log('✅ Profile events initialized successfully');
})();