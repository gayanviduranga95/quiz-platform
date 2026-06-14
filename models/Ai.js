const mongoose = require('mongoose');

const aiSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  prompt: String,
  result: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['success', 'error'], default: 'success' },
  errorMessage: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ai', aiSchema);
