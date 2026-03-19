const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
  userId: String,
  phone: String,
  date: String,
  time: String,
  notified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Waitlist', waitlistSchema);
