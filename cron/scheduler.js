const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const { sendMessage } = require('../services/whatsappService');

// In a real application, you'd parse "Aaj" or "10 AM" rigidly.
// Here we mock the appointment Datetime to just simulate future timings.
// For example, treating 'Aaj 10 AM' as a proper JS Date object.
function parseToDate(dateStr, timeStr) {
  // Mock logic assuming it's always "today" and the time given
  // To avoid complexity right now, we set the appointment just 5 minutes later from now.
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  return now;
}

function scheduleAppointmentReminders(bookingId, phone, dateStr, timeStr, service) {
  const appointmentTime = parseToDate(dateStr, timeStr);

  // 1. 24 hours before
  const dayBefore = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
  if (dayBefore > new Date()) {
    createReminder(bookingId, phone, `Reminder: Aapka ${service} appointment kal ${timeStr} baje hai.`, dayBefore);
  }

  // 2. 30 seconds before
  const secBefore = new Date(appointmentTime.getTime() - 30 * 1000);
  if (secBefore > new Date()) {
    createReminder(bookingId, phone, `Aapka appointment 30 seconds mein hai ⏰\nPlease ready rahe 😊`, secBefore);
  }
}

function scheduleFeedbackRequest(phone, dateStr, timeStr) {
  const appointmentTime = parseToDate(dateStr, timeStr);

  // + 1 Hr later
  const hourLater = new Date(appointmentTime.getTime() + 60 * 60 * 1000);
  createReminder(null, phone, `Aapka experience kaisa raha? ⭐ (1-5)`, hourLater);
}

async function createReminder(bookingId, phone, message, scheduleTime) {
  await Reminder.create({
    bookingId,
    phone,
    message,
    scheduleTime
  });
}

// Polling Cron Job - Runs every 10 seconds
// Node cron is simple, BullMQ recommended for prod
function initScheduler() {
  cron.schedule('*/10 * * * * *', async () => {
    try {
      const pendingReminders = await Reminder.find({
        sent: false,
        scheduleTime: { $lte: new Date() }
      });

      for (let task of pendingReminders) {
        await sendMessage(task.phone, task.message);
        task.sent = true;
        await task.save();
      }
    } catch(e) {
      console.error('Error processing reminders:', e.message);
    }
  });
  console.log('Scheduler initialized ✅');
}

module.exports = {
  scheduleAppointmentReminders,
  scheduleFeedbackRequest,
  initScheduler
};
