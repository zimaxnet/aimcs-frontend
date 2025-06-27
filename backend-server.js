import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import sdk from 'microsoft-cognitiveservices-speech-sdk';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Azure OpenAI Configuration
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || 'https://aimcs-foundry.cognitiveservices.azure.com/';
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'model-router';

// Azure Speech Services Configuration
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'eastus2';

// Middleware
app.use(cors({
  origin: [
    'https://aimcs-frontend-eastus2.azurewebsites.net',
    'https://aimcs.net',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Store active WebSocket connections
const connections = new Map();

// Audio processing state per connection
const audioStates = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: connections.size,
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
    activeConnections: connections.size,
    aiConfigured: !!AZURE_OPENAI_API_KEY,
    speechConfigured: !!AZURE_SPEECH_KEY,
    aiEndpoint: AZURE_OPENAI_ENDPOINT,
    aiDeployment: AZURE_OPENAI_DEPLOYMENT,
    speechRegion: AZURE_SPEECH_REGION,
    endpoints: [
      'GET /health',
      'GET /api/status',
      'POST /api/chat',
      'WS /ws/audio'
    ]
  });
});

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
    const openaiUrl = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-10-01-preview`;
    
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

// Initialize speech recognizer for a connection
const initializeSpeechRecognizer = (connectionId, ws) => {
  if (!AZURE_SPEECH_KEY) {
    console.log('⚠️ Azure Speech Services not configured');
    return null;
  }

  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
    speechConfig.speechRecognitionLanguage = 'en-US';
    speechConfig.enableDictation();
    
    const audioConfig = sdk.AudioConfig.fromStreamInput(new sdk.PushAudioInputStream());
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    
    // Store audio stream for this connection
    const audioStream = audioConfig.properties.getProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs);
    
    recognizer.recognized = (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
        const transcribedText = e.result.text;
        console.log(`🎤 Speech recognized: "${transcribedText}"`);
        
        // Send transcribed text to client
        ws.send(JSON.stringify({
          type: 'speech_recognized',
          message: transcribedText,
          timestamp: new Date().toISOString()
        }));
        
        // Send to AI for response
        processAITranscription(connectionId, transcribedText, ws);
      }
    };
    
    recognizer.recognizing = (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
        const partialText = e.result.text;
        console.log(`🎤 Partial recognition: "${partialText}"`);
        
        // Send partial transcription to client
        ws.send(JSON.stringify({
          type: 'speech_recognizing',
          message: partialText,
          timestamp: new Date().toISOString()
        }));
      }
    };
    
    recognizer.canceled = (s, e) => {
      console.log(`❌ Speech recognition canceled: ${e.reason}`);
      if (e.reason === sdk.CancellationReason.Error) {
        console.error(`Speech recognition error: ${e.errorDetails}`);
      }
    };
    
    recognizer.sessionStopped = (s, e) => {
      console.log('🔚 Speech recognition session stopped');
      recognizer.stopContinuousRecognitionAsync();
    };
    
    return { recognizer, audioStream };
  } catch (error) {
    console.error('❌ Error initializing speech recognizer:', error);
    return null;
  }
};

// Process transcribed text with AI
const processAITranscription = async (connectionId, transcribedText, ws) => {
  if (!AZURE_OPENAI_API_KEY) {
    ws.send(JSON.stringify({
      type: 'chat_response',
      message: `Echo: ${transcribedText}`,
      aiUsed: false,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  try {
    console.log(`🤖 Processing transcribed text with AI: "${transcribedText}"`);
    
    const openaiUrl = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-10-01-preview`;
    
    const openaiResponse = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant for the AIMCS (AI Multimodal Customer System). Provide clear, concise, and helpful responses.' },
          { role: 'user', content: transcribedText }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`Azure OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices?.[0]?.message?.content || 'No response from AI';

    console.log(`✅ AI response to transcription: "${aiResponse}"`);

    // Send text response
    ws.send(JSON.stringify({
      type: 'chat_response',
      message: aiResponse,
      aiUsed: true,
      originalMessage: transcribedText,
      timestamp: new Date().toISOString()
    }));

    // Generate and send speech response
    await generateAndSendSpeech(aiResponse, ws);

  } catch (error) {
    console.error(`❌ Error processing transcription with AI:`, error);
    ws.send(JSON.stringify({
      type: 'chat_response',
      message: `Sorry, I couldn't process that. Please try again.`,
      aiUsed: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }));
  }
};

