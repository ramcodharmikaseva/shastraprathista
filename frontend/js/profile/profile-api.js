// profile-api.js
class ProfileAPI {
    constructor() {
        this.API_BASE_URL = window.location.origin + '/api';
    }

    async getProfile() {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No authentication token found');

            const response = await fetch(`${this.API_BASE_URL}/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error(`Failed to fetch profile: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API Error - getProfile:', error);
            throw error;
        }
    }

    async updateProfile(profileData) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE_URL}/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });
            
            if (!response.ok) throw new Error('Failed to update profile');
            return await response.json();
        } catch (error) {
            console.error('API Error - updateProfile:', error);
            throw error;
        }
    }

    async getUserOrders() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE_URL}/profile/orders/history`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch orders');
            return await response.json();
        } catch (error) {
            console.error('API Error - getUserOrders:', error);
            throw error;
        }
    }

    async getOrder(orderId) {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No authentication token found');

            const response = await fetch(`${this.API_BASE_URL}/profile/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error(`Failed to fetch order: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API Error - getOrder:', error);
            throw error;
        }
    }
}

// Export as global
window.ProfileAPI = ProfileAPI;