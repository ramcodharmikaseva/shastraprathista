const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Link to user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  // Addresses from profile
  billingAddress: {
    fullName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    district: String,
    state: String,
    pincode: String,
    country: String,
    landmark: String
  },
  shippingAddress: {
    fullName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    district: String,
    state: String,
    pincode: String,
    country: String,
    landmark: String,
    phone: String
  },
  // Order items with verification
  items: [{
    id: String,
    title: String,
    author: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    originalPrice: Number,
    discount: Number,
    image: String,
    weight: Number,
    itemTotal: Number
  }],
  // Verified totals
  totals: {
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    shipping: {
      type: Number,
      required: true,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      default: 0
    }
  },
  // ✅ ADD THESE MISSING FIELDS:
  trackingNumber: {
    type: String,
    default: ''
  },
  courierName: {
    type: String,
    default: ''
  },
  shippedAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  // Payment verification
  paymentMethod: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: String,
    paymentDate: Date,
    paymentGateway: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    previousStatus: String,
    updatedAt: {
      type: Date,
      default: Date.now
    },
    updatedBy: mongoose.Schema.Types.ObjectId,
    updatedByRole: String,
    notes: String,
    trackingNumber: String,
    courierName: String
  }],
  shippingRegion: String,
  discountCode: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ✅ FIXED: Auto-calculate totals WITHOUT tax and WITHOUT discount subtraction
orderSchema.pre('save', function(next) {
  // Calculate subtotal from items (already includes discounts)
  this.totals.subtotal = this.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  // ✅ NO TAX
  this.totals.tax = 0;
  
  // ✅ FIXED: Don't subtract discount (it's already applied in item prices)
  this.totals.total = this.totals.subtotal + this.totals.shipping;
  
  this.updatedAt = Date.now();
  next();
});

// ✅ FIXED: Update helper methods too
orderSchema.methods.calculateTotals = function() {
  const subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = this.totals.shipping || 0;
  
  return {
    subtotal: subtotal,
    shipping: shipping,
    discount: this.totals.discount || 0,
    tax: 0, // ✅ No tax
    total: subtotal + shipping // ✅ Don't subtract discount
  };
};

// ✅ FIXED: Update static method
orderSchema.statics.verifyOrderAmounts = function(items, shipping = 0, discount = 0) {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  return {
    subtotal: subtotal,
    shipping: shipping,
    discount: discount,
    tax: 0, // ✅ No tax
    total: subtotal + shipping, // ✅ Don't subtract discount
    isValid: subtotal >= 0 && (subtotal + shipping) >= 0
  };
};

module.exports = mongoose.model('Order', orderSchema);