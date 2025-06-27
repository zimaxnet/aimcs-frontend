import WebSocket from 'ws';

const wsUrl = 'wss://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io/ws/audio';

console.log('🔌 Testing WebSocket connection to:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');
  
  // Send a test message
  const testMessage = {
    type: 'test',
    message: 'Hello from Node.js test client!',
    timestamp: new Date().toISOString()
  };
  
  console.log('📤 Sending test message:', JSON.stringify(testMessage));
  ws.send(JSON.stringify(testMessage));
  
  // Send a chat message
  setTimeout(() => {
    const chatMessage = {
      type: 'chat',
      message: 'What is 2+2?',
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Sending chat message:', JSON.stringify(chatMessage));
    ws.send(JSON.stringify(chatMessage));
  }, 2000);
  
  // Send a ping
  setTimeout(() => {
    const pingMessage = {
      type: 'ping',
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Sending ping:', JSON.stringify(pingMessage));
    ws.send(JSON.stringify(pingMessage));
  }, 4000);
  
  // Close after 6 seconds
  setTimeout(() => {
    console.log('🔌 Closing connection...');
    ws.close();
  }, 6000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('📨 Received:', JSON.stringify(message, null, 2));
  } catch (e) {
    console.log('📨 Raw message:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
  process.exit(0);
}); 