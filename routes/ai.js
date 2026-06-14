const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Ai = require('../models/Ai');

const router = express.Router();
// Save the file in temporary memory, avoiding Vercel's read-only hard drive
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini (Ensure your .env file has GEMINI_API_KEY)
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ CRITICAL: GEMINI_API_KEY is not set in environment variables!');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');

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
    
    IMPORTANT: Return ONLY the JSON array. Do not include markdown code blocks or text.`;

    // Using Gemini 2.5 Flash with optimized settings
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
    console.log(responseText.substring(0, 100) + '...'); // Log start of response for safety
    
    let questions;
    try {
      questions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError.message);
      // Robust fallback extraction
      const startIdx = responseText.indexOf('[');
      const endIdx = responseText.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        questions = JSON.parse(responseText.substring(startIdx, endIdx + 1));
      } else {
        throw new Error('AI response was not valid JSON and could not be extracted.');
      }
    }
    
    res.status(200).json(questions);

    // Async logging
    Ai.create({
      teacherId: req.body.teacherId,
      prompt: promptText,
      result: questions,
      status: 'success'
    }).catch(err => console.error('AI Log Error:', err));

  } catch (error) {
    console.error('AI Generation Error:', error);

    // Async logging for error
    Ai.create({
      teacherId: req.body.teacherId,
      prompt: `Questions: ${req.body.numQuestions || 5}, Age: ${req.body.ageGroup || '11-13'}`,
      status: 'error',
      errorMessage: error.message
    }).catch(err => console.error('AI Log Error:', err));

    res.status(500).json({ 
      message: 'Failed to generate questions', 
      error: error.message,
      details: 'Check if the API key is valid and the file content is readable by AI.'
    });
  }
});

// New route for AI Explanation (Explain like I'm 5)
router.post('/explain', async (req, res) => {
  try {
    const { question, answer, context } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ message: 'Missing question or answer' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `You are a friendly teacher. Explain the following concept to a 5-year-old child. 
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