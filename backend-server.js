const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Azure OpenAI Configuration
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || 'https://aimcs-foundry.cognitiveservices.azure.com/';
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'model-router';

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: connections.size,
    version: '1.0.0',
    aiConfigured: !!AZURE_OPENAI_API_KEY
  });
});

// API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    message: 'AIMCS Backend API is running',
    timestamp: new Date().toISOString(),
    activeConnections: connections.size,
    aiConfigured: !!AZURE_OPENAI_API_KEY,
    aiEndpoint: AZURE_OPENAI_ENDPOINT,
    aiDeployment: AZURE_OPENAI_DEPLOYMENT,
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

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'WebSocket connected successfully',
    connectionId,
    timestamp: new Date().toISOString(),
    aiConfigured: !!AZURE_OPENAI_API_KEY
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
          // Handle audio data
          console.log(`🎤 Audio data received from ${connectionId}, size: ${message.data?.length || 0} bytes`);
          
          // Echo back audio acknowledgment
          ws.send(JSON.stringify({
            type: 'audio_received',
            message: 'Audio data received',
            dataSize: message.data?.length || 0,
            timestamp: new Date().toISOString()
          }));

          // Here you would process the audio data
          // For now, we'll just log it
          if (message.data) {
            // Convert base64 back to buffer for processing
            const audioBuffer = Buffer.from(message.data, 'base64');
            console.log(`🎵 Audio buffer size: ${audioBuffer.length} bytes`);
            
            // TODO: Process audio with Azure Speech Services or other AI
            // For now, just acknowledge receipt
          }
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
    connections.delete(connectionId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${connectionId}:`, error);
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
  if (AZURE_OPENAI_API_KEY) {
    console.log(`🔗 AI Endpoint: ${AZURE_OPENAI_ENDPOINT}`);
    console.log(`🎯 AI Deployment: ${AZURE_OPENAI_DEPLOYMENT}`);
  }
}); 