const { handleIncomingMessage } = require('../services/botService');
const connectDB = require('../config/db');

/**
 * Handles incoming WhatsApp Webhooks from 11za
 */
async function receiveWebhook(req, res) {
  try {
    // Ensure database is connected before processing
    await connectDB();

    const payload = req.body;
    const expectedSecret = process.env.ELEVENZA_WEBHOOK_SECRET;

    if (expectedSecret) {
      const incomingToken = req.headers['x-api-key'];

      if (incomingToken !== expectedSecret) {
        console.error('❌ UNAUTHORIZED: Invalid Webhook Request. Headers mismatch.');
        return res.status(200).send('Unauthorized but acknowledged'); // Returning 200 to prevent retries
      }
    }

    // ── RAW PAYLOAD LOG — Dekho 11za exactly kya bhej raha hai ──
    console.log('\n' + '═'.repeat(60));
    console.log('📥 WEBHOOK RECEIVED —', new Date().toLocaleTimeString('en-IN'));
    console.log('─'.repeat(60));
    console.log(JSON.stringify(payload, null, 2));
    console.log('─'.repeat(60));

    // ── Phone Number Extract ──
    const phone = payload.phone || payload.from || (payload.messages && payload.messages[0]?.from);

    // ── Sender Name Extract (from whatsapp.senderName or fallbacks) ──
    const senderName = payload.whatsapp?.senderName || 'Anonymous';
    console.log(`👤 SENDER: ${senderName}`);

    // ── Message Body Extract ──
    let messageBody = '';
    const messageData = payload.messages ? payload.messages[0] : payload;
    console.log("messageData:::::::::::::", messageData)

    // Interactive Buttons (Vercel/Cloud API style)
    if (messageData?.type === 'interactive') {
      const interactive = messageData.interactive;
      if (interactive.type === 'button_reply') {
        messageBody = interactive.button_reply.id || interactive.button_reply.title;
      } else if (interactive.type === 'list_reply') {
        messageBody = interactive.list_reply.id || interactive.list_reply.title;
      }
    }
    // Audio/Voice messages (Speech-to-Text)
    else if (messageData?.type === 'audio' || messageData?.type === 'voice') {
      const audioUrl = messageData.audio?.link || messageData.voice?.link || messageData.link;
      if (audioUrl) {
        console.log(`🎙️ VOICE MESSAGE received from ${phone}. Transcribing...`);
        const { transcribeAudio } = require('../services/audioService');
        messageBody = await transcribeAudio(audioUrl);
        if (!messageBody) {
          console.error('❌ Transcription failed or returned empty.');
          return res.status(200).send('Voice processing failed');
        }
        console.log(`✅ TRANSCRIBED TEXT: "${messageBody}"`);
      }
    }
    // Text extraction (11za common fallbacks)
    else {
      messageBody =
        messageData.text?.body ||
        messageData.text ||
        payload.UserResponse ||
        payload.message ||
        payload.content?.text ||
        '';

      console.log(`💬 TEXT MESSAGE: "${messageBody}"`);
    }

    console.log(`📱 FROM: ${phone || 'UNKNOWN'}`);

    if (!phone || !messageBody) {
      console.log('⚠️  Could not extract phone/message — check payload structure above');
      console.log('═'.repeat(60) + '\n');
      return res.status(200).send('No valid message data found');
    }

    console.log('✅ Routing to botService...');
    console.log('═'.repeat(60) + '\n');

    // Pass senderName so templates show real user name instead of 'Customer'
    await handleIncomingMessage(phone, messageBody, senderName);

    // Respond to 11za
    res.status(200).send({ status: 'success' });

  } catch (err) {
    console.error('❌ WEBHOOK CRASH:', err);
    return res.status(500).send('Internal Server Error');
  }
}

module.exports = { receiveWebhook };
