require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const { receiveWebhook } = require('./controllers/webhookController');
const { initScheduler } = require('./cron/scheduler');
const adminController = require('./controllers/adminController');

const app = express();

// Middleware
app.use(express.json());

// Connect to Database (fire-and-forget for local dev; middleware below handles serverless)
connectDB();

// Health check for monitoring
app.get('/health', (req, res) => res.status(200).json({ status: 'UP', timestamp: new Date() }));

// Ensure DB is connected before handling admin/API requests (critical for Vercel serverless cold starts)
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ success: false, message: 'Database connection failed' });
  }
});

// Admin API Routes
app.get('/api/admin/stats', adminController.getStats);
app.get('/api/admin/bookings', adminController.getBookings);
app.get('/api/admin/clients', adminController.getClients);
app.get('/api/admin/revenue', adminController.getRevenueData);
app.get('/api/admin/inquiries', adminController.getInquiries);

// Main webhook route for 11za WhatsApp API (also needs DB)
app.post('/webhook', async (req, res, next) => {
  try { await connectDB(); next(); } catch (err) { res.status(503).json({ error: 'DB unavailable' }); }
}, receiveWebhook);

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
