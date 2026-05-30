const express = require('express');
const Quiz = require('../models/Quiz');
const router = express.Router();

// 1. Save a new quiz
router.post('/save', async (req, res) => {
  try {
    const { title, teacherId, grade, timeLimit, questions } = req.body;
    const newQuiz = new Quiz({ title, teacherId, grade, timeLimit, questions });
    await newQuiz.save();
    res.status(201).json({ message: 'Quiz saved successfully!', quiz: newQuiz });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save quiz' });
  }
});

// 2. Fetch quizzes for a specific grade & teacher (For Students)
router.get('/class', async (req, res) => {
  try {
    const { teacherId, grade } = req.query;
    const quizzes = await Quiz.find({ teacherId, grade }).sort({ createdAt: -1 });
    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
});

// 3. Fetch ALL quizzes for a specific Teacher (For Teacher Dashboard)
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ teacherId: req.params.teacherId }).sort({ createdAt: -1 });
    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your quizzes' });
  }
});

// 4. Update/Edit an existing Quiz
router.put('/:id', async (req, res) => {
  try {
    const { title, grade, timeLimit, questions } = req.body;
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { title, grade, timeLimit, questions },
      { new: true }
    );
    res.status(200).json({ message: 'Quiz updated successfully!', quiz: updatedQuiz });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update quiz' });
  }
});

// 5. Delete a Quiz
router.delete('/:id', async (req, res) => {
  try {
    await Quiz.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Quiz deleted successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete quiz' });
  }
});

module.exports = router;