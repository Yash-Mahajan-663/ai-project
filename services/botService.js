const Session = require('../models/Session');
const Booking = require('../models/Booking');
const Waitlist = require('../models/Waitlist');
const Feedback = require('../models/Feedback');
const { analyzeMessage } = require('./groqService');
const { sendMessage, sendServiceMenuTemplate, sendBookingConfirmTemplate } = require('./whatsappService');
const { getPriceForService } = require('./pricingService');
const { scheduleAppointmentReminders, scheduleFeedbackRequest } = require('../cron/scheduler');

// ─────────────────────────────────────────────
// Entry Point — Every incoming message goes here
// ─────────────────────────────────────────────
async function handleIncomingMessage(phone, message) {
  // Find or create session using MongoDB
  let session = await Session.findOne({ phone }).populate('draft_booking_id');

  if (!session) {
    session = new Session({ phone, stage: 'IDLE' });
    await session.save();
  }

  const { stage } = session;
  console.log(`🎯 [BOT] Phone: ${phone} | Stage: ${stage} | Msg: "${message}"`);

  // ── Stage-based flows (no AI needed — structured input expected) ──
  switch (stage) {
    case 'BOOKING_ASK_DATE':
      return handleBookingDateResponse(session, phone, message);

    case 'BOOKING_ASK_TIME':
      return handleBookingTimeResponse(session, phone, message);

    case 'RESCHEDULE_ASK_DATE':
      return handleRescheduleDateResponse(session, phone, message);

    case 'RESCHEDULE_ASK_TIME':
      return handleRescheduleTimeResponse(session, phone, message);

    case 'WAITING_FEEDBACK':
      return handleFeedbackResponse(session, phone, message);
  }

  // ── IDLE or BOOKING_ASK_SERVICE → Groq AI handles it ──
  const ai = await analyzeMessage(message);
  console.log(`🤖 [GROQ] Intent: ${ai.intent} | Service: ${ai.service} | Date: ${ai.date} | Time: ${ai.time}`);

  // If user is in BOOKING_ASK_SERVICE stage, override intent
  if (stage === 'BOOKING_ASK_SERVICE') {
    return handleServiceSelected(session, phone, message, ai);
  }

  // Normal IDLE intent routing
  return routeByIntent(ai, session, phone);
}

// ─────────────────────────────────────────────
// Route based on AI-detected intent
// ─────────────────────────────────────────────
async function routeByIntent(ai, session, phone) {
  const { intent, service, date, time, reply } = ai;

  switch (intent) {
    case 'GREETING':
      return sendMessage(phone, reply || 'Hello 👋 Kaise help kar sakta hu aapki?');

    case 'BOOKING':
      return startBookingWithAI(session, phone, service, date, time, reply);

    case 'SERVICES':
      await updateSession(phone, 'IDLE');
      return sendServiceMenuTemplate(phone, 'Customer');

    case 'AVAILABILITY':
      await updateSession(phone, 'IDLE');
      return sendMessage(phone, reply || 'Kaunsi date ke liye slots dekhne hain?');

    case 'RESCHEDULE':
      return handleRescheduleInit(session, phone, reply);

    case 'CANCEL':
      return handleCancelMode(session, phone);

    case 'FEEDBACK':
      await updateSession(phone, 'WAITING_FEEDBACK');
      return sendMessage(phone, reply || 'Aap apna feedback share kar sakte hain. ⭐ (1-5)');

    default:
      return sendMessage(phone, reply || 'Samajh nahi paaya. "Book appointment" ya "Services" type karein.');
  }
}

