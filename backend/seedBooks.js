const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Book = require('./models/Book');
const { books: rawBooks } = require('./book-data');

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    await Book.deleteMany({});
    console.log('🗑️ Old books removed');

    // DEBUG: Check raw ISBN values
    console.log('🔍 Checking ISBN values...');
    rawBooks.forEach((book, index) => {
      if (book.isbn) {
        console.log(`Book ${index + 1}: "${book.title}" - ISBN: "${book.isbn}"`);
      }
    });

    const formattedBooks = rawBooks.map(b => {
      // 🔧 CLEAN ISBN - Remove quotes, hyphens, spaces
      let cleanISBN = '';
      if (b.isbn || b.specs?.isbn) {
        cleanISBN = (b.isbn || b.specs?.isbn || '')
          .toString()
          .replace(/['"`]/g, '')  // Remove quotes
          .replace(/[-\s]/g, '')   // Remove hyphens and spaces
          .trim()
          .toUpperCase();
        
        console.log(`Cleaned ISBN for "${b.title}": "${cleanISBN}"`);
      }

      return {
        // 🔑 FRONTEND ↔ BACKEND LINK
        id: b.id,

        // 📘 BASIC INFO
        title: b.title,
        author: b.author || 'Unknown Author',
        
        // 🔢 ISBN Number - CLEANED
        isbn: cleanISBN,

        // 💰 PRICING
        price: b.price,
        originalPrice: b.price,
        discount: b.discount || 0,

        // 📦 INVENTORY
        stock: 10,
        sold: 0,
        status: 'active',

        // 🖼️ MULTIPLE IMAGES
        images: Array.isArray(b.images) ? b.images : [],

        // 🚚 SHIPPING
        weight: b.weight || 500,

        // 📚 SPECS OBJECT
        specs: {
          publisher: b.specs?.publisher || '',
          language: b.specs?.language || '',
          pages: b.specs?.pages || 0,
          size: b.specs?.size || '',
          isbn: cleanISBN // Store cleaned version
        },

        // 📝 DESCRIPTION
        description: b.specs?.description || '',

        // ⏱️ TIMESTAMPS
        lastUpdated: new Date()
      };
    });

    // DEBUG: Show first few formatted books
    console.log('\n📋 First 3 formatted books:');
    formattedBooks.slice(0, 3).forEach((book, index) => {
      console.log(`${index + 1}. ${book.title}`);
      console.log(`   ISBN: "${book.isbn}" (length: ${book.isbn.length})`);
    });

    await Book.insertMany(formattedBooks);
    console.log(`\n✅ ${formattedBooks.length} books seeded successfully`);

    // Show statistics
    const booksWithISBN = formattedBooks.filter(b => b.isbn && b.isbn.length > 0);
    console.log(`📚 ${booksWithISBN.length} books have ISBN numbers`);
    
    // Show ISBN lengths distribution
    const isbnLengths = booksWithISBN.reduce((acc, book) => {
      const length = book.isbn.length;
      acc[length] = (acc[length] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 ISBN length distribution:', isbnLengths);

    process.exit(0);
  } catch (err) {
    console.error('❌ DB Error:', err);
    console.error('Error details:', err.message);
    
    if (err.errors) {
      Object.keys(err.errors).forEach(key => {
        console.error(`  ${key}:`, err.errors[key].value);
      });
    }
    
    process.exit(1);
  }
})();