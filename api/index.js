require('dotenv').config();
const path = require('path');
const express = require('express');
const connectDB = require('../config/db');
const { receiveWebhook } = require('../controllers/webhookController');
const { initScheduler } = require('../cron/scheduler');

const app = express();

// Middleware
app.use(express.json());

// Simple CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Connect to Database
connectDB();

// Health check for monitoring
app.get('/health', (req, res) => res.status(200).json({ status: 'UP', timestamp: new Date() }));

// Admin API Routes
const adminController = require('../controllers/adminController');
app.get('/api/admin/stats', adminController.getDashboardStats);
app.get('/api/admin/bookings', adminController.getAllBookings);

// Main webhook route for 11za WhatsApp API
app.post('/webhook', receiveWebhook);

// Init background scheduler
initScheduler();

// Export the app for Vercel serverless deployment
module.exports = app;

// Handle local dev start
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on port ${PORT}`);
  });
}
