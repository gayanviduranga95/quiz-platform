const express = require('express');
const Score = require('../models/Score');
const Quiz = require('../models/Quiz');

const router = express.Router();

// 1. Save a student's quiz score (With 1-attempt limit)
router.post('/submit', async (req, res) => {
  try {
    const { studentId, quizId, score, totalQuestions, studentAnswers } = req.body;

    // CHECK: Did they already take this?
    const existingScore = await Score.findOne({ studentId, quizId });
    if (existingScore) {
      return res.status(400).json({ message: 'You have already taken this quiz!' });
    }

    const newScore = new Score({
      studentId, quizId, score, totalQuestions, studentAnswers
    });

    await newScore.save();
    res.status(201).json({ message: 'Score saved successfully!', data: newScore });

  } catch (error) {
    res.status(500).json({ message: 'Server error while saving the score' });
  }
});

// 2. Fetch all scores for a SPECIFIC STUDENT (Used for Total Score & Review)
router.get('/student/:studentId', async (req, res) => {
  try {
    // We populate the quiz data so they can see the original questions in Review Mode
    const scores = await Score.find({ studentId: req.params.studentId })
      .populate('quizId'); 
    res.status(200).json(scores);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your scores' });
  }
});

// 3. Fetch all student scores for a specific teacher (Used by Teacher Dashboard)
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const teacherQuizzes = await Quiz.find({ teacherId: req.params.teacherId }).select('_id');
    const quizIds = teacherQuizzes.map(q => q._id);

    const scores = await Score.find({ quizId: { $in: quizIds } })
      .populate('studentId', 'fullName username schoolName')
      .populate('quizId', 'title grade')
      .sort({ submittedAt: -1 });

    res.status(200).json(scores);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch student scores' });
  }
});

module.exports = router;