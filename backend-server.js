import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Azure OpenAI Configuration
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || 'https://aimcs-foundry.cognitiveservices.azure.com/';
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'model-router';
const AZURE_OPENAI_AUDIO_DEPLOYMENT = process.env.AZURE_OPENAI_AUDIO_DEPLOYMENT || 'gpt-4o-mini-audio-preview-2';

// Azure Speech Services Configuration
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'eastus2';

// Middleware
app.use(cors({
  origin: [
    'https://aimcs.azurewebsites.net',
    'https://aimcs.net',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    aiConfigured: !!AZURE_OPENAI_API_KEY,
    speechConfigured: !!AZURE_SPEECH_KEY
  });
});

// API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    message: 'AIMCS Backend API is running',
    timestamp: new Date().toISOString(),
    aiConfigured: !!AZURE_OPENAI_API_KEY,
    speechConfigured: !!AZURE_SPEECH_KEY,
    aiEndpoint: AZURE_OPENAI_ENDPOINT,
    aiDeployment: AZURE_OPENAI_DEPLOYMENT,
    speechRegion: AZURE_SPEECH_REGION,
    endpoints: [
      'GET /health',
      'GET /api/status',
      'POST /api/chat',
      'POST /api/audio',
      'POST /api/tts'
    ]
  });
});

