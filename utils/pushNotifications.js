const webpush = require('web-push');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');

const publicKey = process.env.WEB_PUSH_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
const privateKey = process.env.WEB_PUSH_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY || '';
const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:support@smartquiz.app';

let webPushConfigured = false;

const isPushEnabled = () => Boolean(publicKey && privateKey);

const configureWebPush = () => {
  if (webPushConfigured || !isPushEnabled()) {
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  webPushConfigured = true;
};

const sendPushToStudent = async (studentId, payload) => {
  if (!isPushEnabled()) {
    return;
  }

  configureWebPush();

  const subscriptions = await PushSubscription.find({ studentId });
  if (subscriptions.length === 0) {
    return;
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.message,
    url: payload.url || `/student?studentId=${studentId}`,
    type: payload.type || 'info',
    notificationId: payload.notificationId || ''
  });

  await Promise.allSettled(subscriptions.map(async (subscription) => {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      expirationTime: subscription.expirationTime
    };

    try {
      await webpush.sendNotification(pushSubscription, message);
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: subscription._id });
      }
    }
  }));
};

const createNotificationForStudent = async ({ studentId, title, message, type = 'info', link = '' }) => {
  const notification = await Notification.create({
    studentId,
    title,
    message,
    type,
    link
  });

  await sendPushToStudent(studentId, {
    title,
    message,
    type,
    notificationId: String(notification._id),
    url: `/student?studentId=${studentId}`
  });

  return notification;
};

module.exports = {
  isPushEnabled,
  getPushConfig: () => ({
    enabled: isPushEnabled(),
    publicKey
  }),
  createNotificationForStudent,
  sendPushToStudent
};