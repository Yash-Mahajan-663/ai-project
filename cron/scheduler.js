const cron = require('node-cron');
const supabase = require('../config/supabase');
const { sendMessage } = require('../services/whatsappService');

function parseToDate(dateStr, timeStr) {
  const now = new Date();
  // Simplified logic for simulation: set 5 min from now
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
  await supabase
    .from('reminders')
    .insert({
      booking_id: bookingId,
      phone,
      message,
      schedule_time: scheduleTime
    });
}

function initScheduler() {
  // Runs every 10 seconds
  cron.schedule('*/10 * * * * *', async () => {
    try {
      const { data: pendingReminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('sent', false)
        .lte('schedule_time', new Date().toISOString());

      if (pendingReminders && pendingReminders.length > 0) {
        for (let task of pendingReminders) {
          await sendMessage(task.phone, task.message);
          
          await supabase
            .from('reminders')
            .update({ sent: true })
            .eq('id', task.id);
        }
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
