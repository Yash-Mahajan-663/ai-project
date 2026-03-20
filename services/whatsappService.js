const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// Correct base URL: https://internal.11za.in/apis (confirmed from 11za API Integration Config panel)
const baseUrl = (process.env.ELEVENZA_API_BASE_URL || 'https://internal.11za.in/apis').replace(/\/$/, '');
const token = process.env.ELEVENZA_AUTH_TOKEN;
const originWebsite = process.env.ELEVENZA_ORIGIN_WEBSITE || 'www.11za.com';

// ─────────────────────────────────────────────
// Reusable internal axios caller with auth
// ─────────────────────────────────────────────
async function callApi(endpoint, body) {
  // endpoint normally shouldn't have a leading slash now
  const url = `${baseUrl}/${endpoint.replace(/^\//, '')}`;
  console.log(`🚀 [API CALL] POST ${url}`);
  const response = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json'
      // Removing Bearer token if it's already in the body as authToken
    }
  });
  return response.data;
}

// ─────────────────────────────────────────────
// Check if token is configured
// ─────────────────────────────────────────────
function isSimulationMode() {
  return !token || token === 'your_auth_token_here';
}

// ─────────────────────────────────────────────
// 1. Send a plain text message
// ─────────────────────────────────────────────
/**
 * @param {string} phone  - e.g. "919876543210"
 * @param {string} message - Plain text
 */
async function sendMessage(phone, message) {
  if (isSimulationMode()) {
    console.log(`[SIM] MSG → ${phone}: ${message}`);
    return;
  }
  try {
    const payload = {
      authToken: token,
      sendto: phone,
      originWebsite,
      message: message
    };
    // Plain text message endpoint on internal.11za.in
    return await callApi('sendMessage/sendMessages', payload);
  } catch (err) {
    console.error(`[sendMessage] Error to ${phone}:`, err.response?.data || err.message);
  }
}

// ─────────────────────────────────────────────
// 2. Send a 11za template message
// ─────────────────────────────────────────────
/**
 * @param {string} phone          - e.g. "919876543210"
 * @param {string} customerName   - Customer's display name
 * @param {string} templateName   - Exact template name from 11za panel
 * @param {Object} [options]      - Optional extra fields
 * @param {string[]} [options.data]        - Dynamic variables {{1}}, {{2}}...
 * @param {string|string[]} [options.buttonValue] - Button URL(s) if template has URL buttons
 * @param {string} [options.headerdata]    - Header dynamic text if needed
 * @param {string} [options.myfile]        - Media URL (image/doc/video)
 * @param {string} [options.myfilename]    - Filename visible to customer
 * @param {string} [options.tags]          - Comma-separated tags e.g. "saloon,booking"
 */
async function sendTemplate(phone, customerName, templateName, options = {}) {
  const payload = {
    authToken: token,
    name: customerName || 'Customer',
    sendto: phone,
    originWebsite,
    templateName,
    language: 'en',
    ...(options.data && { data: options.data }),
    ...(options.buttonValue && { buttonValue: options.buttonValue }),
    ...(options.headerdata && { headerdata: options.headerdata }),
    ...(options.myfile && { myfile: options.myfile }),
    ...(options.myfilename && { myfilename: options.myfilename }),
    ...(options.tags && { tags: options.tags }),
  };

  if (isSimulationMode()) {
    console.log(`[SIM] TEMPLATE → ${phone} | Template: ${templateName}`, payload);
    return;
  }

  try {
    // Correct 11za endpoint for template messages
    return await callApi('template/sendTemplate', payload);
  } catch (err) {
    console.error(`[sendTemplate] Error sending "${templateName}" to ${phone}:`, err.response?.data || err.message);
  }
}

// ─────────────────────────────────────────────
// 3. Shortcut: Service Menu Template
//    Template body expects no dynamic variables
// ─────────────────────────────────────────────
async function sendServiceMenuTemplate(phone, customerName) {
  return sendTemplate(phone, customerName, 'saloon_services_3', {
    tags: 'saloon,services'
  });
}

// ─────────────────────────────────────────────
// 4. Shortcut: Booking Confirmation Template
//    Template body e.g.: "Aapka {{1}} appointment {{2}} ko {{3}} baje confirm ho gaya ✅"
// ─────────────────────────────────────────────
async function sendBookingConfirmTemplate(phone, customerName, service, date, time) {
  return sendTemplate(phone, customerName, 'saloon_booking_confirm', {
    data: [service, date, time],
    tags: 'saloon,booking'
  });
}

// ─────────────────────────────────────────────
// 5. Shortcut: Reminder Template
//    Template body e.g.: "Aapka {{1}} appointment {{2}} mein hai ⏰"
// ─────────────────────────────────────────────
async function sendReminderTemplate(phone, customerName, appointmentLabel) {
  return sendTemplate(phone, customerName, 'saloon_reminder', {
    data: [appointmentLabel],
    tags: 'saloon,reminder'
  });
}

module.exports = {
  sendMessage,
  sendTemplate,
  sendServiceMenuTemplate,
  sendBookingConfirmTemplate,
  sendReminderTemplate
};
