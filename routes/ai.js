const express = require('express');
const multer = require('multer');

const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini (Ensure your .env file has GEMINI_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/generate', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Grab requested question count or default to 5
    const numQuestions = req.body.numQuestions || 5;
    
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text;

    const prompt = `You are an expert teacher. Based on the following text, generate exactly ${numQuestions} multiple-choice questions. 
    Return ONLY a JSON array of objects with the exact keys: "questionText", "options" (array of 4 strings), and "correctAnswer" (must match one option exactly).
    
    Text: ${text}`;

    // Using standard Gemini 1.5 Flash or Pro
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    // Clean formatting if Gemini wraps in markdown
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const questions = JSON.parse(responseText);
    res.status(200).json(questions);

  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ message: 'Failed to generate questions' });
  }
});

module.exports = router;