/**
 * Basic RegExp based Intent Detector
 * Matches user message to an intent
 */

const intents = [
  { intent: 'GREETING', patterns: [/\\b(hi|hello|hey|namaste|morning|evening)\\b/i] },
  { intent: 'BOOKING', patterns: [/book/i, /appointment/i] },
  { intent: 'AVAILABILITY', patterns: [/free/i, /available/i, /slot/i] },
  { intent: 'SERVICES', patterns: [/price/i, /service/i, /haircut/i, /cost/i, /charge/i, /menu/i] },
  { intent: 'RESCHEDULE', patterns: [/change/i, /reschedule/i, /shift/i] },
  { intent: 'CANCEL', patterns: [/cancel/i, /delete/i] },
  { intent: 'FEEDBACK', patterns: [/feedback/i, /review/i, /rating/i] },
];

function detectIntent(message) {
  for (let i of intents) {
    for (let regex of i.patterns) {
      if (regex.test(message)) {
        return i.intent;
      }
    }
  }
  return 'UNKNOWN';
}

module.exports = { detectIntent };
