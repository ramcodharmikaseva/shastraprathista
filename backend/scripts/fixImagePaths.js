const mongoose = require('mongoose');
const Book = require('../models/Book');
require('dotenv').config();

async function fixImagePaths() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Fix book4 images (slrspt-book-004)
        const book4 = await Book.findOne({ id: 'slrspt-book-004' });
        if (book4) {
            const newImages = book4.images.map(img => img.replace('.JPG', '.jpg'));
            book4.images = newImages;
            await book4.save();
            console.log('✅ Fixed book4 images:', newImages);
        }

        // Fix book5 images (slrspt-book-005)
        const book5 = await Book.findOne({ id: 'slrspt-book-005' });
        if (book5) {
            const newImages = book5.images.map(img => img.replace('.JPG', '.jpg'));
            book5.images = newImages;
            await book5.save();
            console.log('✅ Fixed book5 images:', newImages);
        }

        mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

fixImagePaths();