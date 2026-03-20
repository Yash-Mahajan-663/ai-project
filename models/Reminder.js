const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  phone: { type: String, required: true },
  message: { type: String, required: true },
  schedule_time: { type: Date, required: true },
  sent: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reminder', ReminderSchema);