// Helper function to determine which model to use based on request type
const getModelDeployment = (isAudioRequest = false) => {
  return isAudioRequest ? AZURE_OPENAI_AUDIO_DEPLOYMENT : AZURE_OPENAI_DEPLOYMENT;
};

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log(`🔌 WebSocket client connected from ${req.socket.remoteAddress}`);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to AIMCS WebSocket server',
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`📨 WebSocket message received: ${message.type}`);

      switch (message.type) {
        case 'audio_chunk':
          await handleAudioChunk(ws, message);
          break;
        case 'text_message':
          await handleTextMessage(ws, message);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type',
            timestamp: new Date().toISOString()
          }));
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message',
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Handle audio chunks via WebSocket
async function handleAudioChunk(ws, message) {
  try {
    const { audioData, audioFormat, isFinal = false } = message;
    
    if (!audioData) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Audio data is required',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Check if Azure OpenAI is configured
    if (!AZURE_OPENAI_API_KEY) {
      ws.send(JSON.stringify({
        type: 'audio_response',
        message: 'AI not configured for audio processing',
        aiUsed: false,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    console.log(`🎤 Processing audio chunk via WebSocket, size: ${audioData.length} bytes, final: ${isFinal}`);
    
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
      ws.send(JSON.stringify({
        type: 'error',
        message: `Audio processing failed: ${openaiResponse.status}`,
        error: errorText,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices?.[0]?.message?.content || 'No response from AI';

    console.log(`✅ AI response to audio: "${aiResponse}"`);

    // Generate TTS audio for the AI response
    let ttsAudioData = null;
    try {
      console.log(`🎤 Generating TTS audio for: "${aiResponse}"`);
      
      // Use Azure Speech Services TTS
      const speechUrl = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
      
      const speechResponse = await fetch(speechUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
          'User-Agent': 'AIMCS-Backend'
        },
        body: `<speak version='1.0' xml:lang='en-US'>
          <voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'>
            <prosody rate='1.0'>
              ${aiResponse}
            </prosody>
          </voice>
        </speak>`
      });

      if (speechResponse.ok) {
        const audioBuffer = await speechResponse.arrayBuffer();
        ttsAudioData = Buffer.from(audioBuffer).toString('base64');
        console.log(`✅ TTS audio generated, size: ${ttsAudioData.length} bytes`);
      } else {
        console.log(`⚠️ TTS generation failed: ${speechResponse.status}`);
      }
    } catch (ttsError) {
      console.error(`❌ TTS error:`, ttsError);
      // Don't fail the entire response if TTS fails
    }

    const response = {
      type: 'audio_response',
      id: Date.now().toString(),
      message: aiResponse,
      aiUsed: true,
      originalMessage: 'Audio input',
      timestamp: new Date().toISOString()
    };

    // Add TTS audio data if available
    if (ttsAudioData) {
      response.audioData = ttsAudioData;
      response.audioFormat = 'mp3';
    }

    ws.send(JSON.stringify(response));

  } catch (error) {
    console.error(`❌ Error processing audio chunk:`, error);
    ws.send(JSON.stringify({
      type: 'error',
      message: `Sorry, I couldn't process that audio. Please try again.`,
      error: error.message,
      timestamp: new Date().toISOString()
    }));
  }
}

// Handle text messages via WebSocket
async function handleTextMessage(ws, message) {
  try {
    const { text, context } = message;
    
    if (!text) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Text is required',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Check if Azure OpenAI is configured
    if (!AZURE_OPENAI_API_KEY) {
      ws.send(JSON.stringify({
        type: 'text_response',
        message: `Echo: ${text}`,
        aiUsed: false,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    console.log(`🤖 Sending text message to Azure OpenAI: "${text}"`);

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
          { role: 'user', content: text }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`❌ Azure OpenAI error: ${openaiResponse.status} - ${errorText}`);
      ws.send(JSON.stringify({
        type: 'error',
        message: `Text processing failed: ${openaiResponse.status}`,
        error: errorText,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices?.[0]?.message?.content || 'No response from AI';

    console.log(`✅ Azure OpenAI response: "${aiResponse}"`);

    // Generate TTS audio for the AI response
    let ttsAudioData = null;
    try {
      console.log(`🎤 Generating TTS for: "${aiResponse}"`);
      
      // Use Azure Speech Services TTS
      const speechUrl = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
      
      const speechResponse = await fetch(speechUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
          'User-Agent': 'AIMCS-Backend'
        },
        body: `<speak version='1.0' xml:lang='en-US'>
          <voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'>
            <prosody rate='1.0'>
              ${aiResponse}
            </prosody>
          </voice>
        </speak>`
      });

      if (speechResponse.ok) {
        const audioBuffer = await speechResponse.arrayBuffer();
        ttsAudioData = Buffer.from(audioBuffer).toString('base64');
        console.log(`✅ TTS audio generated, size: ${ttsAudioData.length} bytes`);
      } else {
        console.log(`⚠️ TTS generation failed: ${speechResponse.status}`);
      }
    } catch (ttsError) {
      console.error(`❌ TTS error:`, ttsError);
      // Don't fail the entire response if TTS fails
    }

    const response = {
      type: 'text_response',
      id: Date.now().toString(),
      message: aiResponse,
      timestamp: new Date().toISOString(),
      context: context || {},
      aiUsed: true,
      originalMessage: text,
      usage: openaiData.usage
    };

    // Add TTS audio data if available
    if (ttsAudioData) {
      response.audioData = ttsAudioData;
      response.audioFormat = 'mp3';
    }

    ws.send(JSON.stringify(response));

  } catch (error) {
    console.error('❌ Text message processing error:', error);
    
    // Fallback to echo if AI fails
    ws.send(JSON.stringify({
      type: 'text_response',
      message: `Echo (AI failed): ${message.text}`,
      aiUsed: false,
      timestamp: new Date().toISOString(),
      error: error.message
    }));
  }
}

// Chat endpoint with Azure OpenAI integration (HTTP)
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

    const response = {
      id: Date.now().toString(),
      message: aiResponse,
      timestamp: new Date().toISOString(),
      context: context || {},
      aiUsed: true,
      originalMessage: message,
      usage: openaiData.usage
    };

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

// Audio processing endpoint (HTTP)
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

    // Generate TTS audio for the AI response
    let ttsAudioData = null;
    try {
      console.log(`🎤 Generating TTS audio for: "${aiResponse}"`);
      
      // Use Azure Speech Services TTS
      const speechUrl = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
      
      const speechResponse = await fetch(speechUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
          'User-Agent': 'AIMCS-Backend'
        },
        body: `<speak version='1.0' xml:lang='en-US'>
          <voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'>
            <prosody rate='1.0'>
              ${aiResponse}
            </prosody>
          </voice>
        </speak>`
      });

      if (speechResponse.ok) {
        const audioBuffer = await speechResponse.arrayBuffer();
        ttsAudioData = Buffer.from(audioBuffer).toString('base64');
        console.log(`✅ TTS audio generated, size: ${ttsAudioData.length} bytes`);
      } else {
        console.log(`⚠️ TTS generation failed: ${speechResponse.status}`);
      }
    } catch (ttsError) {
      console.error(`❌ TTS error:`, ttsError);
      // Don't fail the entire response if TTS fails
    }

    const response = {
      id: Date.now().toString(),
      message: aiResponse,
      aiUsed: true,
      originalMessage: 'Audio input',
      timestamp: new Date().toISOString()
    };

    // Add TTS audio data if available
    if (ttsAudioData) {
      response.audioData = ttsAudioData;
      response.audioFormat = 'mp3';
    }

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

// Text-to-Speech endpoint using Azure Speech Services (HTTP)
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'en-US-JennyNeural', speed = 1.0 } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Check if Azure Speech Services is configured
    if (!AZURE_SPEECH_KEY) {
      console.log('⚠️ Azure Speech Services not configured for TTS');
      return res.status(500).json({ error: 'TTS not configured' });
    }

    console.log(`🎤 Generating TTS for: "${text}"`);

    // Use Azure Speech Services TTS
    const speechUrl = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
    
    const speechResponse = await fetch(speechUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'User-Agent': 'AIMCS-Backend'
      },
      body: `<speak version='1.0' xml:lang='en-US'>
        <voice xml:lang='en-US' xml:gender='Female' name='${voice}'>
          <prosody rate='${speed}'>
            ${text}
          </prosody>
        </voice>
      </speak>`
    });

    if (!speechResponse.ok) {
      const errorText = await speechResponse.text();
      console.error(`❌ Speech Services TTS error: ${speechResponse.status} - ${errorText}`);
      throw new Error(`Speech Services TTS error: ${speechResponse.status}`);
    }

    const audioBuffer = await speechResponse.arrayBuffer();
    const audioData = Buffer.from(audioBuffer).toString('base64');

    console.log(`✅ TTS audio generated, size: ${audioData.length} bytes`);

    res.json({
      id: Date.now().toString(),
      text: text,
      audioData: audioData,
      audioFormat: 'mp3',
      voice: voice,
      speed: speed,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error generating TTS:`, error);
    res.status(500).json({
      id: Date.now().toString(),
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

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 AIMCS Backend Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API status: http://localhost:${PORT}/api/status`);
  console.log(`🔌 WebSocket enabled: ws://localhost:${PORT}`);
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