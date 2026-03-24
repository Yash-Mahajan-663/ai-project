const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const dotenv = require('dotenv');
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Downloads audio from 11za URL and transcribes it using GROQ Whisper
 * @param {string} url - Audio file URL from 11za webhook
 * @returns {string} - Transcribed text
 */
async function transcribeAudio(url) {
  // Use /tmp for lambda compatibility (Vercel) or local temp dir
  const tempFilePath = path.join('/tmp', `audio_${Date.now()}.ogg`);
  
  // Ensure /tmp exists (Standard on Linux/Vercel, need check for Windows local dev)
  if (!fs.existsSync('/tmp') && process.platform === 'win32') {
    // Fallback for Windows local dev
    if (!fs.existsSync('./temp')) fs.mkdirSync('./temp');
    return await _doTranscribe(url, path.join('./temp', `audio_${Date.now()}.ogg`));
  }

  return await _doTranscribe(url, tempFilePath);
}

async function _doTranscribe(url, filePath) {
  try {
    console.log(`📥 [AUDIO] Downloading from: ${url}`);
    
    // 1. Download audio file
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      headers: {
        'Authorization': `Bearer ${process.env.ELEVENZA_AUTH_TOKEN}`
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`🎙️ [AUDIO] Transcribing file: ${filePath}`);

    // 2. Transcribe using GROQ Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-large-v3', 
      response_format: 'verbose_json',
    });

    console.log('✅ [AUDIO] Transcription SUCCESS:', transcription.text);
    return transcription.text;

  } catch (err) {
    console.error('❌ [AUDIO] Transcription Error:', err.message);
    return null;
  } finally {
    // 3. Clean up temp file
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch(e) {}
    }
  }
}

module.exports = { transcribeAudio };