// Generate speech from text and send to client
const generateAndSendSpeech = async (text, ws) => {
  if (!AZURE_SPEECH_KEY) {
    console.log('⚠️ Speech Services not configured for TTS');
    return;
  }

  try {
    console.log(`🎤 Generating speech for: "${text}"`);
    
    const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
    speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural'; // Natural-sounding voice
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
    
    const result = await new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        result => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(result);
          } else {
            reject(new Error(`Speech synthesis failed: ${result.reason}`));
          }
          synthesizer.close();
        },
        error => {
          console.error('Speech synthesis error:', error);
          synthesizer.close();
          reject(error);
        }
      );
    });

    // Convert audio buffer to base64
    const audioData = Buffer.from(result.audioData).toString('base64');
    
    console.log(`✅ Speech generated, size: ${result.audioData.length} bytes`);

    // Send audio response to client
    ws.send(JSON.stringify({
      type: 'speech_response',
      message: text,
      audioData: audioData,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    console.error('❌ Error generating speech:', error);
    // Don't fail the entire response if TTS fails
  }
};

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const connectionId = Date.now().toString();
  const clientInfo = {
    id: connectionId,
    ip: req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    connectedAt: new Date().toISOString()
  };

  console.log(`🔌 WebSocket connected: ${connectionId} from ${clientInfo.ip}`);
  connections.set(connectionId, { ws, info: clientInfo });

  // Initialize speech recognizer for this connection
  const speechState = initializeSpeechRecognizer(connectionId, ws);
  if (speechState) {
    audioStates.set(connectionId, speechState);
  }

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'WebSocket connected successfully',
    connectionId,
    timestamp: new Date().toISOString(),
    aiConfigured: !!AZURE_OPENAI_API_KEY,
    speechConfigured: !!AZURE_SPEECH_KEY
  }));

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`📨 Received message from ${connectionId}:`, message.type);

      switch (message.type) {
        case 'test':
          // Echo test message
          ws.send(JSON.stringify({
            type: 'test_response',
            message: 'Test message received successfully',
            originalMessage: message.message,
            timestamp: new Date().toISOString()
          }));
          break;

        case 'chat':
          // Handle chat messages via WebSocket
          if (!message.message) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Chat message is required',
              timestamp: new Date().toISOString()
            }));
            return;
          }

          try {
            if (!AZURE_OPENAI_API_KEY) {
              ws.send(JSON.stringify({
                type: 'chat_response',
                message: `Echo: ${message.message}`,
                aiUsed: false,
                timestamp: new Date().toISOString()
              }));
              return;
            }

            console.log(`🤖 WebSocket chat to Azure OpenAI: "${message.message}"`);

            const openaiUrl = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-10-01-preview`;
            
            const openaiResponse = await fetch(openaiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'api-key': AZURE_OPENAI_API_KEY,
              },
              body: JSON.stringify({
                messages: [
                  { role: 'system', content: 'You are a helpful AI assistant for the AIMCS (AI Multimodal Customer System). Provide clear, concise, and helpful responses.' },
                  { role: 'user', content: message.message }
                ],
                max_tokens: 500,
                temperature: 0.7,
              }),
            });

            if (!openaiResponse.ok) {
              throw new Error(`Azure OpenAI API error: ${openaiResponse.status}`);
            }

            const openaiData = await openaiResponse.json();
            const aiResponse = openaiData.choices?.[0]?.message?.content || 'No response from AI';

            console.log(`✅ WebSocket AI response: "${aiResponse}"`);

            ws.send(JSON.stringify({
              type: 'chat_response',
              message: aiResponse,
              aiUsed: true,
              originalMessage: message.message,
              timestamp: new Date().toISOString()
            }));

            // Generate and send speech response for chat messages too
            await generateAndSendSpeech(aiResponse, ws);

          } catch (error) {
            console.error(`❌ WebSocket chat error:`, error);
            ws.send(JSON.stringify({
              type: 'chat_response',
              message: `Echo (AI failed): ${message.message}`,
              aiUsed: false,
              error: error.message,
              timestamp: new Date().toISOString()
            }));
          }
          break;

        case 'audio':
          // Handle audio data with real-time processing
          console.log(`🎤 Audio data received from ${connectionId}, size: ${message.data?.length || 0} bytes`);
          
          const audioState = audioStates.get(connectionId);
          if (audioState && audioState.recognizer) {
            try {
              // Convert base64 audio to buffer
              const audioBuffer = Buffer.from(message.data, 'base64');
              
              // Send audio to speech recognizer
              if (audioState.audioStream) {
                audioState.audioStream.write(audioBuffer);
              }
              
              // Start recognition if not already started
              if (!audioState.isRecognizing) {
                audioState.recognizer.startContinuousRecognitionAsync();
                audioState.isRecognizing = true;
              }
              
              // Send acknowledgment
              ws.send(JSON.stringify({
                type: 'audio_processing',
                message: 'Audio being processed in real-time',
                dataSize: audioBuffer.length,
                timestamp: new Date().toISOString()
              }));
              
            } catch (error) {
              console.error(`❌ Error processing audio:`, error);
              ws.send(JSON.stringify({
                type: 'audio_error',
                message: 'Error processing audio',
                error: error.message,
                timestamp: new Date().toISOString()
              }));
            }
          } else {
            // Fallback: just acknowledge audio
            ws.send(JSON.stringify({
              type: 'audio_received',
              message: 'Audio data received (speech processing not available)',
              dataSize: message.data?.length || 0,
              timestamp: new Date().toISOString()
            }));
          }
          break;

        case 'stop_audio':
          // Stop audio processing
          const state = audioStates.get(connectionId);
          if (state && state.recognizer && state.isRecognizing) {
            state.recognizer.stopContinuousRecognitionAsync();
            state.isRecognizing = false;
            console.log(`⏹️ Stopped audio processing for ${connectionId}`);
          }
          
          ws.send(JSON.stringify({
            type: 'audio_stopped',
            message: 'Audio processing stopped',
            timestamp: new Date().toISOString()
          }));
          break;

        case 'ping':
          // Respond to ping
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;

        default:
          // Echo unknown message types
          ws.send(JSON.stringify({
            type: 'echo',
            originalType: message.type,
            message: 'Unknown message type received',
            timestamp: new Date().toISOString()
          }));
      }
    } catch (error) {
      console.error(`❌ Error processing message from ${connectionId}:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message',
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  });

  // Handle connection close
  ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket disconnected: ${connectionId}, code: ${code}, reason: ${reason}`);
    
    // Clean up speech recognizer
    const audioState = audioStates.get(connectionId);
    if (audioState && audioState.recognizer) {
      audioState.recognizer.stopContinuousRecognitionAsync();
      audioState.recognizer.close();
    }
    audioStates.delete(connectionId);
    connections.delete(connectionId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${connectionId}:`, error);
    audioStates.delete(connectionId);
    connections.delete(connectionId);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  
  // Close all WebSocket connections
  connections.forEach(({ ws }, id) => {
    console.log(`🔌 Closing connection ${id}`);
    ws.close(1000, 'Server shutting down');
  });
  
  // Clean up speech recognizers
  audioStates.forEach((state, id) => {
    if (state.recognizer) {
      state.recognizer.stopContinuousRecognitionAsync();
      state.recognizer.close();
    }
  });
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
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
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws/audio`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API status: http://localhost:${PORT}/api/status`);
  console.log(`🤖 AI Configured: ${!!AZURE_OPENAI_API_KEY}`);
  console.log(`🎤 Speech Services Configured: ${!!AZURE_SPEECH_KEY}`);
  if (AZURE_OPENAI_API_KEY) {
    console.log(`🔗 AI Endpoint: ${AZURE_OPENAI_ENDPOINT}`);
    console.log(`🎯 AI Deployment: ${AZURE_OPENAI_DEPLOYMENT}`);
  }
  if (AZURE_SPEECH_KEY) {
    console.log(`🎤 Speech Region: ${AZURE_SPEECH_REGION}`);
  }
});