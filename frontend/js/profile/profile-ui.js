// profile-ui.js - Simplified version for single profile section
class ProfileUI {
    constructor() {
        this.utils = window.ProfileUtils || {};
        this.isEditing = false;
    }

    // In profile-ui.js displayProfileData method:
    displayProfileData(profileData) {
        console.log('📊 Displaying profile data FROM API:', {
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
            createdAt: profileData.createdAt,
            role: profileData.role
        });
        
        // Update all profile fields
        document.getElementById('profileName').textContent = profileData.name || "Not provided";
        document.getElementById('profileEmail').textContent = profileData.email || "Not provided";
        document.getElementById('profilePhone').textContent = profileData.phone || "Not provided";
        
        // Get role from token if not in profile
        let userRole = profileData.role;
        if (!userRole) {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    userRole = payload.role;
                }
            } catch (e) {
                console.warn('Could not decode token for role:', e);
            }
        }
        
        // Display role if element exists
        const roleElement = document.getElementById('profileRole');
        if (roleElement) {
            const roleText = userRole === 'admin' ? 'Administrator' : 
                            userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 
                            'Customer';
            roleElement.textContent = roleText;
        }
        
        // Format and display member since date
        if (profileData.createdAt) {
            const date = new Date(profileData.createdAt);
            const formattedDate = date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            document.getElementById('memberSince').textContent = formattedDate;
        } else {
            document.getElementById('memberSince').textContent = "Not available";
        }
        
        // Update localStorage with complete data including role
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const updatedUser = {
            ...currentUser,
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
            role: userRole,  // Include role
            createdAt: profileData.createdAt
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        // Ensure edit button is visible
        const editProfileBtn = document.getElementById("editProfileBtn");
        if (editProfileBtn) {
            editProfileBtn.style.display = 'block';
            editProfileBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Profile';
            editProfileBtn.disabled = false;
        }
    }

    enableProfileEdit() {
        console.log('Enabling profile edit...');
        this.isEditing = true;
        
        // Get current user data
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || '{}');
        
        // Hide view section, show edit form
        document.getElementById('profileInfoView').style.display = 'none';
        document.getElementById('profileEditForm').style.display = 'block';
        
        // Fill form with current data
        document.getElementById('editName').value = currentUser.name || '';
        document.getElementById('editPhone').value = currentUser.phone || '';
        
        // Update edit button state
        const editProfileBtn = document.getElementById("editProfileBtn");
        if (editProfileBtn) {
            editProfileBtn.style.display = 'none';
        }
        
        // Use ProfileUtils.showTopToast
        if (this.utils.showTopToast) {
            this.utils.showTopToast("You can now edit your profile", "info");
        }
    }

    cancelEdit() {
        console.log('Cancelling edit...');
        this.isEditing = false;
        
        // Show view section, hide edit form
        document.getElementById('profileInfoView').style.display = 'block';
        document.getElementById('profileEditForm').style.display = 'none';
        
        // Show edit button again
        const editProfileBtn = document.getElementById("editProfileBtn");
        if (editProfileBtn) {
            editProfileBtn.style.display = 'block';
        }
        
        // Use ProfileUtils.showTopToast
        if (this.utils.showTopToast) {
            this.utils.showTopToast("Edit cancelled", "info");
        }
    }

    showEditSuccess() {
        this.cancelEdit(); // This will switch back to view mode
        // Use ProfileUtils.showTopToast
        if (this.utils.showTopToast) {
            this.utils.showTopToast("Profile updated successfully!", "success");
        }
    }

    showEditError(message = "Failed to update profile") {
        // Use ProfileUtils.showTopToast
        if (this.utils.showTopToast) {
            this.utils.showTopToast(message, "error");
        }
    }

    // Validation for edit form
    validateProfileForm() {
        const name = document.getElementById('editName').value.trim();
        const phone = document.getElementById('editPhone').value.trim();
        
        let errors = [];
        
        // Name validation
        if (!name) {
            errors.push("Name is required");
        } else if (name.length < 2 || name.length > 50) {
            errors.push("Name must be 2-50 characters");
        } else if (!/^[A-Za-z\s]+$/.test(name)) {
            errors.push("Name can only contain letters and spaces");
        }
        
        // Phone validation
        if (!phone) {
            errors.push("Phone number is required");
        } else if (!/^[6-9]\d{9}$/.test(phone)) {
            errors.push("Please enter a valid 10-digit Indian phone number");
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors,
            data: { name, phone }
        };
    }

    // Helper method to show validation errors
    showValidationErrors(errors) {
        if (errors.length > 0 && this.utils.showTopToast) {
            this.utils.showTopToast(errors.join('. '), 'error');
        }
    }

    // Modal functions (for order details)
    ensureModalExists() {
        if (!document.getElementById('orderModal')) {
            const modalHTML = `
                <div id="orderModal" class="modal">
                    <div id="orderModalContent" class="modal-content">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
        
        this.ensureModalStyles();
    }

    ensureModalStyles() {
        if (!document.getElementById('profile-modal-styles')) {
            const modalStyles = `
            <style id="profile-modal-styles">
                .modal {
                    display: none;
                    position: fixed;
                    z-index: 1000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                }
                
                .modal-content {
                    background-color: white;
                    margin: 2% auto;
                    padding: 20px;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 900px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                }
                
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #f0f0f0;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                }
            </style>
            `;
            document.head.insertAdjacentHTML('beforeend', modalStyles);
        }
    }

    closeModal() {
        const modal = document.getElementById("orderModal");
        if (modal) modal.style.display = "none";
    }
}

// Export as global
window.ProfileUI = new ProfileUI();