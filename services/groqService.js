const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.1-8b-instant'; // Fast + free

// ─────────────────────────────────────────────────────
// System Prompt — Saloon AI ka personality & rules
// ─────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
Tu ek Smart Saloon AI Assistant hai jo 11za WhatsApp API se connected hai.
Aaj ki date hai: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.

LANGUAGE: Hamesha Hinglish mein baat kar (Hindi + English mix). Short aur friendly tone rakho.

AVAILABLE SERVICES:
- Haircut: ₹200
- Beard Trim: ₹100
- Facial: ₹500

TERA KAAM:
User ke message se yeh information extract karni hai (jo bhi available ho):
1. intent — Kya chahta hai user? (BOOKING / CANCEL / RESCHEDULE / SERVICES / AVAILABILITY / FEEDBACK / GREETING / UNKNOWN)
2. service — Kaunsi service? (Haircut / Beard / Facial / null)
3. date — Kaunsa din? ("Aaj", "Kal", ya "21 March" jaise specific date ko YYYY-MM-DD mein convert karo using aaj ki date as reference)
4. time — Kaunsa time? (e.g., "10:00 AM" / "15:00" / null)
5. reply — User ko kya bolna chahiye next step ke liye (short, friendly Hinglish mein)

RESPONSE FORMAT — SIRF valid JSON do, kuch aur mat likho:
{
  "intent": "BOOKING",
  "service": "Haircut",
  "date": "2026-03-20",
  "time": "10:00 AM",
  "reply": "Great! Aapka Haircut kal ke liye book kar raha hoon, kaunse time par aana chahenge?"
}

RULES:
- Agar koi field nahi mila toh null rakho
- Date hamesha YYYY-MM-DD format mein do
- Kabhi assume mat karo — agar date/time nahi mila toh reply mein puchho
- Services menu ke liye "reply" mein sirf text likho, template alag se jayega
- Cancel/Reschedule ke liye booking details nahi chahiye abhi, sirf intent detect karo
`;

// ─────────────────────────────────────────────────────
// Main function: User message → AI parsed response
// ─────────────────────────────────────────────────────
/**
 * @param {string} userMessage - Raw message from user
 * @param {Array}  history     - Optional: previous messages [{role, content}]
 * @returns {Object} { intent, service, date, time, reply }
 */
async function analyzeMessage(userMessage, history = []) {
  // Simulation mode if no API key
  if (!process.env.GROQ_API_KEY) {
    console.log(`[SIM-GROQ] Analyzing: "${userMessage}"`);
    return _simulateFallback(userMessage);
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: userMessage }
    ];

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.2,       // Low = more deterministic/consistent
      max_tokens: 300,
      response_format: { type: 'json_object' } // Force JSON output
    });

    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(raw);
    console.log('[GROQ]', parsed);
    return parsed;

  } catch (err) {
    console.error('[GROQ] Error:', err.message);
    // Fallback to basic reply on AI failure
    return {
      intent: 'UNKNOWN',
      service: null,
      date: null,
      time: null,
      reply: 'Maafi chahta hoon, kuch technical issue aa gaya. Thodi der baad try karein. 🙏'
    };
  }
}

// ─────────────────────────────────────────────────────
// Simulation fallback (when no GROQ key)
// Replicates basic regex logic for local dev/testing
// ─────────────────────────────────────────────────────
function _simulateFallback(message) {
  const msg = message.toLowerCase();

  if (/hi|hello|namaste|hey/.test(msg))
    return { intent: 'GREETING', service: null, date: null, time: null, reply: 'Hello 👋 Kaise help kar sakta hu aapki?' };

  if (/book|appointment|chahiye|karna hai/.test(msg))
    return { intent: 'BOOKING', service: _extractService(msg), date: null, time: null, reply: 'Zaroor! Kaunsi service chahiye?' };

  if (/cancel/.test(msg))
    return { intent: 'CANCEL', service: null, date: null, time: null, reply: 'Aapka booking cancel karta hoon.' };

  if (/reschedule|change|shift|badalna/.test(msg))
    return { intent: 'RESCHEDULE', service: null, date: null, time: null, reply: 'Naya date/time batao.' };

  if (/price|service|menu|kitna/.test(msg))
    return { intent: 'SERVICES', service: null, date: null, time: null, reply: 'Yeh raha hamara menu!' };

  if (/feedback|review|rating/.test(msg))
    return { intent: 'FEEDBACK', service: null, date: null, time: null, reply: 'Shukriya! Aapka feedback batao.' };

  return { intent: 'UNKNOWN', service: null, date: null, time: null, reply: 'Samajh nahi paaya. "Book appointment" ya "Services" type karein.' };
}

function _extractService(msg) {
  if (/haircut|baal|hair/.test(msg)) return 'Haircut';
  if (/beard|daadhi/.test(msg)) return 'Beard';
  if (/facial|face/.test(msg)) return 'Facial';
  return null;
}

module.exports = { analyzeMessage };
