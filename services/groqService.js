const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile'; // More reliable JSON output than 8b-instant

// ─────────────────────────────────────────────────────
// System Prompt — Saloon AI ka personality & rules
// ─────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are a JSON extraction engine for a WhatsApp saloon booking bot. Your ONLY job is to extract structured data from user messages and return a strict JSON object.

Today's date: ${new Date().toISOString().split('T')[0]}

YOU MUST RETURN EXACTLY THIS JSON STRUCTURE — NO OTHER KEYS ALLOWED:
{
  "intent": "<one of: GREETING | BOOKING | CANCEL | RESCHEDULE | SERVICES | AVAILABILITY | FEEDBACK | UNKNOWN>",
  "service": "<one of: Haircut | Beard | Facial | null>",
  "date": "<YYYY-MM-DD format or null>",
  "time": "<e.g. 10:00 AM or null>",
  "reply": "<short friendly Hinglish reply for the user>"
}

STRICT RULES:
1. Output ONLY the JSON object above. No extra text, no extra keys, no markdown.
2. Always include ALL 5 keys: intent, service, date, time, reply.
3. Use null (not the string "null") for missing values.
4. intent must be exactly one value from the allowed list.
5. reply must be short (1-2 sentences), friendly, in Hinglish (Hindi + English mix).
6. For GREETING intent: reply with a welcome message.
7. For SERVICES intent: reply asking what service they want.
8. For dates like "kal" use tomorrow's date. "aaj" = today.

AVAILABLE SERVICES: Haircut (₹200), Beard Trim (₹100), Facial (₹500)
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
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.error('[GROQ] JSON parse failed. Raw was:', raw);
      throw parseErr;
    }

    // Validate and extract only the expected 5 keys (ignore any extra keys model hallucinated)
    const result = {
      intent: parsed.intent || 'UNKNOWN',
      service: parsed.service || null,
      date: parsed.date || null,
      time: parsed.time || null,
      reply: parsed.reply || 'Kuch samajh nahi aaya, dobara try karein.'
    };

    console.log('[GROQ]', result);
    return result;

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
