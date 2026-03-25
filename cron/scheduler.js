const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const { sendMessage, sendReminderTemplate } = require('../services/whatsappService');

function parseToDate(dateStr, timeStr) {
  try {
    // Expect dateStr = "YYYY-MM-DD", timeStr = "10:00 AM"
    const [year, month, day] = dateStr.split('-');
    
    const timeMatch = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM|am|pm)?/i);
    let hours = parseInt(timeMatch[1], 10);
    const mins = parseInt(timeMatch[2] || '0', 10);
    const modifier = timeMatch[3]?.toUpperCase();
    
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    // Create UTC date that matches the exact numbers
    const utcNominalDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), hours, mins, 0));
    
    // Subtract 5.5 hours because the nominal numbers were IST, and we want actual absolute timestamp
    const actualIstDate = new Date(utcNominalDate.getTime() - (5.5 * 60 * 60 * 1000));
    return actualIstDate;
  } catch (e) {
    console.error('Scheduler date parse error:', e.message);
    const fallback = new Date();
    fallback.setMinutes(fallback.getMinutes() + 2);
    return fallback;
  }
}

function scheduleAppointmentReminders(bookingId, phone, dateStr, timeStr, service) {
  const appointmentTime = parseToDate(dateStr, timeStr);
  const now = new Date();

  // Standard 2 Hours before appointment
  const twoHoursBefore = new Date(appointmentTime.getTime() - 2 * 60 * 60 * 1000);
  
  if (twoHoursBefore > now) {
    createReminder(bookingId, phone, `Aapka ${service} appointment 2 ghante mein hai (${timeStr}) ⏰\nHum aapka intezaar kar rahe hain! 😊\nAgar aap aa rahe hain toh "Confirm" reply karein.`, twoHoursBefore);
  } else {
    // Handling "last-minute" bookings: if appointment is in less than 2 hours 
    // but at least 15 minutes away, send reminder in 1 minute!
    const fifteenMinsAway = new Date(now.getTime() + 15 * 60 * 1000);
    if (appointmentTime > fifteenMinsAway) {
      const oneMinLater = new Date(now.getTime() + 60 * 1000);
      createReminder(bookingId, phone, `Aapka ${service} appointment thodi der mein hai (${timeStr}) ⏰\nTaiyaar ho jaiye! Agar aap aa rahe hain toh "Confirm" reply karein.`, oneMinLater);
    }
  }
}

function scheduleFeedbackRequest(phone, dateStr, timeStr, service, bookingId = null) {
  const appointmentTime = parseToDate(dateStr, timeStr);
  // const hourLater = new Date(appointmentTime.getTime() + 60 * 60 * 1000);
  const hourLater = new Date(Date.now() + 60 * 1000);
  
  // Format message to include booking details
  const message = `Aapka *${service}* experience kaisa raha? (${dateStr} @ ${timeStr}) ⭐ (1-5)`;
  createReminder(bookingId, phone, message, hourLater);
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
      }).populate('booking_id');

      if (pendingReminders && pendingReminders.length > 0) {
        for (let task of pendingReminders) {
          // If task is feedback, we just send text. Else, send Reminder Template!
          if (task.message.includes('experience')) {
            await sendMessage(task.phone, task.message);
          } else {
            const customerName = task.booking_id?.name || 'Customer';
            await sendReminderTemplate(task.phone, customerName, task.message);
          }
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
