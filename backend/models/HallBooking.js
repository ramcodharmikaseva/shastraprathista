const mongoose = require('mongoose');

const HallBookingSchema = new mongoose.Schema({
  hall: { type: String, required: true },        // CHOKKAR / TTD
  date: { type: String, required: true },        // Booking Date (YYYY-MM-DD)

  morning: { type: Boolean, default: false },
  evening: { type: Boolean, default: false },

  bookedBy: { type: String, required: true },    // Person name or 'SYSTEM_BLOCKED' for blocked dates
  functionType: { type: String, default: '' },   // Will store block reason for blocked dates

  contact: { type: String, default: '' },

  createdById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  createdByName: {
    type: String
  },
  
  // ✅ NEW FIELDS FOR BLOCKED DATES
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true   // ✅ adds createdAt & updatedAt automatically
});

// Compound index to ensure unique booking per hall per date
HallBookingSchema.index({ hall: 1, date: 1 }, { unique: true });

// ✅ Add a virtual to check if this is a blocked date
HallBookingSchema.virtual('isSystemBlocked').get(function() {
  return this.isBlocked === true || this.bookedBy === 'SYSTEM_BLOCKED';
});

// ✅ Add a method to get display color
HallBookingSchema.methods.getBookingType = function() {
  if (this.isBlocked || this.bookedBy === 'SYSTEM_BLOCKED') {
    return 'blocked';
  } else if (this.morning && this.evening) {
    return 'full';
  } else if (this.morning) {
    return 'morning';
  } else if (this.evening) {
    return 'evening';
  } else {
    return 'none';  
  }
};

module.exports = mongoose.model('HallBooking', HallBookingSchema);