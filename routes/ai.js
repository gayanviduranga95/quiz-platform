const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
// Save the file in temporary memory, avoiding Vercel's read-only hard drive
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini (Ensure your .env file has GEMINI_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/generate', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Grab requested question count or default to 5
    const numQuestions = req.body.numQuestions || 5;
    
    // Convert the uploaded PDF buffer directly into a format Gemini can read
    const pdfPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: "application/pdf"
      }
    };

    const promptText = `You are an expert teacher. Based on the attached PDF document, generate exactly ${numQuestions} multiple-choice questions. 
    Return ONLY a JSON array of objects with the exact keys: "questionText", "options" (array of 4 strings), and "correctAnswer" (must match one option exactly).`;

    // Using Gemini 2.5 Flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Send BOTH the text prompt and the PDF file directly to Gemini
    const result = await model.generateContent([promptText, pdfPart]);
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