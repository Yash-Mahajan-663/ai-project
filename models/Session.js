const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  stage: { type: String, default: 'IDLE' },
  draft_booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', SessionSchema);
