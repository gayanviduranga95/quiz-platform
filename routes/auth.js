const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const User = require('../models/User');

// --- THESE TWO LINES FIX THE CRASH ---
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- 1. Fetch All Teachers ---
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('username _id profilePic');
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch teachers' });
  }
});

// --- 2. Upgraded Registration Route (Maximum Data Capture) ---
router.post('/register', upload.single('profilePic'), async (req, res) => {
  try {
    const { 
      username, password, role, fullName, email, phone, district, 
      subjects, qualifications, teacherId, grade, schoolName, parentContact 
    } = req.body;

    // Validate required fields
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, and role are required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePicBase64 = '';
    if (role === 'teacher' && req.file) {
      profilePicBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const newUser = new User({
      username,
      password: hashedPassword,
      role,
      fullName,
      email,
      phone,
      district,
      profilePic: profilePicBase64,
      subjects: role === 'teacher' ? subjects : undefined,
      qualifications: role === 'teacher' ? qualifications : undefined,
      grade: role === 'student' ? grade : undefined,
      schoolName: role === 'student' ? schoolName : undefined,
      parentContact: role === 'student' ? parentContact : undefined,
      teacherId: role === 'student' ? teacherId : undefined
    });

    await newUser.save();
    res.status(201).json({ message: 'Registration successful!', user: { id: newUser._id, role: newUser.role } });

  } catch (error) {
    console.error('Registration Error Details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// --- 3. Secure Login Route (Validates True Role) ---
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username }).lean();
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    return res.status(200).json({ 
      message: 'Login successful', 
      user: { 
        id: user._id, 
        username: user.username, 
        role: user.role
      } 
    });

  } catch (error) {
    console.error('❌ Login Error Details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    
    // Determine error type
    let statusCode = 500;
    let errorMessage = 'Server error during login';
    
    if (error.name === 'MongoNetworkError' || error.message.includes('connect')) {
      statusCode = 503;
      errorMessage = 'Database connection failed - IP whitelist may need update';
    } else if (error.name === 'MongoAuthenticationError') {
      statusCode = 500;
      errorMessage = 'Database authentication failed - check MONGO_URI credentials';
    } else if (error.name === 'MongoParseError') {
      statusCode = 500;
      errorMessage = 'Invalid database URI - check MONGO_URI in .env';
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// 3. Update User Profile
router.put('/profile/:id', async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const { fullName, subjects, district, qualifications } = req.body;
    
    // Find the user by ID and update their fields
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { fullName, subjects, district, qualifications },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ message: 'Profile updated successfully!', user: updatedUser });
  } catch (error) {
    console.error('Profile Update Error Details:', {
      message: error.message,
      stack: error.stack,
      userId: req.params.id
    });
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

module.exports = router;