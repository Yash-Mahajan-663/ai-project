require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const { receiveWebhook } = require('./controllers/webhookController');
const { initScheduler } = require('./cron/scheduler');

const app = express();

// Middleware
app.use(express.json());

// Health check for monitoring
app.get('/health', (req, res) => res.status(200).json({ status: 'UP', timestamp: new Date() }));

// Main webhook route for 11za WhatsApp API
app.post('/webhook', receiveWebhook);

// Initialize Database on startup
connectDB()
  .then(() => {
    // Note: node-cron will NOT reliably run in Serverless environments (Vercel)
    // but we still initialize it in case you run it locally or in a persistent container.
    initScheduler();
  })
  .catch(err => {
    console.error('❌ FATAL: Database initialization failed:', err.message);
  });

// Export the app for Vercel serverless deployment
module.exports = app;

// Handle local dev start
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on port ${PORT}`);
  });
}

