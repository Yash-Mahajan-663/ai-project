const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile'; // More reliable JSON output than 8b-instant

// ─────────────────────────────────────────────────────
// System Prompt — Appointment AI ka personality & rules
// ─────────────────────────────────────────────────────
function getSystemPrompt() {
  const today = new Date().toISOString().split('T')[0];
  return `
You are a JSON extraction engine for a WhatsApp appointment booking bot. Your ONLY job is to extract structured data from user messages and return a strict JSON object.

Today's date: ${today}

YOU MUST RETURN EXACTLY THIS JSON STRUCTURE — NO OTHER KEYS ALLOWED:
{
  "intent": "<one of: GREETING | BOOKING | CANCEL | RESCHEDULE | SERVICES | AVAILABILITY | MY_BOOKINGS | FEEDBACK | OUT_OF_SCOPE | UNKNOWN>",
  "service": "<ONE OF: Haircut | Beard | Facial | Haircut & Beard | Haircut & Facial | Beard & Facial | Haircut, Beard & Facial | null>",
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
7. For SERVICES intent: reply with a friendly intro to our services or ask what they want.
8. For dates: "aaj" = today, "kal" = tomorrow (today + 1 day), "parso" = day after tomorrow (today + 2 days).
9. EXACT TIME REQUIRED: If the user gives a vague time like "shaam ko", "subah", "afternoon" without an exact hour, YOU MUST set "time" to null and ask for the exact time in the "reply". ONLY use formats like "10:00 AM" or "4:30 PM" for the "time" field.
10. SERVICE EXTRACTION: If the user mentions "baal" or "cutting", it is "Haircut". If they mention "daadhi" or "trim", it is "Beard". If they mention "massage" or "face clean", it is typically "Facial". Map their intent to the closest available service name.
11. OUT_OF_SCOPE: If the user asks general knowledge questions, jokes, or about other topics not related to this appointment, return "intent": "OUT_OF_SCOPE" and a polite reply saying you only handle appointment bookings.
12. AVAILABILITY vs SERVICES: If the user asks for suggestions on "TIME", "WHAT TIME", "SLOTS" or "WHEN TO COME", use "intent": "AVAILABILITY". Only use "SERVICES" if they specifically ask about types of haircuts or packages.
13. HISTORY/CONTEXT: Look at the previous messages, especially any [CONTEXT] hints provided by the system. If the [CONTEXT] shows a "service" is already selected (e.g. Beard), DO NOT ask for it again unless the user wants to change it.
14. DATE VALIDATION: If the user requests a date/time that is clearly in the past (based on Today's date below), set the date/time in the JSON but in the "reply", kindly mention it's a past date and ask for a future one.

AVAILABLE SERVICES: 
- Haircut (₹200)
- Beard (₹100)
- Facial (₹500)
- Haircut & Beard (₹300)
- Haircut & Facial (₹700)
- Beard & Facial (₹600)
- Haircut, Beard & Facial (₹800)
`;
}

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
      { role: 'system', content: getSystemPrompt() },
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
      console.error('[GROQ] JSON parse failed. Raw:', raw);
      throw parseErr;
    }

    // Safeguard: handle case where model returns "null" as string
    const sanitize = (val) => (val === 'null' || val === '' ? null : val);

    const result = {
      intent: parsed.intent || 'UNKNOWN',
      service: sanitize(parsed.service),
      date: sanitize(parsed.date),
      time: sanitize(parsed.time),
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
  const t = msg.toLowerCase();
  if (/haircut.*beard|beard.*haircut|baal.*daadhi|daadhi.*baal/.test(t)) return 'Haircut & Beard';
  if (/haircut.*facial|facial.*haircut|baal.*face|face.*baal/.test(t)) return 'Haircut & Facial';
  if (/beard.*facial|facial.*beard|daadhi.*face|face.*daadhi/.test(t)) return 'Beard & Facial';
  if (/haircut|baal|hair|cutting/.test(t)) return 'Haircut';
  if (/beard|daadhi|trim/.test(t)) return 'Beard';
  if (/facial|face|massage|clean/.test(t)) return 'Facial';
  return null;
}

module.exports = { analyzeMessage };
