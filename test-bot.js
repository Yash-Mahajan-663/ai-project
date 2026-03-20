/**
 * Local Bot Tester — WhatsApp ke bina bot test karo
 * Run: node test-bot.js
 *
 * Ye script ek fake phone number se messages bhejta hai
 * aur bot ka response console mein dikhata hai.
 */

require('dotenv').config();
const { handleIncomingMessage } = require('./services/botService');
const { initScheduler } = require('./cron/scheduler');
const connectDB = require('./config/db');

// Monkey-patch whatsappService to log instead of calling API
const whatsapp = require('./services/whatsappService');
// const originalSend = whatsapp.sendMessage;
// const originalTemplate = whatsapp.sendServiceMenuTemplate;
// const originalConfirm = whatsapp.sendBookingConfirmTemplate;
// const originalReminder = whatsapp.sendReminderTemplate;

whatsapp.sendMessage = async (phone, msg) => {
  console.log(`\n📤 BOT → ${phone}\n   "${msg}"\n`);
};
whatsapp.sendServiceMenuTemplate = async (phone, name) => {
  console.log(`\n📤 BOT → ${phone} [TEMPLATE: saloon_services]\n   Buttons: ✂️ Haircut ₹200 | 🧔 Beard ₹100 | 💆 Facial ₹500\n`);
};
whatsapp.sendBookingConfirmTemplate = async (phone, name, service, date, time) => {
  console.log(`\n📤 BOT → ${phone} [TEMPLATE: saloon_booking_confirm]\n   ✅ ${service} | 📅 ${date} | ⏰ ${time}\n`);
};
whatsapp.sendReminderTemplate = async (phone, name, label) => {
  console.log(`\n📤 BOT → ${phone} [TEMPLATE: saloon_reminder]\n   ⏰ ${label}\n`);
};

// ── Test conversation ──
const TEST_PHONE = '919725021663';

const conversation = [
  'Hello',
  'bhai appointment book karna hai',
  'Haircut',        // Service select (template button click simulation)
  'Kal',            // Date
  '11 AM',          // Time
];

async function runTest() {
  await connectDB();
  initScheduler();

  console.log('='.repeat(50));
  console.log('🧪 Bot Test Starting...');
  console.log('='.repeat(50));

  for (const msg of conversation) {
    console.log(`\n👤 USER → "${msg}"`);
    await handleIncomingMessage(TEST_PHONE, msg);
    await new Promise(r => setTimeout(r, 1000)); // 1 sec gap between messages
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Test Complete!');
  console.log('='.repeat(50));
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
