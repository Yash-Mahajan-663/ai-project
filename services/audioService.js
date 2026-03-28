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
        // 'Authorization': `Bearer ${process.env.ELEVENZA_AUTH_TOKEN}`,
        'User-Agent': 'Mozilla/5.0' // Some CDNs block default axios agent
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log("💾 File fully saved to disk.");
        resolve();
      });
      writer.on('error', (err) => {
        console.error("❌ File System Error:", err);
        reject(err);
      });
    });

    console.log(`🎙️ [AUDIO] Transcribing file: ${filePath}`);

    // CHECK: Kya file sach mein disk par hai aur size zero toh nahi?
    const stats = fs.statSync(filePath);
    console.log(`📏 File Size: ${stats.size} bytes`);

    if (stats.size === 0) {
      throw new Error("Downloaded file is empty (0 bytes). Check Auth Token!");
    }

    console.log(`🎙️ Sending to GROQ Whisper...`);

    // 2. Transcribe using GROQ Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: process.env.WHISPER_MODEL, 
      response_format: 'json'
    });

    console.log('✅ [AUDIO] Transcription SUCCESS:', transcription.text);
    return transcription.text;

  } catch (err) {
    if (err.response) {
      console.error(`❌ [AUDIO] HTTP Error ${err.response.status}:`, err.response.statusText);
      // Log response data if it's not a stream (Axios error response for stream might be tricky)
    } else {
      console.error('❌ [AUDIO] Error:', err.message);
    }
    return null;
  } finally {
    // 3. Clean up temp file
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch(e) {}
    }
  }
}

module.exports = { transcribeAudio };
