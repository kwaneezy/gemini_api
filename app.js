import express from 'express';
import { gemini_api_call } from './gemini_api_call.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Directory to store conversation histories
const HISTORY_DIR = path.join(__dirname, 'conversation_histories');

// Ensure the history directory exists
async function ensureHistoryDir() {
  try {
    await fs.mkdir(HISTORY_DIR, { recursive: true });
    console.log('📁 History directory ready');
  } catch (error) {
    console.error('Error creating history directory:', error);
  }
}
ensureHistoryDir();

// Increase payload limit for longer conversations
app.use(express.json({ limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gemini route - now accepts conversation history
app.post('/gemini', async (req, res) => {
  console.log('\n🔷 New Gemini Request');
  
  try {
    const { userQuery, conversationHistory } = req.body;
    
    // Log request details
    console.log("📝 User query:", userQuery?.substring(0, 100) + (userQuery?.length > 100 ? '...' : ''));
    console.log("📚 History length:", conversationHistory?.length || 0);

    if (!userQuery || userQuery.trim() === '') {
      console.warn("⚠️ Empty query provided");
      return res.status(400).send('Please provide a valid question');
    }

    // Validate conversation history format
    const validHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
    
    // Limit history to last 20 messages to prevent token overflow
    const recentHistory = validHistory.slice(-20);
    
    console.log("⏳ Calling Gemini API...");
    const startTime = Date.now();
    
    // Pass both the query and the conversation history to Gemini
    const geminiResponse = await gemini_api_call(userQuery, recentHistory);
    
    const endTime = Date.now();
    console.log(`✅ Response received in ${endTime - startTime}ms`);
    console.log("📤 Response length:", geminiResponse?.length || 0, "characters");
    
    if (!geminiResponse || geminiResponse.trim() === '') {
      console.error("❌ Empty response from Gemini");
      return res.status(500).send('Received empty response from AI. Please try again.');
    }
    
    res.send(geminiResponse);

  } catch (error) {
    console.error("🔥 Server Error in /gemini route:");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    
    // Send a user-friendly error message
    const errorMessage = error?.message || 'An unexpected error occurred';
    res.status(500).send(`Error: ${errorMessage}`);
  }
});

// Save conversation history for a user
app.post('/save-history', async (req, res) => {
  try {
    const { userId, history } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    if (!Array.isArray(history)) {
      return res.status(400).json({ error: 'History must be an array' });
    }

    // Save to a JSON file named after the user's ID
    const filePath = path.join(HISTORY_DIR, `${userId}.json`);
    await fs.writeFile(filePath, JSON.stringify({ 
      userId, 
      history, 
      lastUpdated: new Date().toISOString(),
      messageCount: history.length
    }, null, 2));

    console.log(`💾 Saved ${history.length} messages for user: ${userId.substring(0, 10)}...`);
    res.json({ success: true, message: 'History saved', messageCount: history.length });

  } catch (error) {
    console.error('❌ Error saving history:', error);
    res.status(500).json({ error: 'Failed to save history', details: error.message });
  }
});

// Load conversation history for a user
app.post('/load-history', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const filePath = path.join(HISTORY_DIR, `${userId}.json`);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      console.log(`📖 Loaded ${parsed.history?.length || 0} messages for user: ${userId.substring(0, 10)}...`);
      res.json({ 
        history: parsed.history || [], 
        lastUpdated: parsed.lastUpdated,
        messageCount: parsed.messageCount || 0
      });
    } catch (error) {
      // File doesn't exist - return empty history
      if (error.code === 'ENOENT') {
        console.log(`📭 No existing history for user: ${userId.substring(0, 10)}...`);
        res.json({ history: [], messageCount: 0 });
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('❌ Error loading history:', error);
    res.status(500).json({ error: 'Failed to load history', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Server started successfully!');
  console.log(`📍 Running at http://localhost:${PORT}`);
  console.log(`💬 Ready to chat with Gemini\n`);
});