const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Core Auth
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['teacher', 'student'] },
  
  // Shared Profile Data
  fullName: { type: String },
  email: { type: String },
  phone: { type: String }, // Useful for WhatsApp/Contact
  district: { type: String }, // e.g., Galle, Kurunegala, Colombo
  
  // Teacher-Specific Data
  profilePic: { type: String, default: '' }, 
  subjects: { type: String }, 
  qualifications: { type: String }, // e.g., "BSc Engineering Undergraduate"
  
  // Student-Specific Data
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  grade: { type: String }, 
  schoolName: { type: String },
  parentContact: { type: String }
});

module.exports = mongoose.model('User', userSchema);