// ─────────────────────────────────────────────
// Booking: AI ne jo extract kiya usse use karo
// ─────────────────────────────────────────────
async function startBookingWithAI(session, phone, service, date, time, aiReply) {
  const price = getPriceForService(service);

  // Create draft booking in MongoDB
  const draftBooking = new Booking({
    phone,
    status: 'pending',
    service: service || null,
    price: price || null,
    date: date || null
  });
  await draftBooking.save();

  // Update session with draft_booking_id
  session.draft_booking_id = draftBooking._id;
  await session.save();

  // Skip steps that AI already extracted
  if (!service) {
    await updateSession(phone, 'BOOKING_ASK_SERVICE');
    return sendServiceMenuTemplate(phone, 'Customer');
  }

  if (!date) {
    await updateSession(phone, 'BOOKING_ASK_DATE');
    return sendMessage(phone, `${service} booking ke liye date kya hogi? (e.g., Kal, 25 March)`);
  }

  if (!time) {
    await updateSession(phone, 'BOOKING_ASK_TIME');
    return sendMessage(phone, `${date} ko kis time par aana chahenge? (e.g., 10 AM, 3 PM)`);
  }

  // All data available — check slot
  return confirmBooking(phone, draftBooking._id, service, date, time);
}

// ─────────────────────────────────────────────
// When user selects service
// ─────────────────────────────────────────────
async function handleServiceSelected(session, phone, rawMessage, ai) {
  const draftBookingId = session.draft_booking_id;
  if (!draftBookingId) return resetAndReply(phone, "Session expire ho gaya. 'Book appointment' likhkar firse try karein.");

  const service = _extractServiceFromText(rawMessage) || ai.service || rawMessage.trim();
  const price = getPriceForService(service);

  // Update booking
  await Booking.updateOne({ _id: draftBookingId }, { service, price });

  await updateSession(phone, 'BOOKING_ASK_DATE');

  let text = `*${service}* select kiya ✅`;
  if (price > 0) text += ` (Price: ₹${price})`;
  text += `\nDate kya hogi? (e.g., Aaj, Kal, 25 March)`;

  return sendMessage(phone, text);
}

async function handleBookingDateResponse(session, phone, message) {
  const ai = await analyzeMessage(`Booking ke liye date batai: "${message}"`);
  const dateStr = ai.date || message.trim();

  await Booking.updateOne({ _id: session.draft_booking_id }, { date: dateStr });

  await updateSession(phone, 'BOOKING_ASK_TIME');
  return sendMessage(phone, `📅 *${dateStr}* — Theek hai!\nKis time par aana chahenge? (e.g., 10 AM, 3 PM)`);
}

async function handleBookingTimeResponse(session, phone, message) {
  const ai = await analyzeMessage(`Time bataya: "${message}"`);
  const timeStr = ai.time || message.trim();
  const booking = session.draft_booking_id; // already populated

  return confirmBooking(phone, session.draft_booking_id._id, booking?.service, booking?.date, timeStr);
}

async function confirmBooking(phone, bookingId, service, date, time) {
  const isAvailable = await checkSlotAvailability(date, time);

  if (!isAvailable) {
    await processWaitlist(phone, date, time);
    return sendMessage(phone, `⚠️ Ye slot already booked hai 😅\nAapko waitlist mein add kar diya hai.\nKoi aur time batao ya hum slot free hone par notify kar denge!`);
  }

  // Update booking status
  await Booking.updateOne({ _id: bookingId }, { status: 'booked', time });

  await updateSession(phone, 'IDLE');

  // Schedule reminders
  scheduleAppointmentReminders(bookingId, phone, date, time, service);
  scheduleFeedbackRequest(phone, date, time);

  return sendBookingConfirmTemplate(phone, 'Customer', service, date, time);
}

// ─────────────────────────────────────────────
// Reschedule & Cancel
// ─────────────────────────────────────────────
async function handleRescheduleInit(session, phone, aiReply) {
  const activeBooking = await Booking.findOne({ phone, status: 'booked' }).sort({ created_at: -1 });

  if (!activeBooking) {
    return sendMessage(phone, 'Aapka koi active booking nahi hai reschedule karne ke liye. 🤔');
  }

  await Session.updateOne({ phone }, { draft_booking_id: activeBooking._id, stage: 'RESCHEDULE_ASK_DATE' });

  return sendMessage(phone, aiReply || 'Naya date kya hoga? (e.g., Kal, 25 March)');
}

