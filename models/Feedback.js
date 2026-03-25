const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  name: { type: String, default: 'Anonymous' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
