const mongoose = require('mongoose');

const HallBookingSchema = new mongoose.Schema({
  hall: { type: String, required: true },        // CHOKKAR / TTD
  date: { type: String, required: true },        // Booking Date (YYYY-MM-DD)

  morning: Boolean,
  evening: Boolean,

  bookedBy: { type: String, required: true },    // Person name
  functionType: String,

  contact: String,

  createdById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  createdByName: {
    type: String
  }
}, {
  timestamps: true   // ✅ adds createdAt & updatedAt automatically
});

HallBookingSchema.index({ hall: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('HallBooking', HallBookingSchema);
