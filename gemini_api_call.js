// For Node.js environments
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function gemini_api_call(user_query) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(user_query);

    const text = result.response.text();
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Error: ${error.message}`;
  }
}

const result = await gemini_api_call("Hello Gemini!");
console.log(result);