const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, default: 'Anonymous' },
  stage: { type: String, default: 'IDLE' },
  draft_booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', SessionSchema);
