// js/orderService.js

class OrderService {
  constructor() {
    this.baseURL = '/api/orders';
  }

  getToken() {
    return localStorage.getItem('token');
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {})
    };
  }

  // ✅ Create order
  async createOrder(orderData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(orderData)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to create order');

      return result;
    } catch (error) {
      console.error('❌ Order creation failed:', error);
      throw error;
    }
  }

  // ✅ Checkout
  async checkout(orderData, userEmail = null, userId = null) {
    try {
      const response = await fetch(`${this.baseURL}/checkout`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          orderData,
          userEmail,
          userId
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Checkout failed');

      return result;
    } catch (error) {
      console.error('❌ Checkout failed:', error);
      throw error;
    }
  }

  // ✅ Verify amounts
  async verifyAmounts(items, shippingCost = 0, discount = 0) {
    const response = await fetch(`${this.baseURL}/verify-amounts`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ items, shippingCost, discount })
    });

    return response.json();
  }

  // ✅ Get user orders
  async getUserOrders() {
    const response = await fetch(`${this.baseURL}/my-orders`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to fetch orders');

    return result;
  }

  // ✅ Get single order
  async getOrder(orderId) {
    const response = await fetch(`${this.baseURL}/${orderId}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to fetch order');

    return result;
  }
}

// Global instance
const orderService = new OrderService();
