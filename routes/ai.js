const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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

    // Convert the uploaded media directly into a format Gemini can read
    const mediaPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype || (isImage ? 'image/png' : 'application/pdf')
      }
    };

    const promptText = `You are an expert teacher creating a quiz for students aged ${ageGroup}. Based on the attached ${isImage ? 'image' : 'document'}, generate exactly ${numQuestions} multiple-choice questions.
    Keep the language, examples, and difficulty appropriate for this age group.
    ${imageOnly ? 'Make the quiz image-led: keep questionText very short or empty when the image itself is the main prompt.' : 'Use clear question text as the main prompt.'}
    
    Return a JSON array of objects. Each object MUST have:
    "questionText": string,
    "options": array of 4 strings,
    "correctAnswer": string (must match one option exactly),
    "hint": string,
    "explanation": string.`;

    // Using Gemini 1.5 Flash with JSON output mode
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    
    console.log('--- Calling Gemini API (JSON Mode) ---');
    const result = await model.generateContent([promptText, mediaPart]);
    const responseText = result.response.text();
    console.log('--- Raw AI Response ---');
    console.log(responseText);
    
    let questions;
    try {
      questions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON Parse Error, attempting fallback extraction:', parseError);
      // Fallback extraction
      const startIdx = responseText.indexOf('[');
      const endIdx = responseText.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        questions = JSON.parse(responseText.substring(startIdx, endIdx + 1));
      } else {
        throw new Error('AI response could not be parsed as JSON');
      }
    }
    
    res.status(200).json(questions);

  } catch (error) {
    console.error('AI Generation Error:', error);
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

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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