const express = require('express');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const { createNotificationForStudent } = require('../utils/pushNotifications');

const router = express.Router();

// 1. Student Requests Access to a Teacher's Grade
router.post('/request', async (req, res) => {
  try {
    const { studentId, teacherId, grade } = req.body;

    // Check if a request already exists to prevent spam
    const existing = await Enrollment.findOne({ studentId, teacherId, grade });
    if (existing) {
      if (existing.status === 'declined') {
        await Enrollment.deleteOne({ _id: existing._id });
      } else {
        return res.status(400).json({ message: `You already have a ${existing.status} request for this class.` });
      }
    }

    const newEnrollment = new Enrollment({ studentId, teacherId, grade });
    await newEnrollment.save();
    
    res.status(201).json({ message: 'Access request sent to the teacher!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error requesting access' });
  }
});

// 2. Fetch all teachers for the Student Storefront
router.get('/available-teachers', async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('username fullName profilePic subjects qualifications district');
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch teachers' });
  }
});

// 3. Get Student's current requests (so we can show "Pending" on their screen)
router.get('/my-requests/:studentId', async (req, res) => {
  try {
    const requests = await Enrollment.find({ studentId: req.params.studentId }).populate('teacherId', 'username fullName');
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
});
// 4. Fetch all enrollment requests for a specific Teacher
router.get('/teacher-requests/:teacherId', async (req, res) => {
  try {
    // We populate the studentId so the teacher can see the student's real name and school!
    const requests = await Enrollment.find({ teacherId: req.params.teacherId })
      .populate('studentId', 'fullName username schoolName grade parentContact');
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch student requests' });
  }
});

// 5. Approve a student's request
router.put('/approve/:enrollmentId', async (req, res) => {
  try {
    const updated = await Enrollment.findByIdAndUpdate(
      req.params.enrollmentId, 
      { status: 'approved' }, 
      { new: true } // Returns the updated document
    );

    if (updated) {
      await createNotificationForStudent({
        studentId: updated.studentId,
        title: 'Enrollment approved',
        message: `You can now access ${updated.grade} classes.`,
        type: 'enrollment-approved',
        link: ''
      });
    }

    res.status(200).json({ message: 'Student successfully approved!', enrollment: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve student' });
  }
});

// 6. Decline a student's request
router.put('/decline/:enrollmentId', async (req, res) => {
  try {
    const updated = await Enrollment.findByIdAndUpdate(
      req.params.enrollmentId,
      { status: 'declined' },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Request not found' });
    }

    await createNotificationForStudent({
      studentId: updated.studentId,
      title: 'Enrollment declined',
      message: `Your request for ${updated.grade} was declined. You can request again later.`,
      type: 'enrollment-declined',
      link: ''
    });

    res.status(200).json({ message: 'Student request declined.', enrollment: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to decline student request' });
  }
});

module.exports = router;