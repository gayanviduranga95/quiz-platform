require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API...\n');
  
  try {
    console.log('📌 API Key loaded:', process.env.GEMINI_API_KEY ? '✅ Yes' : '❌ No');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('🤖 GoogleGenerativeAI initialized');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
    console.log('📦 Model loaded: gemini-1.0-pro');
    
    console.log('📤 Sending test prompt to Gemini...');
    const result = await model.generateContent('What is 2 + 2? Answer in one word only.');
    
    const response = result.response.text();
    console.log('\n✅ GEMINI API IS WORKING!\n');
    console.log('Response:', response);
    console.log('\n✨ API Test Successful!');
    
  } catch (error) {
    console.error('\n❌ GEMINI API ERROR:\n');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error('\nTroubleshooting:');
    console.error('1. Check if API key is valid');
    console.error('2. Check if API key has quota remaining');
    console.error('3. Check internet connection');
    console.error('4. Check if Gemini API service is available');
  }
}

testGeminiAPI();
