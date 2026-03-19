const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: String,
  phone: String,
  rating: { type: Number, min: 1, max: 5 },
  feedback: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
