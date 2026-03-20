const mongoose = require('mongoose');

// Cache a promise so concurrent invocations don't create multiple connections (race condition fix)
let connectionPromise = null;

const connectDB = async () => {
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    console.log('🔄 Reusing existing MongoDB connection');
    return mongoose.connection;
  }

  // If a connection attempt is already in-flight, wait for it (not a new one)
  if (connectionPromise) {
    console.log('⏳ Waiting for in-progress connection...');
    return connectionPromise;
  }

  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('❌ MONGODB_URI env var is NOT set — check Vercel Environment Variables');
    return null;
  }

  // Log a safe partial URI to confirm the env var is loaded
  const safeURI = mongoURI.replace(/:([^@]+)@/, ':****@');
  console.log('🔌 Connecting to MongoDB:', safeURI);

  connectionPromise = mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 8000,   // Fail fast — show error in 8s instead of hanging forever
    socketTimeoutMS: 45000,
    connectTimeoutMS: 8000,
    bufferCommands: false,            // Don't buffer — fail immediately if not connected
  })
    .then((db) => {
      console.log('✅ MongoDB Connected! DB Name:', db.connection.name);
      connectionPromise = null; // Reset for future reconnects
      return db.connection;
    })
    .catch((err) => {
      console.error('❌ MongoDB Connection FAILED:', err.message);
      connectionPromise = null; // Allow retry on next request
      return null;
    });

  return connectionPromise;
};

module.exports = connectDB;

