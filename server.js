const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================
// Allows your React frontend (usually port 5173 or 3000) to talk to this backend
app.use(cors()); 
app.use('/api/admin', require('./routes/admin'));

// Allows Express to understand JSON data sent in requests
app.use(express.json()); 

// Allows Express to understand URL-encoded data
app.use(express.urlencoded({ extended: true }));

// ==========================================
// DATABASE CONNECTION
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Securely connected to MongoDB!'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:');
    console.error(err);
  });

// ==========================================
// API ROUTES
// ==========================================
// Authentication & User Profiles
app.use('/api/auth', require('./routes/auth'));

// Student/Teacher Class Enrollments
app.use('/api/enrollments', require('./routes/enrollments'));

// AI Quiz Generation (Ensure your AI file is named ai.js)
app.use('/api/ai', require('./routes/ai'));

// Saving & Fetching Quizzes (Pointed exactly to your 'quiz.js' file!)
app.use('/api/quizzes', require('./routes/quiz'));

// Add this line so the server knows how to handle the grades!
app.use('/api/scores', require('./routes/score'));
// ==========================================
// SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
module.exports = app;