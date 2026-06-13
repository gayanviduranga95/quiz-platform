const express = require('express');
const PushSubscription = require('../models/PushSubscription');
const { getPushConfig } = require('../utils/pushNotifications');

const router = express.Router();

router.get('/config', (_req, res) => {
  res.status(200).json(getPushConfig());
});

router.post('/subscribe', async (req, res) => {
  try {
    const { studentId, subscription } = req.body;

    if (!studentId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ message: 'Missing push subscription data' });
    }

    const saved = await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        studentId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        expirationTime: subscription.expirationTime || null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: 'Push subscription saved', subscription: saved });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save push subscription' });
  }
});

router.delete('/subscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ message: 'Missing subscription endpoint' });
    }

    await PushSubscription.deleteOne({ endpoint });
    res.status(200).json({ message: 'Push subscription removed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove push subscription' });
  }
});

module.exports = router;