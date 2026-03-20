const mongoose = require('mongoose');

const WaitlistSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  notified: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Waitlist', WaitlistSchema);
