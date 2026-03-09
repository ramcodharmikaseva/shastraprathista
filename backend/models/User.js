const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[6-9]\d{9}$/.test(v);
      },
      message: 'Invalid phone number format'
    }
  },
  // UPDATE ROLE ENUM VALUES:
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin', 'music_admin', 'hall_admin'], // Updated
    default: 'user'
  },
  // ADD PERMISSIONS FIELD FOR FINE-GRAINED CONTROL:
  permissions: [{
    resource: String, // 'books', 'music', 'hall', 'users', 'orders'
    actions: [String] // ['read', 'create', 'update', 'delete', 'manage']
  }],
  // Add admin-specific fields
  adminAccess: {
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date
  },
  defaultBillingAddress: {
    fullName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
    landmark: String
  },
  defaultShippingAddress: {
    fullName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
    landmark: String,
    phone: String
  },
  addressBook: [{
    type: {
      type: String,
      enum: ['billing', 'shipping', 'both'],
      default: 'both'
    },
    fullName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: String,
    landmark: String,
    phone: String,
    isDefault: { type: Boolean, default: false }
  }],
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }]
}, {
  timestamps: true
});

// Add method to generate token with role
userSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      id: this._id, 
      email: this.email, 
      role: this.role,
      name: this.name,
      permissions: this.permissions
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Add method to check permission
userSchema.methods.hasPermission = function(resource, action) {
  if (this.role === 'super_admin') return true;
  
  const permission = this.permissions.find(p => p.resource === resource);
  return permission && permission.actions.includes(action);
};

module.exports = mongoose.model('User', userSchema);