const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  grade: { type: String, required: true },
  ageGroup: { type: String, default: '' },
  imageOnly: { type: Boolean, default: false },
  timeLimit: { type: Number, default: 0 }, // 0 means no limit
  questions: [
    {
      questionText: String,
      options: [String],
      correctAnswer: String,
      hint: String,
      explanation: String,
      image: String
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);