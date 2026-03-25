const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  name: { type: String, default: 'Anonymous' },
  status: { type: String, enum: ['pending', 'booked', 'cancelled'], default: 'pending' },
  service: { type: String, default: null },
  price: { type: Number, default: 0 },
  date: { type: String, default: null },
  time: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);
