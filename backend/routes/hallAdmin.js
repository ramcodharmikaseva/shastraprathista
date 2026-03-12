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
  requireRole(['admin', 'super_admin', 'hall_admin']),
  async (req, res) => {
    try {
      const {
        hall,
        date,
        morning,
        evening,
        bookedBy,
        functionType,
        contact,
        isBlocked = false,
        blockedReason = ''
      } = req.body;

      if (!hall || !date || (!morning && !evening)) {
        return res.status(400).json({
          success: false,
          message: 'Hall, date and at least one slot required'
        });
      }

      // If it's a blocked date, we don't require bookedBy and functionType
      if (!isBlocked && (!bookedBy || !functionType)) {
        return res.status(400).json({
          success: false,
          message: 'Booked By and Function Type are required for regular bookings'
        });
      }

      // Special handling for blocked dates
      const bookingData = {
        hall: hall.toUpperCase(),
        date,
        morning,
        evening,
        isBlocked,
        blockedReason: isBlocked ? blockedReason : ''
      };

      // Only add these fields if it's NOT a blocked date
      if (!isBlocked) {
        bookingData.bookedBy = bookedBy;
        bookingData.functionType = functionType;
        bookingData.contact = contact;
        bookingData.createdById = req.user._id;
        bookingData.createdByName = req.user.name || req.user.email;
      } else {
        // For blocked dates, set system values
        bookingData.bookedBy = 'SYSTEM_BLOCKED';
        bookingData.functionType = blockedReason || 'Blocked';
        bookingData.contact = 'ADMIN';
        bookingData.createdById = req.user._id;
        bookingData.createdByName = req.user.name || req.user.email;
      }

      const booking = await HallBooking.findOneAndUpdate(
        { hall: hall.toUpperCase(), date },
        bookingData,
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        message: isBlocked ? 'Date blocked successfully' : 'Booking saved successfully',
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
   🔐 ADMIN – BLOCK MULTIPLE DATES (NEW)
===================================================== */
router.post('/block-dates',
  authMiddleware,
  requireRole(['admin', 'super_admin', 'hall_admin']),
  async (req, res) => {
    try {
      const { hall, dates, reason, morning = true, evening = true } = req.body;

      if (!hall || !dates || !Array.isArray(dates) || dates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Hall and dates array required'
        });
      }

      const results = [];
      const errors = [];

      for (const date of dates) {
        try {
          const booking = await HallBooking.findOneAndUpdate(
            { hall: hall.toUpperCase(), date },
            {
              hall: hall.toUpperCase(),
              date,
              morning,
              evening,
              isBlocked: true,
              blockedReason: reason || 'Blocked by admin',
              bookedBy: 'SYSTEM_BLOCKED',
              functionType: reason || 'Blocked',
              contact: 'ADMIN',
              createdById: req.user._id,
              createdByName: req.user.name || req.user.email
            },
            { upsert: true, new: true }
          );
          
          results.push({ date, status: 'success', id: booking._id });
        } catch (err) {
          console.error(`Error blocking date ${date}:`, err);
          errors.push({ date, error: err.message });
        }
      }

      res.json({
        success: true,
        message: `Successfully blocked ${results.length} dates${errors.length ? `, ${errors.length} failed` : ''}`,
        results,
        errors: errors.length ? errors : undefined
      });

    } catch (err) {
      console.error('❌ Block dates error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to block dates'
      });
    }
  }
);

/* =====================================================
   🔐 ADMIN – UNBLOCK DATE (NEW)
===================================================== */
router.post('/unblock-date',
  authMiddleware,
  requireRole(['admin', 'super_admin', 'hall_admin']),
  async (req, res) => {
    try {
      const { hall, date } = req.body;

      if (!hall || !date) {
        return res.status(400).json({
          success: false,
          message: 'Hall and date required'
        });
      }

      const booking = await HallBooking.findOne({ 
        hall: hall.toUpperCase(), 
        date 
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // If it's a blocked date, delete it completely
      if (booking.isBlocked) {
        await booking.deleteOne();
        res.json({
          success: true,
          message: 'Date unblocked successfully'
        });
      } else {
        // If it's a regular booking, just remove the blocked flag
        booking.isBlocked = false;
        booking.blockedReason = '';
        await booking.save();
        res.json({
          success: true,
          message: 'Booking updated successfully'
        });
      }

    } catch (err) {
      console.error('❌ Unblock date error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to unblock date'
      });
    }
  }
);

/* =====================================================
   🔐 ADMIN – GET BLOCKED DATES (NEW)
===================================================== */
router.get('/blocked-dates',
  authMiddleware,
  requireRole(['admin', 'super_admin', 'hall_admin']),
  async (req, res) => {
    try {
      const { hall, year } = req.query;

      if (!hall) {
        return res.status(400).json({ message: 'Hall is required' });
      }

      const filter = { 
        hall: hall.toUpperCase(),
        isBlocked: true 
      };
      
      if (year) {
        filter.date = { $regex: `^${year}-` };
      }

      const data = await HallBooking.find(filter)
        .sort({ date: 1 })
        .select('date blockedReason morning evening');

      res.json({
        success: true,
        blockedDates: data
      });

    } catch (err) {
      console.error('❌ Load blocked dates error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to load blocked dates'
      });
    }
  }
);

/* =====================================================
   🔐 ADMIN – DELETE BOOKING (EXISTING)
===================================================== */
router.delete('/book',
  authMiddleware,
  requireRole(['admin', 'super_admin', 'hall_admin']),
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