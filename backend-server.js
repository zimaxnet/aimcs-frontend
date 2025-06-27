const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
    version: '1.0.0'
  });
});

// API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    message: 'AIMCS Backend API is running',
    timestamp: new Date().toISOString(),
    activeConnections: connections.size,
    endpoints: [
      'GET /health',
      'GET /api/status',
      'POST /api/chat',
      'WS /ws/audio'
    ]
  });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Echo response for testing
    const response = {
      id: Date.now().toString(),
      message: `Echo: ${message}`,
      timestamp: new Date().toISOString(),
      context: context || {}
    };

    res.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    timestamp: new Date().toISOString()
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
}); 