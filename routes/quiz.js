const express = require('express');
const Quiz = require('../models/Quiz');
const Enrollment = require('../models/Enrollment');
const { createNotificationForStudent } = require('../utils/pushNotifications');
const router = express.Router();

// 1. Save a new quiz
router.post('/save', async (req, res) => {
  try {
    const { title, teacherId, grade, ageGroup, imageOnly, timeLimit, questions } = req.body;
    
    if (!title || !teacherId || !questions || questions.length === 0) {
      return res.status(400).json({ message: 'Missing required quiz data' });
    }

    const newQuiz = new Quiz({ title, teacherId, grade, ageGroup, imageOnly, timeLimit, questions });
    await newQuiz.save();

    // Notify students (non-blocking / error-resilient)
    try {
      const approvedEnrollments = await Enrollment.find({ teacherId, grade, status: 'approved' }).select('studentId');
      if (approvedEnrollments.length > 0) {
        // We use allSettled or just a simple map without await to keep it non-blocking for the teacher
        Promise.allSettled(
          approvedEnrollments.map((enrollment) => createNotificationForStudent({
            studentId: enrollment.studentId,
            title: 'New quiz available',
            message: `${title} is now available for ${grade}.`,
            type: 'quiz-published',
            link: String(newQuiz._id)
          }))
        ).catch(err => console.error('Notification Batch Error:', err));
      }
    } catch (notifError) {
      console.error('Error fetching enrollments for notification:', notifError);
      // We don't fail the request here because the quiz is already saved
    }

    res.status(201).json({ message: 'Quiz saved successfully!', quiz: newQuiz });
  } catch (error) {
    console.error('Quiz Save Error:', error);
    res.status(500).json({ message: 'Failed to save quiz', error: error.message });
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
    const { title, grade, ageGroup, imageOnly, timeLimit, questions } = req.body;
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { title, grade, ageGroup, imageOnly, timeLimit, questions },
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