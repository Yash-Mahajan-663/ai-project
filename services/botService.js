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
  // Find or create session
  let session = await Session.findOne({ phone }).populate('draftBookingId');
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
  // Template button clicks (service selection) also come here as text
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
      await updateSession(session, 'IDLE');
      return sendServiceMenuTemplate(phone, 'Customer');

    case 'AVAILABILITY':
      await updateSession(session, 'IDLE');
      return sendMessage(phone, reply || 'Kaunsi date ke liye slots dekhne hain?');

    case 'RESCHEDULE':
      return handleRescheduleInit(session, phone, reply);

    case 'CANCEL':
      return handleCancelMode(session, phone);

    case 'FEEDBACK':
      await updateSession(session, 'WAITING_FEEDBACK');
      return sendMessage(phone, reply || 'Aap apna feedback share kar sakte hain. ⭐ (1-5)');

    default:
      return sendMessage(phone, reply || 'Samajh nahi paaya. "Book appointment" ya "Services" type karein.');
  }
}

// ─────────────────────────────────────────────
// Booking: AI ne jo extract kiya usse use karo
// Skip already-known steps
// ─────────────────────────────────────────────
async function startBookingWithAI(session, phone, service, date, time, aiReply) {
  // Create draft booking
  const draftBooking = new Booking({ phone, status: 'pending' });
  if (service) {
    draftBooking.service = service;
    draftBooking.price = getPriceForService(service);
  }
  if (date) draftBooking.date = date;
  await draftBooking.save();

  session.draftBookingId = draftBooking._id;

  // Skip steps that AI already extracted
  if (!service) {
    await updateSession(session, 'BOOKING_ASK_SERVICE');
    return sendServiceMenuTemplate(phone, 'Customer');
  }

  if (!date) {
    await updateSession(session, 'BOOKING_ASK_DATE');
    return sendMessage(phone, `${service} booking ke liye date kya hogi? (e.g., Kal, 25 March)`);
  }

  if (!time) {
    await updateSession(session, 'BOOKING_ASK_TIME');
    return sendMessage(phone, `${date} ko kis time par aana chahenge? (e.g., 10 AM, 3 PM)`);
  }

  // All data available — check slot
  draftBooking.time = time;
  return confirmBooking(session, phone, draftBooking);
}

// ─────────────────────────────────────────────
// When user selects service from template button
// ─────────────────────────────────────────────
async function handleServiceSelected(session, phone, rawMessage, ai) {
  if (!session.draftBookingId) return resetAndReply(session, phone, "Session expire ho gaya. 'Book appointment' likhkar firse try karein.");

  // Service could be in raw message (button click) or AI extracted
  const service = _extractServiceFromText(rawMessage) || ai.service || rawMessage.trim();
  const price = getPriceForService(service);

  session.draftBookingId.service = service;
  session.draftBookingId.price = price;
  await session.draftBookingId.save();
  await updateSession(session, 'BOOKING_ASK_DATE');

  let text = `*${service}* select kiya ✅`;
  if (price > 0) text += ` (Price: ₹${price})`;
  text += `\nDate kya hogi? (e.g., Aaj, Kal, 25 March)`;

  return sendMessage(phone, text);
}

// ─────────────────────────────────────────────
// Booking: Date received
// ─────────────────────────────────────────────
async function handleBookingDateResponse(session, phone, message) {
  // Let AI parse natural date expressions like "parso", "next Monday"
  const ai = await analyzeMessage(`Booking ke liye date batai: "${message}"`);
  const dateStr = ai.date || message.trim();

  session.draftBookingId.date = dateStr;
  await session.draftBookingId.save();
  await updateSession(session, 'BOOKING_ASK_TIME');

  return sendMessage(phone, `📅 *${dateStr}* — Theek hai!\nKis time par aana chahenge? (e.g., 10 AM, 3 PM)`);
}

// ─────────────────────────────────────────────
// Booking: Time received → check slot → confirm
// ─────────────────────────────────────────────
async function handleBookingTimeResponse(session, phone, message) {
  const ai = await analyzeMessage(`Time bataya: "${message}"`);
  const timeStr = ai.time || message.trim();

  session.draftBookingId.time = timeStr;
  return confirmBooking(session, phone, session.draftBookingId);
}

