require('dotenv').config();

async function checkModels() {
  console.log("🔍 Asking Google what models you have access to...");
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    const modelNames = data.models.map(m => m.name.replace('models/', ''));
    console.log("✅ YOUR AVAILABLE MODELS:");
    console.log(modelNames.filter(name => name.includes('gemini')));
  } catch (error) {
    console.error("❌ Failed to fetch models:", error);
  }
}

checkModels();