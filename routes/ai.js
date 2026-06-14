const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Ai = require('../models/Ai'); // Make sure this path points to your updated Mongoose schema

const router = express.Router();

// SECURITY UPGRADE: Limit uploads to 10MB to prevent memory exhaustion (DoS attacks)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } 
});

// Initialize Gemini
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ CRITICAL: GEMINI_API_KEY is not set in environment variables!');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');

// ==========================================
// 1. GENERATE QUIZ ROUTE
// ==========================================
router.post('/generate', upload.single('media'), async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'AI service is not configured (missing API key)' });
    }
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Grab requested question count or default to 5
    const numQuestions = req.body.numQuestions || 5;
    const ageGroup = req.body.ageGroup || '11-13';
    const imageOnly = req.body.imageOnly === 'true' || req.body.imageOnly === true;
    const isImage = req.file.mimetype.startsWith('image/');

    // Normalize mime type for Gemini
    let mimeType = req.file.mimetype;
    if (isImage) {
      if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
    } else if (mimeType.includes('pdf')) {
      mimeType = 'application/pdf';
    }

    // Convert the uploaded media directly into a format Gemini can read
    const mediaPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: mimeType
      }
    };

    const promptText = `You are an expert teacher creating a quiz for students aged ${ageGroup}. Based on the provided ${isImage ? 'image' : 'document'}, generate exactly ${numQuestions} multiple-choice questions.
    
    Return a JSON array of objects. Each object MUST have:
    "questionText": string,
    "options": array of 4 strings,
    "correctAnswer": string (must match one option exactly),
    "hint": string,
    "explanation": string.
    
    IMPORTANT: Return ONLY the valid JSON array. Do not include markdown code blocks, backticks, or conversational text.`;

    // FIX APPLIED: Using the active gemini-2.5-flash model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
    });
    
    console.log(`--- Calling Gemini API (File: ${req.file.originalname}, Size: ${req.file.size} bytes, Mime: ${mimeType}) ---`);
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [mediaPart, { text: promptText }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });

    const response = await result.response;
    const responseText = response.text();
    console.log('--- Raw AI Response Received ---');
    console.log(responseText.substring(0, 100) + '...'); 
    
    let questions;
    try {
      questions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON Parse Error, attempting fallback extraction:', parseError.message);
      // Robust fallback extraction: finds the first '[' and last ']'
      const startIdx = responseText.indexOf('[');
      const endIdx = responseText.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        questions = JSON.parse(responseText.substring(startIdx, endIdx + 1));
      } else {
        throw new Error('AI response was not valid JSON and could not be extracted.');
      }
    }
    
    // Send successful response to frontend
    res.status(200).json(questions);

    // Async logging to database (doesn't block the response)
    Ai.create({
      teacherId: req.body.teacherId || null,
      prompt: promptText,
      result: questions,
      status: 'success'
    }).catch(err => console.error('Database Logging Error:', err));

  } catch (error) {
    console.error('AI Generation Error:', error);

    // Async logging for error
    Ai.create({
      teacherId: req.body.teacherId || null,
      prompt: `Questions: ${req.body.numQuestions || 5}, Age: ${req.body.ageGroup || '11-13'}`,
      status: 'error',
      errorMessage: error.message
    }).catch(err => console.error('Database Logging Error:', err));

    res.status(500).json({ 
      message: 'Failed to generate questions', 
      error: error.message,
      details: 'Check if the file content is readable by AI.'
    });
  }
});

// ==========================================
// 2. EXPLAIN ANSWER ROUTE (Explain like I'm 5)
// ==========================================
router.post('/explain', async (req, res) => {
  try {
    const { question, answer, context } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ message: 'Missing question or answer' });
    }

    // FIX APPLIED: Using the active gemini-2.5-flash model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `You are a friendly teacher. Explain the following concept to a child. 
    Question: "${question}"
    Correct Answer: "${answer}"
    ${context ? `Additional Context: "${context}"` : ''}
    Keep it very simple, fun, and use an analogy if possible. Maximum 2-3 sentences.`;

    const result = await model.generateContent(prompt);
    const explanation = result.response.text().trim();
    
    res.status(200).json({ explanation });
  } catch (error) {
    console.error('AI Explanation Error:', error);
    res.status(500).json({ message: 'Failed to generate simplified explanation' });
  }
});

module.exports = router;