// For Node.js environments
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function gemini_api_call(user_query, conversationHistory = []) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 8192,  // Increased token limit for complex responses
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });
    // Start a chat session with the conversation history
    const chat = model.startChat({
      history: conversationHistory,
    });

    console.log("📨 Sending message to Gemini...");
    
    // Send the current message with timeout handling
    const result = await Promise.race([
      chat.sendMessage(user_query),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      )
    ]);

    // Check if response was blocked
    if (!result.response) {
      throw new Error('No response from Gemini API');
    }

    // Get the text response
    const text = result.response.text();
    
    if (!text || text.trim() === '') {
      console.warn('⚠️ Empty response from Gemini');
      return "I apologize, but I couldn't generate a response. Could you try rephrasing your question?";
    }

    console.log("✅ Gemini response received");
    return text;

  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    
    // Provide more specific error messages
    if (error.message.includes('timeout')) {
      return "The request took too long to process. Please try a simpler question or try again.";
    } else if (error.message.includes('quota')) {
      return "API quota exceeded. Please try again later.";
    } else if (error.message.includes('API key')) {
      return "API key error. Please check your configuration.";
    } else if (error.message.includes('overloaded')) {
      return "The service is currently overloaded. Please try again in a moment.";
    } else if (error.message.includes('blocked')) {
      return "The response was blocked due to safety filters. Please try rephrasing your question.";
    }
    
    return `I encountered an error: ${error.message}. Please try again.`;
  }
}

// Test code (you can remove this in production)
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await gemini_api_call("Hello Gemini!");
  console.log(result);
}