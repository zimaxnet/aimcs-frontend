import express from 'express';

const app = express();

// Strictly required environment variables
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'o4-mini';
const AZURE_OPENAI_TTS_DEPLOYMENT = process.env.AZURE_OPENAI_TTS_DEPLOYMENT || 'gpt-4o-mini-tts';

app.use(express.json({ limit: '10mb' }));

// Strict /api/chat endpoint only
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT) {
      return res.status(500).json({ error: 'AI not configured' });
    }

    // 1. Get text from o4-mini
    const openaiUrl = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-12-01-preview`;
    const openaiResponse = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: 'text' }
      }),
    });
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      return res.status(500).json({ error: `OpenAI error: ${openaiResponse.status} - ${errorText}` });
    }
    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices?.[0]?.message?.content || 'No response from AI';

    // 2. Get audio from gpt-4o-mini-tts
    let audioData = null;
    let audioFormat = null;
    try {
      const ttsUrl = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_TTS_DEPLOYMENT}/audio/speech?api-version=2025-03-01-preview`;
      const ttsResponse = await fetch(ttsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_OPENAI_API_KEY,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          input: aiResponse,
          voice: 'alloy',
          response_format: 'mp3'
        }),
      });
      if (ttsResponse.ok) {
        const audioBuffer = await ttsResponse.arrayBuffer();
        audioData = Buffer.from(audioBuffer).toString('base64');
        audioFormat = 'audio/mp3';
      }
    } catch (ttsError) {
      // If TTS fails, just skip audio
    }

    const response = {
      id: Date.now().toString(),
      sender: 'Zimax AI',
      message: aiResponse,
      timestamp: new Date().toISOString(),
      aiUsed: true,
      originalMessage: message
    };
    if (audioData) {
      response.audioData = audioData;
      response.audioFormat = audioFormat;
    }
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AIMCS Strict Backend running on port ${PORT}`);
});