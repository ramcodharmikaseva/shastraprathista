const express = require("express");
const router = express.Router();
const Book = require("../models/Book");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const bookId = req.params.id || Date.now().toString();
    const uploadPath = path.join(__dirname, "../public/images/book" + bookId);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `book${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  }
});


// ✅ Get all books
router.get("/", async (req, res) => {
  try {
    const books = await Book.find().sort({ id: 1 }) // Sort by ID ascending
      .select('id title author isbn price originalPrice discount stock images weight specs description category status createdAt')
      .sort({ createdAt: -1 });
    
    res.json(books);
  } catch (err) {
    console.error("❌ Failed to fetch books:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// ✅ Handle /api/books/public requests - only available books
router.get("/public", async (req, res) => {
  try {
    const books = await Book.find({
      stock: { $gt: 0 }
    }).sort({ id: 1 }) // Add sorting here too
      .select('id title author isbn price originalPrice discount stock images weight specs description category status createdAt')
      .sort({ createdAt: -1 });
    
    res.json(books);
  } catch (err) {
    console.error("❌ Failed to fetch public books:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// ✅ Get single book by ID (this should come AFTER specific routes)
router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json(book);
  } catch (err) {
    console.error("❌ Error fetching book:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Add a new book
router.post("/", authMiddleware, requireRole(['admin', 'super_admin']), upload.array("images", 5), async (req, res) => {
  try {
    const {
      title, author, category, description,
      price, originalPrice, discount,
      stock, isbn, weight, threshold,
      publisher, language, pages, size
    } = req.body;

    if (!title || price == null) {
      return res.status(400).json({ message: "Title and price required" });
    }

    // Save image paths
    const imagePaths = req.files.map(file =>
      `images/${path.basename(path.dirname(file.path))}/${file.filename}`
    );

    const newBook = new Book({
      title,
      author,
      category,
      description,
      price,
      originalPrice,
      discount,
      stock,
      isbn,
      weight,
      threshold,
      images: imagePaths,
      specs: { publisher, language, pages, size }
    });

    const savedBook = await newBook.save();

    res.status(201).json({ success: true, book: savedBook });

  } catch (err) {
    console.log(req.files); // should show uploaded images
    console.log(req.body);  // text fields  
    console.error("❌ Error adding book:", err);
    res.status(500).json({ message: err.message });
  }
});


// ✅ Update a book
router.put("/:id", authMiddleware, requireRole(['admin', 'super_admin']), upload.array("images", 5), async (req, res) => {
  try {
    const updateData = {
      title: req.body.title,
      author: req.body.author,
      category: req.body.category,
      description: req.body.description,
      price: req.body.price,
      originalPrice: req.body.originalPrice,
      discount: req.body.discount,
      stock: req.body.stock,
      isbn: req.body.isbn,
      weight: req.body.weight,
      threshold: req.body.threshold,
      lastUpdated: new Date(),
      specs: {
        publisher: req.body.publisher,
        language: req.body.language,
        pages: req.body.pages,
        size: req.body.size,
        isbn: req.body.isbn
      }
    };

    // If new images uploaded → replace images
    if (req.files && req.files.length > 0) {
      const imagePaths = req.files.map(file =>
        `images/${path.basename(path.dirname(file.path))}/${file.filename}`
      );
      updateData.images = imagePaths;
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedBook) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({ success: true, book: updatedBook });

  } catch (err) {
    console.error("❌ Error updating book:", err);
    res.status(500).json({ message: err.message });
  }
});

// ✅ Delete a book
router.delete("/:id", authMiddleware, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const deletedBook = await Book.findByIdAndDelete(req.params.id);
    if (!deletedBook) return res.status(404).json({ error: "Book not found" });
    res.json({ message: "Book deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting book:", err);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

// ✅ Update book inventory/stock
router.patch("/:id/inventory", authMiddleware, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { quantityChange, reason } = req.body;
    
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      { 
        $inc: { 
          stock: quantityChange
        } 
      },
      { new: true }
    );

    if (!updatedBook) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(updatedBook);
  } catch (error) {
    console.error("❌ Error updating inventory:", error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;