// ─────────────────────────────────────────────
// Final booking confirmation step
// ─────────────────────────────────────────────
async function confirmBooking(session, phone, draftBooking) {
  const { date, time } = draftBooking;
  const isAvailable = await checkSlotAvailability(date, time);

  if (!isAvailable) {
    await processWaitlist(phone, date, time);
    return sendMessage(phone, `⚠️ Ye slot already booked hai 😅\nAapko waitlist mein add kar diya hai.\nKoi aur time batao ya hum slot free hone par notify kar denge!`);
  }

  draftBooking.status = 'booked';
  await draftBooking.save();
  await updateSession(session, 'IDLE');

  // Schedule reminders
  scheduleAppointmentReminders(draftBooking._id, phone, date, time, draftBooking.service);
  scheduleFeedbackRequest(phone, date, time);

  // Send 11za confirmation template
  return sendBookingConfirmTemplate(phone, 'Customer', draftBooking.service, date, time);
}

// ─────────────────────────────────────────────
// Reschedule Flow
// ─────────────────────────────────────────────
async function handleRescheduleInit(session, phone, aiReply) {
  const activeBooking = await Booking.findOne({ phone, status: 'booked' }).sort({ createdAt: -1 });
  if (!activeBooking) {
    return sendMessage(phone, 'Aapka koi active booking nahi hai reschedule karne ke liye. 🤔');
  }

  session.draftBookingId = activeBooking._id;
  await updateSession(session, 'RESCHEDULE_ASK_DATE');
  return sendMessage(phone, aiReply || 'Naya date kya hoga? (e.g., Kal, 25 March)');
}

async function handleRescheduleDateResponse(session, phone, message) {
  const ai = await analyzeMessage(`Reschedule ke liye naya date: "${message}"`);
  const dateStr = ai.date || message.trim();

  session.draftBookingId.date = dateStr;
  await updateSession(session, 'RESCHEDULE_ASK_TIME');
  return sendMessage(phone, `📅 *${dateStr}* — Theek hai!\nNaya time kya hoga?`);
}

async function handleRescheduleTimeResponse(session, phone, message) {
  const ai = await analyzeMessage(`New time: "${message}"`);
  const timeStr = ai.time || message.trim();
  const activeBooking = session.draftBookingId;
  const dateStr = activeBooking.date;

  const isAvailable = await checkSlotAvailability(dateStr, timeStr);
  if (!isAvailable) {
    return sendMessage(phone, 'Ye slot already booked hai 😅 Koi aur time batao:');
  }

  activeBooking.time = timeStr;
  await activeBooking.save();
  await updateSession(session, 'IDLE');
  scheduleAppointmentReminders(activeBooking._id, phone, dateStr, timeStr, activeBooking.service);

  return sendMessage(phone, `Aapka appointment reschedule ho gaya hai ✅\n📅 Naya Date: ${dateStr}\n⏰ Naya Time: ${timeStr}`);
}

// ─────────────────────────────────────────────
// Cancel Flow
// ─────────────────────────────────────────────
async function handleCancelMode(session, phone) {
  const activeBooking = await Booking.findOne({ phone, status: 'booked' }).sort({ createdAt: -1 });
  if (!activeBooking) {
    return sendMessage(phone, 'Aapka koi active booking nahi hai cancel karne ke liye. 🤔');
  }

  activeBooking.status = 'cancelled';
  await activeBooking.save();
  await updateSession(session, 'IDLE');
  notifyWaitlistForSlot(activeBooking.date, activeBooking.time);

  return sendMessage(phone, `Aapka *${activeBooking.service}* booking cancel ho gaya hai ✅\nKabhi bhi wapas aao! 😊`);
}

// ─────────────────────────────────────────────
// Feedback Flow
// ─────────────────────────────────────────────
async function handleFeedbackResponse(session, phone, message) {
  let rating = 5;
  const match = message.match(/[1-5]/);
  if (match) rating = parseInt(match[0]);

  await Feedback.create({ phone, rating, feedback: message });
  await updateSession(session, 'IDLE');

  const star = '⭐'.repeat(rating);
  return sendMessage(phone, `${star} Feedback dene ke liye shukriya!\nAapka din shubh ho! 😊`);
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
async function updateSession(session, newStage) {
  session.stage = newStage;
  if (newStage === 'IDLE') session.draftBookingId = null;
  session.updatedAt = new Date();
  await session.save();
}

async function resetAndReply(session, phone, text) {
  await updateSession(session, 'IDLE');
  return sendMessage(phone, text);
}

async function checkSlotAvailability(date, time) {
  const existing = await Booking.findOne({ date, time, status: 'booked' });
  return !existing;
}

async function processWaitlist(phone, date, time) {
  await Waitlist.create({ phone, date, time });
}

async function notifyWaitlistForSlot(date, time) {
  const waitingUser = await Waitlist.findOne({ date, time, notified: false });
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
