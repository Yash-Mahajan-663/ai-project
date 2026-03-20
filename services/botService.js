const Session = require('../models/Session');
const Booking = require('../models/Booking');
const Waitlist = require('../models/Waitlist');
const Feedback = require('../models/Feedback');
const { analyzeMessage } = require('./groqService');
const { sendMessage, sendServiceMenuTemplate, sendBookingConfirmTemplate } = require('./whatsappService');
const { getPriceForService } = require('./pricingService');
const { scheduleAppointmentReminders, scheduleFeedbackRequest } = require('../cron/scheduler');
const { format, parseISO, isValid } = require('date-fns');

// ─────────────────────────────────────────────
// Helper: "2026-03-22" → "22nd March 2026"
// ─────────────────────────────────────────────
function formatDisplayDate(dateStr) {
  if (!dateStr) return dateStr;
  // If already human-readable (not YYYY-MM-DD), return as-is
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    const day = parseInt(format(date, 'd'));
    const month = format(date, 'MMMM');
    const year = format(date, 'yyyy');
    // Ordinal suffix (1st, 2nd, 3rd, 4th...)
    const suffix = (['th', 'st', 'nd', 'rd']);
    const v = day % 100;
    const ordinal = suffix[(v - 20) % 10] || suffix[v] || suffix[0];
    return `${day}${ordinal} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

// ─────────────────────────────────────────────
// Helper: Check if Date/Time is in the past (IST Timezone Aware)
// ─────────────────────────────────────────────
function checkPastDateTime(dateStr, timeStr) {
  try {
    // 1. Get current time in IST (UTC + 5.5 hours)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    
    // Create 'today' date at midnight IST
    const today = new Date(istNow);
    today.setUTCHours(0, 0, 0, 0); 
    
    // Parse user date
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) return false; 
    
    parsedDate.setUTCHours(0, 0, 0, 0);
    
    // 1. Is the date strictly before today? (e.g., yesterday)
    if (parsedDate < today) return true;
    
    // 2. Is the date today, and time is provided, and time is in the past?
    if (parsedDate.getTime() === today.getTime() && timeStr) {
      const timeMatch = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM|am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const mins = parseInt(timeMatch[2] || '0', 10);
        const modifier = timeMatch[3]?.toUpperCase();
        
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        
        const currentHour = istNow.getUTCHours();
        const currentMin = istNow.getUTCMinutes();
        
        // compare hours/mins in IST
        if (hours < currentHour || (hours === currentHour && mins <= currentMin)) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// Entry Point — Every incoming message goes here
// ─────────────────────────────────────────────
async function handleIncomingMessage(phone, message, senderName) {
  // ── Explicit short-circuit for confirmation buttons ──
  const lowerMsg = message.toLowerCase().trim();
  if (lowerMsg === 'yes' || lowerMsg === 'confirm') {
    return sendMessage(phone, 'Great! Hum aapka intezaar karenge. 🎉');
  }
  if (lowerMsg === 'no' || lowerMsg === 'cancel' || lowerMsg === 'cancel booking') {
    return handleCancelMode({ draft_booking_id: null }, phone); // Call exact cancel logic
  }

  // Find or create session using MongoDB
  let session = await Session.findOne({ phone }).populate('draft_booking_id');

  if (!session) {
    session = new Session({ phone, stage: 'IDLE' });
    await session.save();
  }

  const { stage } = session;
  console.log(`🎯 [BOT] Phone: ${phone} | Stage: ${stage} | Msg: "${message}"`);

  // ALWAYS analyze message first to detect if user wants to BREAK OUT of a flow (like saying 'Hello' or 'Cancel')
  const ai = await analyzeMessage(message);
  console.log(`🤖 [GROQ] Intent: ${ai.intent} | Service: ${ai.service} | Date: ${ai.date} | Time: ${ai.time}`);

  // Breakout intents: If user sends a greeting, wants services menu, or wants to cancel in the middle of a flow
  if (stage !== 'IDLE' && stage !== 'WAITING_FEEDBACK') {
    if (ai.intent === 'GREETING' || ai.intent === 'CANCEL' || ai.intent === 'SERVICES') {
      console.log(`🚀 Flow broken by user intent: ${ai.intent}`);
      return routeByIntent(ai, session, phone, senderName);
    }
  }

  // ── Stage-based flows (no AI needed — structured input expected) ──
  switch (stage) {
    case 'BOOKING_ASK_DATE':
      return handleBookingDateResponse(session, phone, message);

    case 'BOOKING_ASK_TIME':
      return handleBookingTimeResponse(session, phone, message, senderName);

    case 'RESCHEDULE_ASK_DATE':
      return handleRescheduleDateResponse(session, phone, message);

    case 'RESCHEDULE_ASK_TIME':
      return handleRescheduleTimeResponse(session, phone, message);

    case 'WAITING_FEEDBACK':
      return handleFeedbackResponse(session, phone, message);
  }

  // If user is in BOOKING_ASK_SERVICE stage, override intent
  if (stage === 'BOOKING_ASK_SERVICE') {
    return handleServiceSelected(session, phone, message, ai);
  }

  // Normal IDLE intent routing
  return routeByIntent(ai, session, phone, senderName);
}

// ─────────────────────────────────────────────
// Route based on AI-detected intent
// ─────────────────────────────────────────────
async function routeByIntent(ai, session, phone, senderName) {
  const { intent, service, date, time, reply } = ai;
  console.log("session, phone, service, date, time, reply", session, phone, service, date, time, reply)

  switch (intent) {
    case 'GREETING':
      await updateSession(phone, 'IDLE');
      if (reply && reply.length > 5) { // Ensure there is a greeting text
        await sendMessage(phone, reply);
      }
      return sendServiceMenuTemplate(phone, senderName);
      
    case 'SERVICES':
      // User asked about services or prices. Send AI's explanation first!
      await updateSession(phone, 'IDLE');
      if (reply) {
        await sendMessage(phone, reply);
      }
      // Follow up with the interactive buttons
      return sendServiceMenuTemplate(phone, senderName);
    case 'BOOKING':
      return startBookingWithAI(session, phone, service, date, time, reply, senderName);

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
      // If user sends an unrecognized message, show the menu template again
      await updateSession(phone, 'IDLE');
      return sendServiceMenuTemplate(phone, senderName);
  }
}


// ─────────────────────────────────────────────
// Booking: AI ne jo extract kiya usse use karo
// ─────────────────────────────────────────────
async function startBookingWithAI(session, phone, service, date, time, aiReply, senderName) {
  // If AI detected date/time in the past, reject it so the bot asks again
  if (date && checkPastDateTime(date, time)) {
    sendMessage(phone, `⚠️ Aapne jo date ya time chuna tha (${formatDisplayDate(date)} ${time || ''}), woh beet chuka hai. Hum fresh date/time collect karenge...`);
    date = null;
    time = null;
  }

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
    return sendServiceMenuTemplate(phone, senderName);
  }

  if (!date) {
    await updateSession(phone, 'BOOKING_ASK_DATE');
    return sendMessage(phone, aiReply || `${service} booking ke liye date kya hogi?`);
  }

  if (!time) {
    await updateSession(phone, 'BOOKING_ASK_TIME');
    return sendMessage(phone, aiReply || `${formatDisplayDate(date)} ko kis time par aana chahenge?`);
  }

  // All data available — check slot
  return confirmBooking(phone, draftBooking._id, service, date, time, senderName);
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

  if (checkPastDateTime(dateStr, null)) {
    return sendMessage(phone, `⚠️ "${formatDisplayDate(dateStr)}" pehle hi beet chuka hai. Kripya aaj ya uske aage ki koi date chunein.`);
  }

  await Booking.updateOne({ _id: session.draft_booking_id }, { date: dateStr });

  await updateSession(phone, 'BOOKING_ASK_TIME');
  return sendMessage(phone, `📅 *${dateStr}* — Theek hai!\nKis time par aana chahenge? (e.g., 10 AM, 3 PM)`);
}

async function handleBookingTimeResponse(session, phone, message, senderName) {
  const ai = await analyzeMessage(`Time bataya: "${message}"`);
  const timeStr = ai.time || message.trim();
  const booking = session.draft_booking_id; // already populated
  const dateStr = booking.date;

  if (checkPastDateTime(dateStr, timeStr)) {
    return sendMessage(phone, `⚠️ Woh time (${timeStr}) aaj nikal chuka hai. Kripya future ka koi time chunein.`);
  }

  return confirmBooking(phone, session.draft_booking_id._id, booking?.service, booking?.date, timeStr, senderName);
}

async function confirmBooking(phone, bookingId, service, date, time, senderName) {
  const isAvailable = await checkSlotAvailability(date, time);

  const displayDate = formatDisplayDate(date); // e.g. "22nd March 2026"

  if (!isAvailable) {
    await processWaitlist(phone, date, time);
    return sendMessage(phone, `⚠️ ${displayDate} ko ${time} baje ka slot already booked hai 😅\nAapko waitlist mein add kar diya hai. Koi aur time batao ya slot free hone par hum notify karenge!`);
  }

  // Update booking status in MongoDB
  await Booking.updateOne({ _id: bookingId }, { status: 'booked', time });
  await updateSession(phone, 'IDLE');

  // Schedule reminders
  scheduleAppointmentReminders(bookingId, phone, date, time, service);
  scheduleFeedbackRequest(phone, date, time);

  // Send booking confirmation template with human-readable date
  return sendBookingConfirmTemplate(phone, senderName, service, displayDate, time);
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

  if (checkPastDateTime(dateStr, null)) {
    return sendMessage(phone, `⚠️ "${formatDisplayDate(dateStr)}" pehle hi beet chuka hai. Kripya aaj ya uske aage ki koi date chunein.`);
  }

  await Booking.updateOne({ _id: session.draft_booking_id }, { date: dateStr });

  await updateSession(phone, 'RESCHEDULE_ASK_TIME');
  return sendMessage(phone, `📅 *${dateStr}* — Theek hai!\nNaya time kya hoga?`);
}

async function handleRescheduleTimeResponse(session, phone, message) {
  const ai = await analyzeMessage(`New time: "${message}"`);
  const timeStr = ai.time || message.trim();

  // Get booking details
  const booking = await Booking.findById(session.draft_booking_id);

  if (checkPastDateTime(booking.date, timeStr)) {
    return sendMessage(phone, `⚠️ Woh time (${timeStr}) aaj nikal chuka hai. Kripya future ka koi time chunein.`);
  }

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
