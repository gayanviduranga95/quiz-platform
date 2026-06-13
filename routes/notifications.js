const express = require('express');
const Notification = require('../models/Notification');

const router = express.Router();

router.get('/student/:studentId', async (req, res) => {
  try {
    const notifications = await Notification.find({ studentId: req.params.studentId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

router.put('/:notificationId/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.notificationId,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notification' });
  }
});

router.put('/student/:studentId/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ studentId: req.params.studentId, read: false }, { read: true });
    res.status(200).json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
});

module.exports = router;