import WebSocket from 'ws';

const wsUrl = 'wss://aimcs-backend.kindmoss-db398a44.eastus2.azurecontainerapps.io/ws/audio';

console.log('🔌 Testing WebSocket connection to:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');
  
  // Send a test message
  ws.send(JSON.stringify({
    type: 'test',
    message: 'Hello from test script'
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('📨 Received message:', message);
  } catch (e) {
    console.log('📨 Received raw message:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
});

// Close after 5 seconds
setTimeout(() => {
  console.log('⏰ Closing connection...');
  ws.close();
  process.exit(0);
}, 5000); 