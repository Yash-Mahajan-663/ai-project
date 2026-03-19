const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: String }, // Can be phone number or a chat ID
  name: { type: String },
  phone: { type: String, required: true },
  service: { type: String },
  price: { type: Number },
  date: { type: String }, // format YYYY-MM-DD
  time: { type: String }, // e.g., "10:00 AM"
  status: { type: String, enum: ['pending', 'booked', 'cancelled', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
