const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({

  // 🔑 FRONTEND ↔ BACKEND LINK (OPTIONAL BUT USEFUL)
  id: { 
    type: String,
    unique: true,
    sparse: true   // ✅ prevents duplicate null issues
  },

  // 📘 BASIC BOOK INFO
  title: { 
    type: String, 
    required: true 
  },
  author: { 
    type: String, 
    default: 'Unknown Author' 
  },

  // 🔢 ISBN NUMBER (SIMPLIFIED VALIDATION)
  isbn: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function(v) {
        // Allow empty ISBN
        if (!v || v.trim() === '') return true;
        
        // Remove all non-digits
        const digitsOnly = v.replace(/\D/g, '');
        
        // Accept 10 or 13 digits
        return digitsOnly.length === 10 || digitsOnly.length === 13;
      },
      message: 'ISBN must be 10 or 13 digits.'
    }
  },

  // 💰 PRICING
  price: { 
    type: Number, 
    required: true 
  },
  originalPrice: { 
    type: Number, 
    default: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // 📦 INVENTORY
  stock: { 
    type: Number, 
    default: 10,
    min: 0
  },
  sold: {
    type: Number,
    default: 0,
    min: 0
  },
  threshold: {
    type: Number,
    default: 5,
    min: 1
  },

  // 🏷️ CATEGORY & DESCRIPTION
  category: { 
    type: String, 
    default: 'General' 
  },
  description: { 
    type: String,
    default: ''
  },

  // 🖼️ IMAGES (MULTIPLE IMAGES)
  images: {
    type: [String],
    default: []
  },

  // 📚 BOOK SPECS
  specs: {
    publisher: { type: String, default: '' },
    language: { type: String, default: '' },
    pages: { type: Number, default: 0 },
    size: { type: String, default: '' },
    isbn: { type: String, default: '' } // Keep in specs too for compatibility
  },

  // 🚚 SHIPPING
  weight: { 
    type: Number, 
    default: 500 // grams
  },

  // 📌 STATUS
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'inactive', 'out_of_stock']
  },

  // ⏱️ TIMESTAMPS
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }

}, {
  // Add virtuals for calculated fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 📊 VIRTUAL FIELDS
BookSchema.virtual('discountedPrice').get(function() {
  if (this.discount > 0 && this.discount <= 100) {
    return Math.round(this.price - (this.price * this.discount / 100));
  }
  return this.price;
});

BookSchema.virtual('inStock').get(function() {
  return this.stock > 0;
});

BookSchema.virtual('weightInKg').get(function() {
  return (this.weight / 1000).toFixed(2);
});

// 📚 SIMPLE ISBN VALIDATION FUNCTION
function isValidISBN(isbn) {
  if (!isbn || typeof isbn !== 'string') return false;
  
  // Clean the ISBN
  const cleanISBN = isbn.replace(/[^0-9X]/gi, '');
  
  // Accept 10 or 13 characters
  return cleanISBN.length === 10 || cleanISBN.length === 13;
}

// 🔄 AUTO UPDATE TIMESTAMP
BookSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  
  // Sync ISBN between root and specs if needed
  if (this.isbn && this.isbn !== this.specs.isbn) {
    this.specs.isbn = this.isbn;
  }
  
  next();
});

// 🔄 AUTO UPDATE STATUS FROM STOCK
BookSchema.pre('save', function(next) {
  if (this.stock <= 0) {
    this.status = 'out_of_stock';
  } else if (this.status === 'out_of_stock' && this.stock > 0) {
    this.status = 'active';
  }
  next();
});

// 🔍 INDEXES FOR FASTER SEARCHES
BookSchema.index({ isbn: 1 });
BookSchema.index({ title: 'text', author: 'text', description: 'text' });
BookSchema.index({ price: 1 });
BookSchema.index({ status: 1 });
BookSchema.index({ category: 1 });

module.exports = mongoose.model('Book', BookSchema);