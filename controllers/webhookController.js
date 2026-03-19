const { handleIncomingMessage } = require('../services/botService');

/**
 * Handles incoming WhatsApp Webhooks from 11za
 */
async function receiveWebhook(req, res) {
  try {
    const payload = req.body;

    // ── RAW PAYLOAD LOG — Dekho 11za exactly kya bhej raha hai ──
    console.log('\n' + '═'.repeat(60));
    console.log('📥 WEBHOOK RECEIVED —', new Date().toLocaleTimeString('en-IN'));
    console.log('─'.repeat(60));
    console.log(JSON.stringify(payload, null, 2));
    console.log('─'.repeat(60));

    // ── Phone Number Extract ──
    const phone = payload.phone || payload.from || (payload.messages && payload.messages[0]?.from);

    // ── Message Body Extract ──
    let messageBody = '';
    const messageData = payload.messages ? payload.messages[0] : payload;

    if (messageData?.type === 'interactive') {
      const interactive = messageData.interactive;
      if (interactive.type === 'button_reply') {
        messageBody = interactive.button_reply.id || interactive.button_reply.title;
        console.log(`🔘 BUTTON REPLY: "${messageBody}"`);
      } else if (interactive.type === 'list_reply') {
        messageBody = interactive.list_reply.id || interactive.list_reply.title;
        console.log(`📋 LIST REPLY: "${messageBody}"`);
      }
    } else if (messageData?.type === 'text' || messageData?.text) {
      messageBody = messageData.text?.body || messageData.text || payload.message || '';
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

    // Respond to 11za immediately (200 OK), process in background
    res.status(200).send({ status: 'success' });

    // Handle asynchronously
    handleIncomingMessage(phone, messageBody).catch(e => {
      console.error(`❌ Error handling message from ${phone}:`, e.message);
    });

  } catch (err) {
    console.error('❌ WEBHOOK CRASH:', err);
    return res.status(500).send('Internal Server Error');
  }
}

module.exports = { receiveWebhook };
