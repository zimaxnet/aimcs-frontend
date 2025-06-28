import express from 'express';
import cors from 'cors';

const app = express();

// Environment variables
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini-tts';
const AZURE_OPENAI_AUDIO_DEPLOYMENT = process.env.AZURE_OPENAI_AUDIO_DEPLOYMENT || 'gpt-4o-mini-audio-preview';
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'eastus2';

// CORS configuration
const corsOptions = {
  origin: [
    'https://aimcs.net',
    'https://aimcs.azurewebsites.net',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    aiConfigured: !!AZURE_OPENAI_API_KEY,
    speechConfigured: !!AZURE_SPEECH_KEY,
    aiEndpoint: AZURE_OPENAI_ENDPOINT,
    textModel: AZURE_OPENAI_DEPLOYMENT,
    audioModel: AZURE_OPENAI_AUDIO_DEPLOYMENT,
    speechRegion: AZURE_SPEECH_REGION
  });
});

// Helper function to determine which model to use based on request type
const getModelDeployment = (isAudioRequest = false) => {
  return isAudioRequest ? AZURE_OPENAI_AUDIO_DEPLOYMENT : AZURE_OPENAI_DEPLOYMENT;
};

// Chat endpoint with Azure OpenAI integration
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if Azure OpenAI is configured
    if (!AZURE_OPENAI_API_KEY) {
      console.log('⚠️ Azure OpenAI not configured, using echo response');
      const response = {
        id: Date.now().toString(),
        message: `Echo: ${message}`,
        timestamp: new Date().toISOString(),
        context: context || {},
        aiUsed: false
      };
      return res.json(response);
    }

    console.log(`🤖 Sending message to Azure OpenAI: "${message}"`);

    // Call Azure OpenAI
    const openaiUrl = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${getModelDeployment(false)}/chat/completions?api-version=2024-10-01-preview`;
    
    const openaiResponse = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant for the AIMCS (AI Multimodal Customer System). Provide clear, concise, and helpful responses.' },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: "text" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`❌ Azure OpenAI error: ${openaiResponse.status} - ${errorText}`);
      throw new Error(`Azure OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices?.[0]?.message?.content || 'No response from AI';

    console.log(`✅ Azure OpenAI response: "${aiResponse}"`);

    // Check if this is a TTS model response (should include audio data)
    let audioData = null;
    let audioFormat = null;
    
    if (openaiData.choices?.[0]?.message?.content?.[0]?.type === 'audio') {
      // Extract audio data from TTS model response
      const audioContent = openaiData.choices[0].message.content[0];
      audioData = audioContent.audio_url?.url?.split(',')[1]; // Remove data:audio/mp3;base64, prefix
      audioFormat = audioContent.audio_url?.url?.split(';')[0]?.split(':')[1] || 'audio/mp3';
      console.log(`✅ TTS audio received from model, format: ${audioFormat}`);
    }

    const response = {
      id: Date.now().toString(),
      message: aiResponse,
      timestamp: new Date().toISOString(),
      context: context || {},
      aiUsed: true,
      originalMessage: message,
      usage: openaiData.usage
    };

    // Add audio data if available from TTS model
    if (audioData) {
      response.audioData = audioData;
      response.audioFormat = audioFormat;
    }

    res.json(response);

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Fallback to echo if AI fails
    const fallbackResponse = {
      id: Date.now().toString(),
      message: `Echo (AI failed): ${req.body.message}`,
      timestamp: new Date().toISOString(),
      context: req.body.context || {},
      aiUsed: false,
      error: error.message
    };
    
    res.json(fallbackResponse);
  }
});

// Audio processing endpoint
app.post('/api/audio', async (req, res) => {
  try {
    const { audioData, audioFormat } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    // Check if Azure OpenAI is configured
    if (!AZURE_OPENAI_API_KEY) {
      console.log('⚠️ Azure OpenAI not configured for audio processing');
      const response = {
        id: Date.now().toString(),
        message: 'AI not configured for audio processing',
        aiUsed: false,
        timestamp: new Date().toISOString()
      };
      return res.json(response);
    }

    console.log(`🎤 Processing audio with GPT-4o audio model, size: ${audioData.length} bytes, format: ${audioFormat || 'unknown'}`);
    
    const openaiUrl = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${getModelDeployment(true)}/chat/completions?api-version=2024-10-01-preview`;
    
    // Determine the correct MIME type for the audio data
    let mimeType = 'audio/wav';
    if (audioFormat) {
      if (audioFormat.includes('webm')) {
        mimeType = 'audio/webm';
      } else if (audioFormat.includes('mp4')) {
        mimeType = 'audio/mp4';
      } else if (audioFormat.includes('opus')) {
        mimeType = 'audio/opus';
      }
    }
    
    console.log(`🎤 Using MIME type: ${mimeType}`);
    
    const openaiResponse = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: 'Please listen to this audio and respond naturally. If you hear speech, respond to what was said. If you hear music, sounds, or other audio, describe what you hear.'
              },
              {
                type: 'audio',
                audio_url: {
                  url: `data:${mimeType};base64,${audioData}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: "text" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`❌ Azure OpenAI error: ${openaiResponse.status} - ${errorText}`);
      throw new Error(`Azure OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices?.[0]?.message?.content || 'No response from AI';

    console.log(`✅ AI response to audio: "${aiResponse}"`);

    const response = {
      id: Date.now().toString(),
      message: aiResponse,
      aiUsed: true,
      originalMessage: 'Audio input',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error(`❌ Error processing audio:`, error);
    res.status(500).json({
      id: Date.now().toString(),
      message: `Sorry, I couldn't process that audio. Please try again.`,
      aiUsed: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 AIMCS Backend Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API status: http://localhost:${PORT}/api/status`);
  console.log(`🤖 AI Configured: ${!!AZURE_OPENAI_API_KEY}`);
  console.log(`🎤 Speech Services Configured: ${!!AZURE_SPEECH_KEY}`);
  if (AZURE_OPENAI_API_KEY) {
    console.log(`🔗 AI Endpoint: ${AZURE_OPENAI_ENDPOINT}`);
    console.log(`🎯 Text Model: ${AZURE_OPENAI_DEPLOYMENT}`);
    console.log(`🎵 Audio Model: ${AZURE_OPENAI_AUDIO_DEPLOYMENT}`);
  }
  if (AZURE_SPEECH_KEY) {
    console.log(`🎤 Speech Region: ${AZURE_SPEECH_REGION}`);
  }
});