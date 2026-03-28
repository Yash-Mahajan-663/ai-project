# 🧠 AI-Powered WhatsApp Appointment Booking System — Complete Deep Dive

> **Project Name:** `11za-appointment-ai`
> **Tech Stack:** Node.js (Express) + MongoDB (Mongoose) + Groq AI (LLaMA 3.3 70B) + 11za WhatsApp API + Vercel Serverless
> **Admin Dashboard:** Next.js (inside `/admin`)

---

## Table of Contents

1. [Project Overview](#1--project-overview)
2. [Architecture Breakdown](#2-️-architecture-breakdown)
3. [Workflow Deep Dive (Step-by-Step)](#3--workflow-deep-dive)
4. [Node/File Configuration Guide](#4-️-node-configuration-guide)
5. [Testing Guide](#5--testing-guide)
6. [Trigger System Explanation](#6--trigger-system-explanation)
7. [Reminder & Notification Flow](#7--reminder--notification-flow)
8. [Database Design](#8--database-design)
9. [Real-world Use Cases](#9--real-world-use-cases)
10. [Future Enhancements](#10--future-enhancements)
11. [Interview Explanation Mode](#11--interview-explanation-mode)
12. [Bonus: Folder Structure, Deployment & Security](#12--bonus)

---

## 1. 🧠 Project Overview

### Kya Karta Hai Ye Project? (Simple Terms)

Imagine a saloon owner — uske paas daily 50-100 phone aate hain:
- "Bhai haircut ka appointment kab milega?"
- "Kal 3 baje ka slot hai kya?"
- "Mera booking cancel kardo"

Ab ye sab manually handle karna = **pagal ho jaoge**.

**Ye system ek AI-powered WhatsApp chatbot hai** jo:
1. Customer ka message **automatically padhta hai** (text ya voice dono)
2. **AI se samajhta hai** ki kya chahiye (booking? cancel? reschedule?)
3. **Slot check karta hai** MongoDB database mein
4. **Booking confirm karta hai** aur WhatsApp pe template bhejta hai
5. **Reminders bhejta hai** appointment se pehle
6. **Feedback maangta hai** baad mein
7. Abandoned bookings ka **follow-up karta hai**
8. **Admin Dashboard** pe sab data dikhata hai

### Real-World Problem It Solves

| Problem | Solution |
|---------|----------|
| Manual phone calls for bookings | Automated WhatsApp chatbot |
| Missed appointments (no-shows) | Auto-reminders 2 hours before |
| Double-booking slots | Real-time slot availability check |
| Lost customers (abandoned bookings) | 3-stage escalation reminders |
| No customer insights | Admin dashboard with revenue, clients, analytics |
| Language barrier | Hinglish (Hindi+English) AI responses |
| Voice messages ignored | Auto-transcription via Groq Whisper |

---

## 2. 🏗️ Architecture Breakdown

### High-Level Architecture Diagram

```mermaid
graph TD
    A["👤 Customer WhatsApp"] -->|Sends Message| B["11za WhatsApp API"]
    B -->|Webhook POST /webhook| C["Express Server (server.js)"]
    C -->|Route| D["webhookController.js"]
    D -->|Extract phone + message| E["botService.js (BRAIN)"]
    E -->|Analyze message| F["groqService.js (Groq LLaMA 3.3 70B)"]
    F -->|Returns JSON: intent, service, date, time| E
    E -->|Read/Write| G["MongoDB (Mongoose)"]
    E -->|Send reply| H["whatsappService.js"]
    H -->|POST API| B
    B -->|Delivers message| A

    I["⏰ node-cron Scheduler"] -->|Every 10s| J["Check Reminders"]
    J -->|Send via| H
    I -->|Every 1h| K["Abandoned Booking Cleanup"]

    L["🖥️ Admin Dashboard (Next.js)"] -->|GET /api/admin/*| C
    C -->|Query| G
```

### Layer-by-Layer Explanation

#### Layer 1: WhatsApp API (11za Provider)

**Kya hai?** 11za ek Indian WhatsApp Business API provider hai (like Gupshup, Wati). Ye tumhare WhatsApp number ko programmatically control karne deta hai.

**Kaise kaam karta hai?**
- 11za ko ek webhook URL dete ho (e.g., `https://your-domain.com/webhook`)
- Jab bhi koi customer aapko WhatsApp pe message bhejta hai → 11za us message ko aapke server pe **POST request** ke through bhejta hai
- Reply bhejne ke liye aap 11za ke API ko call karte ho

**Key Config (from [.env](file:///d:/11za-saloon-ai/.env)):**
```
ELEVENZA_API_BASE_URL=https://api.11za.in/apis
ELEVENZA_AUTH_TOKEN=<your_token>
ELEVENZA_ORIGIN_WEBSITE=<your_website_id>
ELEVENZA_WEBHOOK_SECRET=<webhook_secret>
```

#### Layer 2: Webhook Handling ([webhookController.js](file:///d:/11za-saloon-ai/controllers/webhookController.js))

Ye file incoming WhatsApp messages ka **"reception desk"** hai. Jab bhi koi message aata hai:

1. **Security Check** — `x-api-key` header verify karta hai
2. **Payload Parsing** — 11za ka payload parse karta hai (phone, message, sender name)
3. **Message Type Detection:**
   - `interactive` → Button/List replies (button_reply.id / list_reply.id)
   - `media` (voice) → Audio download + Groq Whisper transcription
   - `text` → Plain text extraction (multiple fallback paths)
4. **Routing** → `botService.handleIncomingMessage(phone, messageBody, senderName)`

#### Layer 3: Bot Brain ([botService.js](file:///d:/11za-saloon-ai/services/botService.js))

Ye **637 lines ka file** poore system ka dil hai. Isme:
- **Session management** (state machine)
- **Intent routing** (AI se intent → correct handler)
- **Booking flow** (service → date → time → confirm)
- **Reschedule/Cancel** logic
- **Feedback collection**
- **Waitlist management**
- **Slot availability checking**

#### Layer 4: AI Engine ([groqService.js](file:///d:/11za-saloon-ai/services/groqService.js))

**Groq** ek ultra-fast AI inference provider hai. Ye **LLaMA 3.3 70B** (Meta ka model) use karta hai.

**Kya karta hai?**
- User ka raw message leta hai (e.g., "Kal 3 baje haircut karwana hai")
- **Structured JSON extract** karta hai:
  ```json
  {
    "intent": "BOOKING",
    "service": "Haircut",
    "date": "2026-03-29",
    "time": "3:00 PM",
    "reply": "Zaroor! Kal 3 baje Haircut book karta hoon! 💈"
  }
  ```

**Why not OpenAI?** Groq is **10x faster** (uses custom LPU chips), free tier generous, and JSON mode reliable.

#### Layer 5: Database (MongoDB via Mongoose)

5 collections:
- `sessions` — User conversation state (stage, draft booking)
- `bookings` — All bookings (pending, booked, cancelled)
- `reminders` — Scheduled reminder messages
- `waitlists` — Users waiting for a slot to open
- `feedbacks` — Star ratings + text feedback

---

## 3. 🔄 Workflow Deep Dive

### 3.1 Complete Booking Flow (Happy Path)

```
User: "Haircut book karna hai kal 3 baje"
  │
  ▼
[webhookController] ─── Extract phone, message, senderName
  │
  ▼
[botService.handleIncomingMessage]
  │  ├── Check: Is "yes"/"confirm"/"cancel"? → Short-circuit
  │  ├── Find/Create Session (MongoDB)
  │  └── Get AI analysis via groqService
  │
  ▼
[groqService.analyzeMessage]
  │  ├── System prompt with today's date + rules
  │  ├── Context history (if mid-flow)
  │  └── Returns: { intent: "BOOKING", service: "Haircut", date: "2026-03-29", time: "3:00 PM", reply: "..." }
  │
  ▼
[routeByIntent] → case 'BOOKING' → startBookingWithAI()
  │
  ▼
[startBookingWithAI]
  │  ├── Check: Is date/time in past? → Reject, ask again
  │  ├── Get price from pricingService (₹200)
  │  ├── Create/update draft Booking in MongoDB (status: 'pending')
  │  ├── All 3 fields present (service ✅, date ✅, time ✅)
  │  └── → confirmBooking()
  │
  ▼
[confirmBooking]
  │  ├── checkSlotAvailability(date, time) → Count booked bookings for that slot
  │  ├── If NOT available → Add to waitlist, ask for different time
  │  ├── If available:
  │  │     ├── Update Booking: status → 'booked'
  │  │     ├── Schedule reminders (2 hours before)
  │  │     ├── Schedule feedback request (2 min after appointment)
  │  │     └── sendBookingConfirmTemplate() via 11za API
  │  └── Reset session stage to 'IDLE'
  │
  ▼
User receives: "✅ Aapka Haircut appointment confirm ho gaya! 29th March 2026 ko 3:00 PM baje."
```

### 3.2 Multi-Step Booking (Missing Info)

Agar user sirf "Book karna hai" likhta hai (no service/date/time):

```
User: "Book appointment"
  AI → { intent: "BOOKING", service: null, date: null, time: null }
  Bot → Creates draft booking → Stage: BOOKING_ASK_SERVICE
  Bot → Sends service menu template (interactive buttons)

User: Clicks "Haircut" button
  Bot → handleServiceSelected() → Stage: BOOKING_ASK_DATE
  Bot → "Haircut ✅ Date kya hogi?"

User: "Kal"
  AI → { date: "2026-03-29" }
  Bot → handleBookingDateResponse() → Stage: BOOKING_ASK_TIME
  Bot → "29th March 2026 — Theek hai! Kis time par?"

User: "3 PM"
  AI → { time: "3:00 PM" }
  Bot → handleBookingTimeResponse() → confirmBooking()
  Bot → "✅ Booking confirmed!"
```

### 3.3 Session State Machine

```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> BOOKING_ASK_SERVICE: intent=BOOKING (no service)
    IDLE --> BOOKING_ASK_DATE: intent=BOOKING (has service, no date)
    IDLE --> BOOKING_ASK_TIME: intent=BOOKING (has service+date, no time)
    BOOKING_ASK_SERVICE --> BOOKING_ASK_DATE: service selected
    BOOKING_ASK_DATE --> BOOKING_ASK_TIME: date provided
    BOOKING_ASK_TIME --> IDLE: time provided + booking confirmed
    
    IDLE --> RESCHEDULE_SELECT_BOOKING: intent=RESCHEDULE (multiple bookings)
    IDLE --> RESCHEDULE_ASK_DATE: intent=RESCHEDULE (1 booking)
    RESCHEDULE_SELECT_BOOKING --> RESCHEDULE_ASK_DATE: booking selected
    RESCHEDULE_ASK_DATE --> RESCHEDULE_ASK_TIME: new date provided
    RESCHEDULE_ASK_TIME --> IDLE: new time confirmed

    IDLE --> CANCEL_SELECT_BOOKING: intent=CANCEL (multiple bookings)
    IDLE --> IDLE: intent=CANCEL (1 booking, auto-cancelled)
    CANCEL_SELECT_BOOKING --> IDLE: booking cancelled

    IDLE --> WAITING_FEEDBACK: intent=FEEDBACK
    WAITING_FEEDBACK --> IDLE: rating received
```

### 3.4 Reschedule Flow

```
User: "Reschedule karna hai"
  │
  ├── 0 active bookings → "Koi active booking nahi hai 🤔"
  │
  ├── 1 active booking → Stage: RESCHEDULE_ASK_DATE → "Naya date kya hoga?"
  │     User: "Parso"
  │     → Stage: RESCHEDULE_ASK_TIME → "Naya time kya hoga?"
  │     User: "5 PM"
  │     → Check slot → Update booking → sendRescheduleConfirmTemplate()
  │
  └── Multiple bookings → Stage: RESCHEDULE_SELECT_BOOKING
        Bot: "1. Haircut - 29th March @ 3 PM\n2. Facial - 30th March @ 11 AM\nWhich one?"
        User: "1"
        → Stage: RESCHEDULE_ASK_DATE → ...same flow
```

### 3.5 Cancel Flow

```
User: "Cancel kardo"
  │
  ├── 0 bookings → "Koi booking nahi hai 🤔"
  │
  ├── 1 booking → Instantly cancel + notifyWaitlist
  │
  └── Multiple → Show list → User selects → Cancel + notifyWaitlist
```

### 3.6 Waitlist & Slot Notification

```
User A books → Slot: 29 March, 3 PM ✅

User B tries same slot → FULL → Added to Waitlist

User A cancels → notifyWaitlistForSlot()
  → Finds User B in waitlist
  → Sends: "🎉 Ek slot free ho gaya! Reply 'Book appointment'"
  → Marks User B as notified
```

### 3.7 Voice Message Flow

```
User sends voice note on WhatsApp
  │
  ▼
[webhookController] detects content.contentType === 'media' && media.type === 'voice'
  │
  ▼
[audioService.transcribeAudio(audioUrl)]
  ├── Download .ogg file from 11za URL
  ├── Save to /tmp (Linux/Vercel) or ./temp (Windows)
  ├── Send to Groq Whisper (whisper-large-v3)
  ├── Get transcribed text
  └── Clean up temp file
  │
  ▼
Transcribed text → handleIncomingMessage() → Same flow as text
```

### 3.8 Feedback Flow

```
[After appointment, 2 min later, cron sends]:
  "Aapka Haircut experience kaisa raha? ⭐ (1-5)"
  
User: "5 bahut mast tha"
  → Stage: WAITING_FEEDBACK
  → handleFeedbackResponse() → Extract rating (5)
  → Save to Feedback collection
  → "⭐⭐⭐⭐⭐ Feedback dene ke liye shukriya!"
```

---

## 4. ⚙️ Node/File Configuration Guide

### 4.1 Environment Variables (`.env`)

```bash
# MongoDB connection
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/saloon-ai?retryWrites=true

# Groq AI
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# 11za WhatsApp API
ELEVENZA_API_BASE_URL=https://api.11za.in/apis
ELEVENZA_AUTH_TOKEN=your_11za_auth_token
ELEVENZA_ORIGIN_WEBSITE=your_website_identifier
ELEVENZA_WEBHOOK_SECRET=your_webhook_secret

# Environment
NODE_ENV=development
PORT=3000
```

### 4.2 Webhook Controller ([webhookController.js](file:///d:/11za-saloon-ai/controllers/webhookController.js))

**Required Config:**
- `ELEVENZA_WEBHOOK_SECRET` → For `x-api-key` header validation

**Sample Incoming Payload (11za format):**
```json
{
  "phone": "919876543210",
  "whatsapp": { "senderName": "Yash" },
  "messages": [{
    "type": "text",
    "text": { "body": "Haircut book karna hai kal 3 baje" }
  }]
}
```

**Voice Message Payload:**
```json
{
  "phone": "919876543210",
  "content": {
    "contentType": "media",
    "media": {
      "type": "voice",
      "url": "https://cdn.11za.in/media/voice_xxxxx.ogg"
    }
  }
}
```

**Interactive Button Reply Payload:**
```json
{
  "phone": "919876543210",
  "messages": [{
    "type": "interactive",
    "interactive": {
      "type": "button_reply",
      "button_reply": { "id": "Haircut", "title": "Haircut" }
    }
  }]
}
```

### 4.3 Groq Service ([groqService.js](file:///d:/11za-saloon-ai/services/groqService.js))

**Key Configuration:**
```javascript
const MODEL = 'llama-3.3-70b-versatile';  // Most reliable for JSON
// Temperature: 0.2 (low = consistent, deterministic)
// max_tokens: 300
// response_format: { type: 'json_object' }  // Forces JSON output
```

**System Prompt Rules (Critical):**
- Returns EXACTLY 5 keys: `intent`, `service`, `date`, `time`, `reply`
- 16 strict rules including date parsing ("aaj"=today, "kal"=tomorrow, "parso"=day after)
- Never asks for phone/ID (auto-detected)
- Uses `null` (not string "null") for missing values
- Rejects vague times ("shaam ko" → time: null, asks for exact)

**Fallback:** If no `GROQ_API_KEY`, uses regex-based `_simulateFallback()` for local dev.

### 4.4 WhatsApp Service ([whatsappService.js](file:///d:/11za-saloon-ai/services/whatsappService.js))

**API Endpoints Used:**
| Function | 11za Endpoint | Purpose |
|----------|--------------|---------|
| `sendMessage()` | `sendMessage/sendMessages` | Plain text replies |
| `sendTemplate()` | `template/sendTemplate` | Pre-approved template messages |

**Template Names (must match 11za panel):**
- `saloon_services_3` → Service menu with interactive buttons
- `saloon_booking_confirm` → Booking confirmation with service/date/time
- `saloon_reschedule_confirm` → Reschedule confirmation
- `saloon_reminder` → Appointment reminder

**Simulation Mode:** If `ELEVENZA_AUTH_TOKEN` is missing/placeholder, logs messages to console instead of sending.

### 4.5 Pricing Service ([pricingService.js](file:///d:/11za-saloon-ai/services/pricingService.js))

```javascript
const PRICES = {
  'Haircut': 200,
  'Beard': 100,
  'Facial': 500,
  'Haircut & Beard': 300,
  'Haircut & Facial': 700,
  'Beard & Facial': 600,
  'Haircut, Beard & Facial': 800
};
```

Case-insensitive lookup. Returns `0` for unknown services.

### 4.6 Database Connection ([config/db.js](file:///d:/11za-saloon-ai/config/db.js))

**Serverless-Safe Design:**
- Caches connection promise to prevent race conditions
- Reuses existing connections (`readyState === 1`)
- Auto-reconnects on disconnect
- Timeouts: `serverSelectionTimeoutMS: 8000`, `socketTimeoutMS: 45000`

> [!IMPORTANT]
> Vercel serverless functions cold-start every time. That's why `connectDB()` is called as Express middleware BEFORE every route handler — not just at startup.

---

## 5. 🧪 Testing Guide

### 5.1 Manual Testing with Postman/cURL

**Test the Webhook:**
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_webhook_secret" \
  -d '{
    "phone": "919876543210",
    "whatsapp": { "senderName": "Test User" },
    "messages": [{
      "type": "text",
      "text": { "body": "Haircut book karna hai kal 3 baje" }
    }]
  }'
```

**Test Admin APIs:**
```bash
curl http://localhost:3000/api/admin/stats
curl http://localhost:3000/api/admin/bookings
curl http://localhost:3000/api/admin/clients
curl http://localhost:3000/api/admin/revenue
curl http://localhost:3000/api/admin/inquiries
```

**Test Health Check:**
```bash
curl http://localhost:3000/health
```

### 5.2 WhatsApp Live Testing

1. Set up 11za webhook URL → `https://your-vercel-url.vercel.app/webhook`
2. Send these test messages from your WhatsApp:

| Test Case | Send Message | Expected |
|-----------|-------------|----------|
| Greeting | "Hi" | Welcome message |
| Full Booking | "Haircut kal 3 baje" | Booking confirmed |
| Partial Booking | "Book appointment" | Service menu template |
| Cancel | "Cancel kardo" | Cancellation confirmation |
| Reschedule | "Reschedule karna hai" | New date/time flow |
| My Bookings | "Meri bookings dikhao" | List of all bookings |
| Feedback | "Feedback dena hai" → "5 great!" | Thank you + stars |
| Out of Scope | "Tell me a joke" | "I only handle appointments" |
| Voice | Send voice note "Haircut chahiye" | Transcribe + process |
| Past Date | "Kal booking 10 AM" (if 10 AM has passed) | Reject + ask again |

### 5.3 Debugging Failed Nodes

**Console Logs to Watch:**
```
═════════════════════════════════════════════════
📥 WEBHOOK RECEIVED — 2:45:30 PM
──────────────────────────────────────────────────
{ full payload dump }
──────────────────────────────────────────────────
👤 SENDER: Yash
💬 TEXT MESSAGE: "Haircut kal 3 baje"
📱 FROM: 919876543210
✅ Routing to botService...
🎯 [BOT] Phone: 919876543210 | Stage: IDLE | Msg: "Haircut kal 3 baje"
🤖 [GROQ] Intent: BOOKING | Service: Haircut | Date: 2026-03-29 | Time: 3:00 PM
🚀 [API CALL] POST https://api.11za.in/apis/template/sendTemplate
```

**If GROQ fails:**
```
[GROQ] Error: Invalid API Key provided
→ Fix: Check GROQ_API_KEY in .env
```

**If 11za fails:**
```
[sendMessage] Error to 919876543210: { error: 'Unauthorized' }
→ Fix: Check ELEVENZA_AUTH_TOKEN
```

**If MongoDB fails:**
```
❌ MongoDB Connection FAILED: connection timed out
→ Fix: Check MONGODB_URI, whitelist IP in Atlas
```

### 5.4 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `MongooseError: buffering timed out` | Cold start delay | `connectDB()` middleware already handles this |
| `GROQ JSON parse failed` | AI returned non-JSON | Lower temperature, stricter system prompt |
| `403 on audio download` | CDN blocking | Add `User-Agent: Mozilla/5.0` header (already done) |
| `Slot always shows available` | Date format mismatch | Ensure `YYYY-MM-DD` consistently |
| `Template not sending` | Template not approved on 11za | Approve template in 11za panel first |
| `Empty voice transcription` | 0-byte file download | Check auth token, audio URL expiry |

---

## 6. ⏰ Trigger System Explanation

### 6.1 Event-Based Triggers (User Message)

```mermaid
graph LR
    A["User sends WhatsApp msg"] -->|11za Webhook| B["POST /webhook"]
    B --> C["webhookController"]
    C --> D["botService"]
```

**When:** Every time a customer sends ANY message (text, voice, button click)
**How:** 11za fires a POST request to your `/webhook` endpoint
**Handler:** `webhookController.receiveWebhook()`

### 6.2 Time-Based Triggers (Cron Jobs)

Two cron jobs run in [scheduler.js](file:///d:/11za-saloon-ai/cron/scheduler.js):

#### Cron 1: Reminder Processor (Every 10 seconds)
```javascript
cron.schedule('*/10 * * * * *', async () => {
  // Find all reminders where: sent=false AND schedule_time <= now
  // Send them via WhatsApp
  // Mark as sent=true
});
```
- **Runs:** Every 10 seconds
- **Checks:** `reminders` collection for unsent, due reminders
- **Action:** Sends reminder template (or feedback text) via WhatsApp

#### Cron 2: Abandoned Booking Cleanup (Every 1 hour)
```javascript
cron.schedule('0 * * * *', async () => {
  // Stage 1: Delete bookings with 3+ reminders and no response for 24h
  // Stage 2: Send reminder if pending for 30+ min (max 3 times, 1/day)
});
```
- **Runs:** Every hour (`0 * * * *`)
- **Finds:** Bookings stuck in `pending` status for 30+ minutes
- **Action:** Send up to 3 nudge messages (1 per day), then auto-delete

### 6.3 Conditional Triggers (Booking Events)

These are **not cron-based** — they're triggered programmatically when a booking action happens:

| Event | Trigger | Action |
|-------|---------|--------|
| Booking confirmed | `confirmBooking()` | `scheduleAppointmentReminders()` + `scheduleFeedbackRequest()` |
| Booking cancelled | `handleCancelMode()` | `notifyWaitlistForSlot()` |
| Booking rescheduled | `handleRescheduleTimeResponse()` | `scheduleAppointmentReminders()` (new time) |
| Slot freed | Cancellation | Waitlist users get notified |

---

## 7. 🔔 Reminder & Notification Flow

### 7.1 How Reminders Are Scheduled

When a booking is confirmed, TWO reminders are created:

```javascript
// In confirmBooking():
scheduleAppointmentReminders(bookingId, phone, date, time, service);
scheduleFeedbackRequest(phone, date, time, service, bookingId);
```

#### Appointment Reminder:
```
IF appointment is 2+ hours away:
  → Create reminder for 2 hours BEFORE appointment
ELSE IF appointment is 15min - 2hours away:
  → Create reminder for 1 minute from NOW (last-minute booking)
ELSE:
  → No reminder (too late)
```

#### Feedback Request:
```
→ Create reminder for 2 minutes AFTER appointment time
→ Message: "Aapka Haircut experience kaisa raha? ⭐ (1-5)"
```

### 7.2 How Reminders Are Processed

The cron job (every 10s) does:

```
1. Query: Reminder.find({ sent: false, schedule_time: { $lte: now } })
2. For each reminder:
   a. If message contains "experience" → sendMessage() (plain text for feedback)
   b. ELSE → sendReminderTemplate() (WhatsApp template for appointment reminder)
   c. Mark sent = true
```

### 7.3 IST Timezone Handling

```javascript
// In parseToDate() → scheduler.js
// User says "3:00 PM" meaning IST
// MongoDB stores UTC
// So we SUBTRACT 5:30 hours from the nominal time to get correct UTC:
const actualIstDate = new Date(utcNominalDate.getTime() - (5.5 * 60 * 60 * 1000));
```

> [!WARNING]
> Vercel servers are in UTC. The `parseToDate()` function converts IST user-entered times to proper UTC timestamps. Without this conversion, reminders would fire 5.5 hours late!

### 7.4 Abandoned Booking Escalation

```
Stage 1 (30 min after pending):
  → "Hi Yash! Aapki Haircut ki booking poori nahi ho payi. 'Book appointment' likhkar bhejiye."
  → abandoned_reminder_count: 1

Stage 2 (24h after Stage 1):
  → Same message again
  → abandoned_reminder_count: 2

Stage 3 (24h after Stage 2):
  → Same message again
  → abandoned_reminder_count: 3

Stage 4 (24h after Stage 3):
  → DELETE the pending booking from database
  → Clear session (stage → IDLE, draft_booking_id → null)
  → Log: "🗑️ Deleted abandoned booking for 919876543210 after 3 reminders"
```

---

## 8. 🧾 Database Design

### 8.1 Collections Overview

```mermaid
erDiagram
    SESSION ||--o| BOOKING : "draft_booking_id"
    BOOKING ||--o{ REMINDER : "booking_id"
    SESSION {
        string phone PK
        string name
        string stage
        ObjectId draft_booking_id FK
        date updated_at
    }
    BOOKING {
        ObjectId _id PK
        string phone
        string name
        string status
        string service
        number price
        string date
        string time
        boolean abandoned_reminder_sent
        number abandoned_reminder_count
        date last_abandoned_reminder
        date created_at
        date updated_at
    }
    REMINDER {
        ObjectId _id PK
        ObjectId booking_id FK
        string phone
        string message
        date schedule_time
        boolean sent
        date created_at
    }
    WAITLIST {
        ObjectId _id PK
        string phone
        string name
        string date
        string time
        boolean notified
        date created_at
    }
    FEEDBACK {
        ObjectId _id PK
        string phone
        string name
        number rating
        string feedback
        date created_at
    }
```

### 8.2 Session Schema ([Session.js](file:///d:/11za-saloon-ai/models/Session.js))

```javascript
{
  phone:            String,    // "919876543210" — UNIQUE, PK equivalent
  name:             String,    // "Yash" (from whatsapp.senderName)
  stage:            String,    // "IDLE" | "BOOKING_ASK_SERVICE" | "BOOKING_ASK_DATE" | ...
  draft_booking_id: ObjectId,  // Ref → Booking (the in-progress booking)
  updated_at:       Date
}
```

**Purpose:** Tracks WHERE in the conversation flow a user currently is. Without this, the bot wouldn't know if "3 PM" means the user is providing a time for a booking, a reschedule, or something else entirely.

### 8.3 Booking Schema ([Booking.js](file:///d:/11za-saloon-ai/models/Booking.js))

```javascript
{
  phone:                    String,    // "919876543210"
  name:                     String,    // "Yash"
  status:                   String,    // "pending" | "booked" | "cancelled"
  service:                  String,    // "Haircut" | "Beard" | etc.
  price:                    Number,    // 200
  date:                     String,    // "2026-03-29" (YYYY-MM-DD)
  time:                     String,    // "3:00 PM"
  abandoned_reminder_sent:  Boolean,   // Has at least 1 abandoned reminder been sent?
  abandoned_reminder_count: Number,    // 0-3 (max 3 reminders)
  last_abandoned_reminder:  Date,      // When was the last abandoned reminder sent?
  created_at:               Date,
  updated_at:               Date
}
```

**Lifecycle:**
```
pending → booked (on confirmBooking)
pending → deleted (abandoned after 3 reminders)
booked → cancelled (user cancels)
```

### 8.4 How Data Flows

**Booking Creation:**
1. `startBookingWithAI()` → `new Booking({ status: 'pending', phone, name, service?, date?, time? })`
2. Session updated with `draft_booking_id`
3. As user provides missing info, `Booking.updateOne()` fills fields
4. `confirmBooking()` → `status: 'booked'`

**Slot Check:**
```javascript
async function checkSlotAvailability(date, time) {
  const count = await Booking.countDocuments({ date, time, status: 'booked' });
  return count === 0; // true = available
}
```
> Currently allows **1 booking per slot**. For saloons with multiple chairs, change to `count < MAX_CHAIRS`.

---

## 9. 🚀 Real-world Use Cases

### 9.1 Salon/Saloon Booking ← **Current Implementation**
- Services: Haircut, Beard, Facial, combos
- Slot management: 1 per time slot
- Pricing: Fixed per service
- Reminders: 2 hours before

### 9.2 Doctor/Clinic Appointment
Same architecture, change:
- `PRICES` → Consultation fees (₹500 General, ₹1000 Specialist)
- Add `doctor` field in Booking schema
- Slot check → per doctor (`{ date, time, doctor, status: 'booked' }`)
- Templates → "Dr. Sharma ke saath aapki appointment confirm hai 🩺"

### 9.3 Consultation Booking (Legal/Financial)
- Services: "Tax Filing", "Legal Advice", "Investment Planning"
- Duration-based slots (30min, 1hr)
- Premium pricing with GST

### 9.4 Any Service Business
- **Spa:** Massage types, therapist selection
- **Gym:** Personal training slots
- **Photography:** Wedding/Event booking
- **Tuition:** Class scheduling
- **Home Repair:** Plumber/Electrician booking

**To adapt:** Change `pricingService.js`, modify the AI system prompt's `AVAILABLE SERVICES` list, and update WhatsApp templates.

---

## 10. 🌟 Future Enhancements

### 10.1 AI Intent Detection — GPT-Based (Already Done ✅)
Your project already uses **Groq LLaMA 3.3 70B** with structured JSON extraction. Future upgrade:
- Switch to **GPT-4o-mini** for even better Hinglish understanding
- Add **RAG** (Retrieval Augmented Generation) for FAQ answers from a knowledge base
- Implement **conversation memory** (last 5 messages as context)

### 10.2 Multi-Language Chatbot
```javascript
// Add to system prompt:
"Detect user's language and reply in the same language.
If Hindi: reply in Hindi. If English: reply in English. If Tamil: reply in Tamil."

// Or add per-session language preference:
SessionSchema.add({ language: { type: String, default: 'hi' } });
```

### 10.3 Payment Integration (Razorpay)
```
Booking Confirmed → Generate Razorpay payment link
→ Send via WhatsApp: "Pay ₹200 for Haircut: https://rzp.io/l/xxxxx"
→ Razorpay webhook → Update booking payment_status
→ Only CONFIRM booking after payment received
```

### 10.4 Admin Dashboard (Already Built ✅ in `/admin`)
Your [admin](file:///d:/11za-saloon-ai/admin) folder has a **Next.js dashboard** with:
- Executive stats (revenue, today's bookings, new clients)
- Booking calendar
- Client vault (aggregated spend, visit history)
- Live inquiries monitor
- Revenue analytics

### 10.5 Reschedule/Cancel System (Already Built ✅)
Both fully implemented with multi-booking selection, slot re-validation, and waitlist notification.

### 10.6 Smart Slot Recommendation
```javascript
// Suggest least busy times:
async function recommendSlots(date) {
  const booked = await Booking.find({ date, status: 'booked' });
  const allSlots = ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
  return allSlots.filter(s => !booked.find(b => b.time === s));
}
```

### 10.7 Analytics & Reports
- **Daily/Weekly/Monthly** booking trends
- **Service popularity** (which service booked most)
- **Peak hours** analysis
- **Customer lifetime value** (CLV)
- **Cancellation rate** tracking
- **Revenue forecasting** using historical data

### 10.8 Additional Ideas
| Feature | Difficulty | Impact |
|---------|-----------|--------|
| Google Calendar sync | Medium | Real-time slot management |
| Staff assignment | Medium | Multi-employee saloons |
| Loyalty points system | Low | Customer retention |
| WhatsApp catalogues | Low | Better service browsing |
| QR code check-in | Low | Walk-in tracking |
| SMS fallback | Low | When WhatsApp fails |
| Multi-branch support | High | Franchise model |

---

## 11. 🎤 Interview Explanation Mode

### How to Describe This Project in 2 Minutes

> "Maine ek AI-powered WhatsApp chatbot banaya hai jo salon bookings automate karta hai. Customer WhatsApp pe message bhejta hai — text ya voice dono support hain — aur Groq AI (LLaMA 3.3 70B) us message se intent detect karta hai. System ek finite state machine use karta hai conversation track karne ke liye — IDLE se BOOKING_ASK_SERVICE, BOOKING_ASK_DATE, BOOKING_ASK_TIME stages se hokar booking confirm hoti hai.
>
> Backend Node.js + Express hai, MongoDB mein data store hota hai, aur 11za WhatsApp Business API use karke messages send/receive hote hain. Slot availability real-time check hoti hai, agar slot occupied hai toh user ko waitlist pe daal deta hai. Booking ke baad automatic reminders schedule hoti hain via node-cron.
>
> Iske saath ek Next.js admin dashboard bhi hai jo revenue analytics, client vault, live inquiries, aur booking calendar dikhata hai. Poora system Vercel pe serverless deploy hai."

### Problem Statement
> "Small service businesses (salons, clinics, spas) lose customers kyunki unke paas 24/7 booking system nahi hota. Customers calls karte hain but owner busy hota hai. Manual scheduling mein double-bookings aur missed appointments common hain."

### Solution Approach
> "WhatsApp India ka #1 messaging platform hai — 500M+ users. Toh maine WhatsApp ko primary interface banaya. AI Natural Language Processing se conversational booking enable kiya — no app download, no website needed. Just chat and book."

### Tech Stack Justification

| Choice | Why |
|--------|-----|
| **Node.js** | Async I/O perfect for webhook processing, npm ecosystem |
| **Express** | Lightweight, proven, easy middleware for DB connection |
| **MongoDB** | Schema flexibility (sessions have different fields than bookings), document model fits well |
| **Groq (LLaMA 3.3)** | 10x faster than OpenAI, free tier, excellent JSON mode, handles Hinglish |
| **11za API** | Indian provider, affordable, WhatsApp Business API, template support |
| **node-cron** | Simple, reliable, no external scheduler needed |
| **Vercel** | Free tier, auto-scaling, serverless (no server management) |
| **Next.js (Admin)** | React-based, SSR, easy API routes, same Vercel deployment |

### Challenges Faced

1. **Vercel Cold Starts** → MongoDB connections timing out. Fixed with cached `connectDB()` promise pattern.
2. **11za Payload Variations** → Different payload structures for text, interactive buttons, voice. Built multi-path extraction.
3. **AI Inconsistency** → LLM sometimes returned wrong JSON. Fixed with `response_format: { type: 'json_object' }` + strict system prompt + sanitize function.
4. **Timezone Issues** → Server runs in UTC, users are in IST. Built `parseToDate()` with IST-to-UTC conversion for correct reminder scheduling.
5. **Voice Message Auth** → CDN blocking downloads. Added `User-Agent` header.
6. **Abandoned Bookings** → Users start booking flow but don't complete. Built 3-stage escalation system with auto-cleanup.

### Scalability

```
Current:     1 salon, ~50-100 messages/day → Single Vercel function
Scale to:    10 salons → Add tenant_id to all schemas (multi-tenant)
Scale to:    1000 salons → Move to dedicated servers, Redis caching, message queues (BullMQ)
Scale to:    10000+ → Microservices architecture, Kubernetes, separate AI service
```

---

## 12. 📦 Bonus

### 12.1 Current Folder Structure

```
d:\11za-saloon-ai\
├── server.js                    ← Express entry point, route definitions
├── package.json                 ← Dependencies: express, mongoose, groq-sdk, axios, node-cron, date-fns
├── vercel.json                  ← Vercel deployment config (routes, builds)
├── Dockerfile                   ← Docker support (node:18-slim)
├── .env                         ← Environment variables
│
├── config/
│   └── db.js                    ← MongoDB connection (serverless-safe, cached promise)
│
├── controllers/
│   ├── webhookController.js     ← Incoming WhatsApp message handler
│   └── adminController.js       ← Admin dashboard API endpoints
│
├── services/
│   ├── botService.js            ← 🧠 CORE: State machine, booking/cancel/reschedule flows
│   ├── groqService.js           ← 🤖 AI: Groq LLaMA message analysis
│   ├── whatsappService.js       ← 📱 WhatsApp: Send messages/templates via 11za
│   ├── audioService.js          ← 🎙️ Voice: Download + transcribe via Groq Whisper
│   └── pricingService.js        ← 💰 Pricing: Service → price mapping
│
├── models/
│   ├── Session.js               ← User conversation state
│   ├── Booking.js               ← Appointment bookings
│   ├── Reminder.js              ← Scheduled reminders
│   ├── Waitlist.js              ← Slot waitlist entries
│   └── Feedback.js              ← Customer feedback/ratings
│
├── cron/
│   └── scheduler.js             ← ⏰ Reminder processing + abandoned booking cleanup
│
├── utils/
│   └── intentDetector.js        ← Basic regex fallback intent detector (unused in production)
│
└── admin/                       ← 🖥️ Next.js Admin Dashboard (separate app)
    ├── src/
    ├── package.json
    └── next.config.ts
```

### 12.2 If Adding Node.js Backend Features

Suggested additions for production:
```
├── middleware/
│   ├── auth.js                  ← Admin JWT authentication
│   ├── rateLimiter.js           ← express-rate-limit for webhook DDoS protection
│   └── errorHandler.js          ← Global error handler middleware
│
├── routes/
│   ├── webhookRoutes.js         ← Separate route files
│   └── adminRoutes.js
│
├── queues/
│   └── messageQueue.js          ← BullMQ for async message processing
│
├── logs/
│   └── app.log                  ← Winston structured logging
│
├── tests/
│   ├── botService.test.js       ← Jest unit tests
│   ├── groqService.test.js
│   └── webhook.integration.js   ← Supertest integration tests
```

### 12.3 Production Deployment Setup

#### Option 1: Vercel (Current ✅)

```json
// vercel.json — already configured
{
  "builds": [
    { "src": "admin/package.json", "use": "@vercel/next" },
    { "src": "server.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "server.js" },
    { "src": "/webhook", "dest": "server.js" },
    { "src": "/admin/(.*)", "dest": "admin/$1" }
  ]
}
```

> [!WARNING]  
> Vercel serverless has a **10-second timeout** on free tier. `node-cron` does NOT work on Vercel because functions die after response. You need **Vercel Cron Jobs** (`vercel.json` → `crons`) or an external scheduler (Render, Railway) for reminders.

#### Option 2: Railway/Render (Recommended for Cron)

```bash
# Railway — deploy with persistent process
railway init
railway link
railway up

# Render — use as background worker
# render.yaml:
services:
  - type: web
    name: 11za-saloon-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: MONGODB_URI
        sync: false
```

#### Option 3: Docker (Self-Hosted/VPS)

```bash
# Dockerfile already exists
docker build -t 11za-saloon-ai .
docker run -d -p 3000:3000 --env-file .env 11za-saloon-ai
```

### 12.4 Security Best Practices

| Category | Current Status | Recommendation |
|----------|---------------|----------------|
| **Webhook Auth** | ✅ `x-api-key` header check | Add HMAC signature verification |
| **API Keys** | ✅ In `.env` (not in code) | Use Vercel Environment Variables |
| **MongoDB** | ⚠️ Connection string in `.env` | Use MongoDB Atlas IP whitelist |
| **Rate Limiting** | ❌ Not implemented | Add `express-rate-limit` (100 req/min) |
| **Input Validation** | ⚠️ Basic | Add `express-validator` for admin APIs |
| **CORS** | ❌ Not configured | Add `cors()` middleware, whitelist admin domain |
| **Admin Auth** | ❌ No authentication | Add JWT auth for `/api/admin/*` routes |
| **Logging** | ⚠️ `console.log` only | Add `winston` with log levels, mask PII |
| **HTTPS** | ✅ Via Vercel | Enforced automatically |
| **Error Exposure** | ⚠️ Stack traces in dev | Use `NODE_ENV` to hide in production |
| **Dependency Audit** | ❌ Not automated | Add `npm audit` to CI/CD pipeline |

**Critical Security Additions:**

```javascript
// 1. Rate Limiting
const rateLimit = require('express-rate-limit');
app.use('/webhook', rateLimit({ windowMs: 60000, max: 60 }));

// 2. CORS
const cors = require('cors');
app.use(cors({ origin: ['https://your-admin-domain.vercel.app'] }));

// 3. Helmet (Security Headers)
const helmet = require('helmet');
app.use(helmet());

// 4. Input Sanitization
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());
```

---

> [!TIP]
> **Quick Rebuild Guide:** To rebuild this system from scratch:
> 1. Set up Express + MongoDB + Groq account
> 2. Create the 5 Mongoose models
> 3. Build `groqService.js` with the system prompt
> 4. Build `botService.js` state machine (start with IDLE → BOOKING flow only)
> 5. Add `webhookController.js` to receive webhook POSTs
> 6. Add `whatsappService.js` to send replies via 11za
> 7. Set up 11za webhook URL pointing to your `/webhook`
> 8. Add cron scheduler for reminders
> 9. Build admin dashboard as a separate Next.js app
> 10. Deploy to Vercel/Railway
