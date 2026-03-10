const express = require('express');
const router = express.Router();
const HallBooking = require('../models/HallBooking');
const authMiddleware = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const { requireRole } = require('../middleware/requireRole');

/* =====================================================
   🔓 PUBLIC – CALENDAR DATA (NO AUTH)
===================================================== */
router.get('/bookings', async (req, res) => {
  try {
    const { hall, year } = req.query;

    if (!hall) {
      return res.status(400).json({ message: 'Hall is required' });
    }

    const filter = { hall: hall.toUpperCase() };
    if (year) {
      filter.date = { $regex: `^${year}-` };
    }

    const data = await HallBooking.find(filter)
      .sort({ date: 1 })
      .select('-__v');

    res.json(data);
  } catch (err) {
    console.error('❌ Load bookings error:', err);
    res.status(500).json({ message: 'Failed to load bookings' });
  }
});

/* =====================================================
   🔐 ADMIN – CREATE / UPDATE BOOKING
===================================================== */
router.post('/book', 
  authMiddleware,
  requireRole(['admin', 'super_admin', 'hall_admin']), // ✅ Allow admin role
  async (req, res) => {
    try {
      const {
        hall,
        date,
        morning,
        evening,
        bookedBy,
        functionType,
        contact
      } = req.body;

      if (!hall || !date || (!morning && !evening)) {
        return res.status(400).json({
          success: false,
          message: 'Hall, date and at least one slot required'
        });
      }

      if (!bookedBy || !functionType) {
        return res.status(400).json({
          success: false,
          message: 'Booked By and Function Type are required'
        });
      }

      const booking = await HallBooking.findOneAndUpdate(
        { hall: hall.toUpperCase(), date },
        {
          hall: hall.toUpperCase(),
          date,
          morning,
          evening,
          bookedBy,
          functionType,
          contact,
          createdById: req.user._id,
          createdByName: req.user.name || req.user.email
        },
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        message: 'Booking saved successfully',
        booking
      });

    } catch (err) {
      console.error('❌ Booking save error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to save booking'
      });
    }
  }
);

/* =====================================================
   🔐 ADMIN – DELETE BOOKING
===================================================== */
router.delete('/book',
  authMiddleware,
  requireRole(['admin', 'super_admin', 'hall_admin']), // ✅ Allow admin role
  async (req, res) => {
    try {
      const { hall, date } = req.body;

      if (!hall || !date) {
        return res.status(400).json({
          success: false,
          message: 'Hall and date required'
        });
      }

      await HallBooking.deleteOne({ 
        hall: hall.toUpperCase(), 
        date 
      });

      res.json({
        success: true,
        message: 'Booking deleted successfully'
      });

    } catch (err) {
      console.error('❌ Delete booking error:', err);
      res.status(500).json({
        success: false,
        message: 'Delete failed'
      });
    }
  }
);

module.exports = router;