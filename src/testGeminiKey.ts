import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function testKey() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  console.log('Testing GEMINI_API_KEY:', apiKey.slice(0, 10) + '...');
  const genAI = new GoogleGenerativeAI(apiKey);

  const modelsToTry = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.5-flash',
    'gemini-3.8-flash',
  ];

  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const res = await model.generateContent('Hello!');
      console.log(`✅ SUCCESS with model ${modelName}:`, res.response.text());
    } catch (err: any) {
      console.log(`❌ FAILED with model ${modelName}:`, err.message.slice(0, 120));
    }
  }
}

testKey();
