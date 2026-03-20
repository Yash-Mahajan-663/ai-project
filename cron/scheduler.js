const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const { sendMessage } = require('../services/whatsappService');

function parseToDate(dateStr, timeStr) {
  const now = new Date();
  // Simplified logic for simulation: set 2 min from now
  now.setMinutes(now.getMinutes() + 2);
  return now;
}

function scheduleAppointmentReminders(bookingId, phone, dateStr, timeStr, service) {
  const appointmentTime = parseToDate(dateStr, timeStr);

  const dayBefore = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
  if (dayBefore > new Date()) {
    createReminder(bookingId, phone, `Reminder: Aapka ${service} appointment kal ${timeStr} baje hai.`, dayBefore);
  }

  const secBefore = new Date(appointmentTime.getTime() - 10 * 1000);
  if (secBefore > new Date()) {
    createReminder(bookingId, phone, `Aapka appointment 10 seconds mein hai ⏰\nPlease ready rahe 😊`, secBefore);
  }
}

function scheduleFeedbackRequest(phone, dateStr, timeStr) {
  const appointmentTime = parseToDate(dateStr, timeStr);
  const hourLater = new Date(appointmentTime.getTime() + 60 * 60 * 1000);
  createReminder(null, phone, `Aapka experience kaisa raha? ⭐ (1-5)`, hourLater);
}

async function createReminder(bookingId, phone, message, scheduleTime) {
  try {
    const reminder = new Reminder({
      booking_id: bookingId,
      phone,
      message,
      schedule_time: scheduleTime
    });
    await reminder.save();
  } catch (e) {
    console.error('Error creating reminder:', e.message);
  }
}

function initScheduler() {
  cron.schedule('*/10 * * * * *', async () => {
    try {
      const pendingReminders = await Reminder.find({
        sent: false,
        schedule_time: { $lte: new Date() }
      });

      if (pendingReminders && pendingReminders.length > 0) {
        for (let task of pendingReminders) {
          await sendMessage(task.phone, task.message);
          task.sent = true;
          await task.save();
        }
      }
    } catch (e) {
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
