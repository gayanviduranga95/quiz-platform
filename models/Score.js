const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  
  // NEW: Store the exact answers the student picked!
  studentAnswers: { type: Object, required: true },
  
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Score', scoreSchema);