// scripts/update-class-names.js
const mongoose = require('mongoose');
const MusicStudent = require('../models/MusicStudent');

async function updateClassNames() {
    // Update Veena → Carnatic Veena
    await MusicStudent.updateMany(
        { className: 'Veena' },
        { $set: { className: 'Carnatic Veena' } }
    );
    
    // Update Violin → Carnatic Violin
    await MusicStudent.updateMany(
        { className: 'Violin' },
        { $set: { className: 'Carnatic Violin' } }
    );
    
    console.log('✅ Class names updated successfully');
}