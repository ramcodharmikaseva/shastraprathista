// models/MarriageHall.js
const mongoose = require('mongoose');

const MarriageHallSchema = new mongoose.Schema({
  code: { type: String, unique: true }, // "CHOKKAR", "TTD"
  name: String,
  location: String
});

module.exports = mongoose.model('MarriageHall', MarriageHallSchema);
