// backend/controllers/inventoryController.js
const Book = require('../models/Book');

// Check inventory status (public)
exports.checkInventory = async (req, res) => {
  try {
    const { bookId } = req.params;
    console.log(`📦 Inventory check request for: ${bookId}`);
    
    // Try to find by custom 'id' field first (like "slrspt-book-031")
    let book = await Book.findOne({ id: bookId });
    
    if (!book) {
      console.log(`⚠️ Book not found by custom ID "${bookId}", trying by MongoDB _id`);
      // If not found by custom id, try by MongoDB _id
      try {
        book = await Book.findById(bookId);
      } catch (err) {
        console.log(`❌ ${bookId} is not a valid MongoDB ObjectId`);
      }
    }
    
    if (!book) {
      console.log(`❌ Book not found with ID: ${bookId}`);
      return res.status(404).json({
        success: false,
        error: 'Book not found',
        message: `Book with ID "${bookId}" not found in database`
      });
    }
    
    // In checkInventory function, update this part:
    const stock = book.stock || 0;
    const inStock = stock > 0;
    const status = inStock ? 'active' : 'out_of_stock'; // ADD THIS LINE

    console.log(`✅ Book found: "${book.title}" - Stock: ${stock}`);

    res.json({
      success: true,
      bookId: book.id || book._id,
      title: book.title,
      stock: stock,
      available: stock,
      sold: book.sold || 0,
      inStock: inStock,
      status: status, // USE THE CORRECT STATUS
      canPurchase: inStock,
      message: inStock ? `In Stock (${stock} available)` : 'Out of Stock'
    });
    
  } catch (error) {
    console.error('❌ Error in inventory check:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to check inventory'
    });
  }
};

// ✅ Batch inventory check (for book grid & cart)
exports.checkInventoryBatch = async (req, res) => {
  try {
    const ids = req.query.ids;
    if (!ids) return res.json({});

    const bookIds = ids.split(',');
    const result = {};

    for (const id of bookIds) {
      let book = await Book.findOne({ id }); // try custom id first

      if (!book) {
        try {
          book = await Book.findById(id); // fallback to MongoDB _id
        } catch (err) {
          console.log(`❌ Invalid ObjectId: ${id}`);
        }
      }

      if (!book) {
        result[id] = {
          available: 0,
          stock: 0,
          inStock: false,
          status: 'not_found'
        };
        continue;
      }

      result[id] = {
        title: book.title,
        available: book.stock || 0,
        stock: book.stock || 0,
        inStock: (book.stock || 0) > 0,
        status: (book.stock || 0) > 0 ? 'active' : 'out_of_stock'
      };
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Batch inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Batch inventory failed',
      error: error.message
    });
  }
};

// Get low stock books (public)
exports.getLowStock = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    
    const lowStockBooks = await Book.find({
      stock: { $lte: threshold, $gt: 0 },
      status: 'active'
    }).sort({ stock: 1 });
    
    const outOfStockBooks = await Book.find({
      stock: 0,
      status: 'out_of_stock'
    });
    
    res.json({
      success: true,
      threshold,
      lowStock: lowStockBooks.map(book => ({
        id: book._id,
        title: book.title,
        stock: book.stock,
        price: book.price
      })),
      outOfStock: outOfStockBooks.map(book => ({
        id: book._id,
        title: book.title
      }))
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reserve items when added to cart
exports.reserveStock = async (req, res) => {
  try {
    const { bookId, quantity } = req.body;
    
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    if (book.stock < quantity) {
      return res.status(400).json({
        error: 'Insufficient stock',
        available: book.stock,
        requested: quantity,
        message: `Only ${book.stock} available for "${book.title}"`
      });
    }
    
    // For now, just return success - in production you'd track reservations
    res.json({
      success: true,
      reserved: quantity,
      remainingStock: book.stock,
      message: `${quantity} items reserved for "${book.title}"`
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Release reserved items
exports.releaseStock = async (req, res) => {
  try {
    const { bookId, quantity } = req.body;
    
    res.json({
      success: true,
      released: quantity,
      message: `Released ${quantity} items`
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update after successful purchase
exports.updateStockAfterPurchase = async (req, res) => {
  try {
    const { items } = req.body;
    
    const updates = [];
    
    for (const item of items) {
      const book = await Book.findById(item.bookId);
      if (book) {
        const newStock = Math.max(0, book.stock - item.quantity);
        const updatedBook = await Book.findByIdAndUpdate(
          item.bookId,
          {
            stock: newStock,
            $inc: { sold: item.quantity },
            status: newStock <= 0 ? 'out_of_stock' : 'active',
            lastUpdated: new Date()
          },
          { new: true }
        );
        
        updates.push({
          bookId: item.bookId,
          title: updatedBook.title,
          quantity: item.quantity,
          remainingStock: updatedBook.stock,
          status: updatedBook.status
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Stock updated after purchase',
      updates
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bulk update stock (admin)
exports.bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body;
    
    res.json({
      success: true,
      message: 'Bulk update would process here',
      updatesCount: updates ? updates.length : 0
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
