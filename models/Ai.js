const mongoose = require('mongoose');

const aiSchema = new mongoose.Schema({
  teacherId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true // Good practice to ensure every log is tied to a user
  },
  prompt: String,
  result: mongoose.Schema.Types.Mixed, // Perfect for dynamic JSON output
  
  // Optional: Track API cost metrics
  tokenUsage: {
    promptTokens: Number,
    completionTokens: Number,
    totalTokens: Number
  },

  status: { type: String, enum: ['success', 'error'], default: 'success' },
  errorMessage: String,
  createdAt: { type: Date, default: Date.now }
});

// --- PERFORMANCE ENHANCEMENTS ---

// 1. Compound Index: Speeds up queries like "Find all logs for Teacher X, ordered by newest"
aiSchema.index({ teacherId: 1, createdAt: -1 });

// 2. TTL Index: Automatically deletes documents 30 days (2592000 seconds) after creation
// Remove this if you want to keep logs forever!
aiSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Ai', aiSchema);