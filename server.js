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
    if (mongoose.connection.readyState >= 1) return;

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 10s
      socketTimeoutMS: 45000,
    });
    console.log('✅ Securely connected to MongoDB!');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }
};

// Call the connection
connectDB();

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/enrollments', require('./routes/enrollments'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/quizzes', require('./routes/quiz'));
app.use('/api/scores', require('./routes/score'));

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