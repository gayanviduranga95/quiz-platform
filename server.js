const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

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

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
      socketTimeoutMS: 45000,
    });
    console.log('✅ Securely connected to MongoDB!');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    // Continue running even if DB fails initially - useful for serverless
  }
};

// Call the connection
connectDB();

// Health check endpoint to verify server is working
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState >= 1 ? 'connected' : 'disconnected';
  res.status(200).json({ 
    status: 'ok', 
    database: dbStatus,
    timestamp: new Date().toISOString()
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