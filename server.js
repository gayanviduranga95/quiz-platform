const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Debug: Show environment variables
console.log('🔍 Environment Variables Check:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   MONGO_URI set:', !!process.env.MONGO_URI);
if (process.env.MONGO_URI) {
  const uri = process.env.MONGO_URI;
  const maskedUri = uri.replace(/:[^:]*@/, ':****@'); // Hide password
  console.log('   MONGO_URI:', maskedUri);
}
console.log('   PORT:', process.env.PORT || 5000);
console.log('');

// ==========================================
// MIDDLEWARE
// ==========================================
const corsOptions = {
  origin: 'https://smartquiz-frontend.vercel.app', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// ==========================================
// DATABASE CONNECTION (Vercel-Optimized)
// ==========================================
const connectDB = async () => {
  try {
    // Check if already connected to prevent multiple connection attempts
    if (mongoose.connection.readyState >= 1) {
      console.log('✅ Already connected to MongoDB!');
      return;
    }

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not set');
    }

    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 75000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true,
      maxPoolSize: 10,
      minPoolSize: 2,
      bufferCommands: false,
      autoCreate: true,
    });
    console.log('✅ Securely connected to MongoDB!');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    
    // Provide specific guidance based on error
    if (err.message.includes('getaddrinfo') || err.message.includes('ENOTFOUND')) {
      console.error('💡 Network error - check internet connection');
    } else if (err.message.includes('could not connect') || err.message.includes('IP')) {
      console.error('💡 IP Whitelist Issue:');
      console.error('   1. Go to: https://cloud.mongodb.com/');
      console.error('   2. Click: Network Access → Add IP Address');
      console.error('   3. Enter: 0.0.0.0/0 (for development)');
      console.error('   4. Wait 1-2 minutes and restart server');
    } else if (err.message.includes('authentication')) {
      console.error('💡 Authentication Error - check MONGO_URI credentials in .env');
    } else if (err.message.includes('MONGO_URI')) {
      console.error('💡 MONGO_URI not set - make sure .env file exists and has MONGO_URI=...');
    }
    
    console.error('⚠️  Retrying connection...\n');
  }
};

// Call the connection with retry logic
const connectWithRetry = async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      await connectDB();
      break;
    } catch (err) {
      retries--;
      if (retries > 0) {
        console.log(`Retrying connection... (${retries} attempts left)`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
};

connectWithRetry();

// Health check endpoint to verify server is working
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState >= 1 ? 'connected' : 'disconnected';
  res.status(200).json({ 
    status: 'ok', 
    database: dbStatus,
    timestamp: new Date().toISOString(),
    message: dbStatus === 'disconnected' ? 'Database not connected - check MongoDB Atlas IP whitelist' : 'All systems operational'
  });
});

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/enrollments', require('./routes/enrollments'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/quizzes', require('./routes/quiz'));
app.use('/api/scores', require('./routes/score'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 5000;

// Vercel serverless functions handle the listening automatically,
// but keeping this for local development:
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;