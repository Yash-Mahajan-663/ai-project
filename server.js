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

// Start Database
connectDB().then(() => {
  // Init node-cron
  initScheduler();

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.log('Failed to start server:', err.message);
});
