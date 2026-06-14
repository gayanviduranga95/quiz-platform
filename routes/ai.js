const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
// Save the file in temporary memory, avoiding Vercel's read-only hard drive
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini (Ensure your .env file has GEMINI_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/generate', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Grab requested question count or default to 5
    const numQuestions = req.body.numQuestions || 5;
    const ageGroup = req.body.ageGroup || '11-13';
    const imageOnly = req.body.imageOnly === 'true' || req.body.imageOnly === true;
    const isImage = req.file.mimetype.startsWith('image/');

    // Convert the uploaded media directly into a format Gemini can read
    const mediaPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype || (isImage ? 'image/png' : 'application/pdf')
      }
    };

    const promptText = `You are an expert teacher creating a quiz for students aged ${ageGroup}. Based on the attached ${isImage ? 'image' : 'document'}, generate exactly ${numQuestions} multiple-choice questions.
    Keep the language, examples, and difficulty appropriate for this age group. Make the quiz feel engaging and student-friendly, not dry or overly academic.
    ${imageOnly ? 'Make the quiz image-led: keep questionText very short or empty when the image itself is the main prompt.' : 'Use clear question text as the main prompt.'}
    Return ONLY valid JSON, with an array of objects using the exact keys: "questionText", "options" (array of 4 strings), "correctAnswer" (must match one option exactly), "hint" (short clue), and "explanation" (one short sentence explaining the answer).`;

    // Using Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Send BOTH the text prompt and the PDF file directly to Gemini
    const result = await model.generateContent([promptText, mediaPart]);
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