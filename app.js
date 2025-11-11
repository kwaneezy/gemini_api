import express from 'express';
import { gemini_api_call } from './gemini_api_call.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// ✅ 1️⃣ Always parse JSON before defining routes
app.use(express.json());

// ✅ 2️⃣ Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ✅ 3️⃣ Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ 4️⃣ Gemini route
app.post('/gemini', async (req, res) => {
  try {
    const { userQuery } = req.body;
    console.log("📥 Received:", userQuery);

    if (!userQuery) {
      console.warn("⚠️ No query provided");
      return res.status(400).send('No query provided');
    }

    const geminiResponse = await gemini_api_call(userQuery);
    console.log("📤 Gemini response:", geminiResponse);
    res.send(geminiResponse);

  } catch (error) {
    console.error("🔥 Detailed Gemini API Error:");
    console.error(error);             // full error object
    console.error(error?.message);    // readable message
    res.status(500).send(error?.message || 'Error processing your request');
  }
});

// ✅ 5️⃣ Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