async function handleRescheduleDateResponse(session, phone, message) {
  const ai = await analyzeMessage(`Reschedule ke liye naya date: "${message}"`);
  const dateStr = ai.date || message.trim();

  await Booking.updateOne({ _id: session.draft_booking_id }, { date: dateStr });

  await updateSession(phone, 'RESCHEDULE_ASK_TIME');
  return sendMessage(phone, `📅 *${dateStr}* — Theek hai!\nNaya time kya hoga?`);
}

async function handleRescheduleTimeResponse(session, phone, message) {
  const ai = await analyzeMessage(`New time: "${message}"`);
  const timeStr = ai.time || message.trim();

  // Get booking details
  const booking = await Booking.findById(session.draft_booking_id);

  const isAvailable = await checkSlotAvailability(booking.date, timeStr);
  if (!isAvailable) {
    return sendMessage(phone, 'Ye slot already booked hai 😅 Koi aur time batao:');
  }

  await Booking.updateOne({ _id: session.draft_booking_id }, { time: timeStr });

  await updateSession(phone, 'IDLE');
  scheduleAppointmentReminders(booking._id, phone, booking.date, timeStr, booking.service);

  return sendMessage(phone, `Aapka appointment reschedule ho gaya hai ✅\n📅 Naya Date: ${booking.date}\n⏰ Naya Time: ${timeStr}`);
}

async function handleCancelMode(session, phone) {
  const activeBooking = await Booking.findOne({ phone, status: 'booked' }).sort({ created_at: -1 });

  if (!activeBooking) {
    return sendMessage(phone, 'Aapka koi active booking nahi hai cancel karne ke liye. 🤔');
  }

  await Booking.updateOne({ _id: activeBooking._id }, { status: 'cancelled' });

  await updateSession(phone, 'IDLE');
  notifyWaitlistForSlot(activeBooking.date, activeBooking.time);

  return sendMessage(phone, `Aapka *${activeBooking.service}* booking cancel ho gaya hai ✅\nKabhi bhi wapas aao! 😊`);
}

// ─────────────────────────────────────────────
// Feedback
// ─────────────────────────────────────────────
async function handleFeedbackResponse(session, phone, message) {
  let rating = 5;
  const match = message.match(/[1-5]/);
  if (match) rating = parseInt(match[0]);

  const feedback = new Feedback({ phone, rating, feedback: message });
  await feedback.save();

  await updateSession(phone, 'IDLE');
  const star = '⭐'.repeat(rating);
  return sendMessage(phone, `${star} Feedback dene ke liye shukriya!\nAapka din shubh ho! 😊`);
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
async function updateSession(phone, newStage) {
  const updateData = { stage: newStage, updated_at: new Date() };
  if (newStage === 'IDLE') updateData.draft_booking_id = null;

  await Session.updateOne({ phone }, updateData);
}

async function resetAndReply(phone, text) {
  await updateSession(phone, 'IDLE');
  return sendMessage(phone, text);
}

async function checkSlotAvailability(date, time) {
  const count = await Booking.countDocuments({
    date,
    time,
    status: 'booked'
  });

  return count === 0;
}

async function processWaitlist(phone, date, time) {
  await new Waitlist({ phone, date, time }).save();
}

async function notifyWaitlistForSlot(date, time) {
  const waitingUser = await Waitlist.findOne({
    date,
    time,
    notified: false
  });

  if (waitingUser) {
    sendMessage(waitingUser.phone, `🎉 Ek slot free ho gaya hai! ${date} ko ${time} baje.\nReply "book" agar aap lena chahte hain.`);
    waitingUser.notified = true;
    await waitingUser.save();
  }
}

function _extractServiceFromText(text) {
  const t = text.toLowerCase();
  if (/haircut|baal|hair/.test(t)) return 'Haircut';
  if (/beard|daadhi|trim/.test(t)) return 'Beard';
  if (/facial|face/.test(t)) return 'Facial';
  return null;
}

module.exports = { handleIncomingMessage };
