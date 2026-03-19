const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  stage: { type: String, default: 'IDLE' }, // IDLE, BOOKING_ASK_SERVICE, BOOKING_ASK_DATE, BOOKING_ASK_TIME, RESCHEDULE_ASK_DATE, RESCHEDULE_ASK_TIME, CANCEL_CONFIRM, WAITING_FEEDBACK
  draftBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }, // If there is a booking currently being created/edited
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', sessionSchema);
