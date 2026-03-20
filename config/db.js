const mongoose = require('mongoose');

// Use a global variable to cache the database connection across serverless invocations
let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection) {
    console.log('🔄 Using existing MongoDB connection');
    return cachedConnection;
  }

  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ MONGODB_URI is missing in environment variables');
      return;
    }

    // Check if the URI has a database name (ends with / or lacks / after the cluster name)
    // A standard Atlas URI looks like: mongodb+srv://user:pass@cluster.mongodb.net/dbname?options
    const hasDBName = /\/[^/?]+(?:\?|$)/.test(mongoURI);
    if (!hasDBName) {
      console.warn('⚠️  MONGODB_URI might be missing a database name — defaulting to "11za-salon"');
    }

    console.log('🔌 Attempting MongoDB connection...');
    const opts = {
      bufferCommands: true,
      // Removed deprecated options for newer mongoose versions
    };

    const db = await mongoose.connect(mongoURI, opts);
    cachedConnection = db.connection;
    
    console.log('✅ MongoDB Connected Successfully to:', db.connection.name);
    return cachedConnection;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    // In serverless, we don't want to exit the process, we want the function to return an error or try again
  }
};

module.exports = connectDB;

