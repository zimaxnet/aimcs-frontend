import React, { useState, useEffect, useRef } from 'react';

export default function AudioWebSocketTest() {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [backendUrl, setBackendUrl] = useState('');
  const [wsUrl, setWsUrl] = useState('');

  const mediaRecorderRef = useRef(null);
  const websocketRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Environment variables
  const backendApiUrl = import.meta.env.VITE_BACKEND_API_URL;

  useEffect(() => {
    // Set WebSocket URL based on backend URL
    if (backendApiUrl) {
      const url = new URL(backendApiUrl);
      const wsUrl = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/ws/audio`;
      setWsUrl(wsUrl);
      setBackendUrl(backendApiUrl);
    }
  }, [backendApiUrl]);

  // Test WebSocket connection
  const testWebSocketConnection = async () => {
    if (!wsUrl) {
      setError('WebSocket URL not configured');
      return;
    }

    try {
      setError('');
      addMessage('🔌 Testing WebSocket connection...', 'info');

      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        addMessage('✅ WebSocket connected successfully!', 'success');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addMessage(`📨 Received: ${JSON.stringify(data)}`, 'received');
        } catch (e) {
          addMessage(`📨 Raw message: ${event.data}`, 'received');
        }
      };

      ws.onerror = (error) => {
        setError(`WebSocket error: ${error.message || 'Connection failed'}`);
        addMessage('❌ WebSocket connection failed', 'error');
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        addMessage(`🔌 WebSocket closed: ${event.code} - ${event.reason}`, 'info');
      };

      // Test message after connection
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const testMessage = {
            type: 'test',
            message: 'Hello from frontend!',
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(testMessage));
          addMessage(`📤 Sent test message: ${JSON.stringify(testMessage)}`, 'sent');
        }
      }, 1000);

    } catch (err) {
      setError(`WebSocket test failed: ${err.message}`);
      addMessage('❌ WebSocket test failed', 'error');
    }
  };

  // Test microphone access
  const testMicrophone = async () => {
    try {
      setError('');
      addMessage('🎤 Testing microphone access...', 'info');

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });

      // Set up audio analysis
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);

      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      microphoneRef.current.connect(analyserRef.current);

      // Start audio level monitoring
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setAudioLevel(average);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };

      updateAudioLevel();
      addMessage('✅ Microphone access granted!', 'success');

    } catch (err) {
      setError(`Microphone access failed: ${err.message}`);
      addMessage('❌ Microphone access denied', 'error');
    }
  };

  // Start recording and streaming
  const startRecording = async () => {
    if (!isConnected) {
      setError('WebSocket not connected. Please connect first.');
      return;
    }

    try {
      setError('');
      addMessage('🎙️ Starting audio recording...', 'info');

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
          // Convert blob to base64 for WebSocket transmission
          const reader = new FileReader();
          reader.onload = () => {
            const audioData = {
              type: 'audio',
              data: reader.result.split(',')[1], // Remove data URL prefix
              timestamp: new Date().toISOString()
            };
            websocketRef.current.send(JSON.stringify(audioData));
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(100); // Send data every 100ms
      setIsRecording(true);
      addMessage('✅ Recording started!', 'success');

    } catch (err) {
      setError(`Recording failed: ${err.message}`);
      addMessage('❌ Recording failed', 'error');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      addMessage('⏹️ Recording stopped', 'info');
    }
  };

  // Disconnect WebSocket
  const disconnectWebSocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
      setIsConnected(false);
      addMessage('🔌 WebSocket disconnected', 'info');
    }
  };

  // Clean up audio analysis
  const cleanupAudio = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  // Add message to log
  const addMessage = (message, type = 'info') => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
        🎤 Audio WebSocket Test
      </h1>

      {/* Configuration Status */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Configuration Status:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${backendUrl ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">Backend URL:</span>
            <span className="ml-2 text-gray-600">{backendUrl ? '✅ Set' : '❌ Missing'}</span>
          </div>
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${wsUrl ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">WebSocket URL:</span>
            <span className="ml-2 text-gray-600">{wsUrl ? '✅ Set' : '❌ Missing'}</span>
          </div>
        </div>
        {wsUrl && (
          <div className="mt-2 text-xs text-gray-600">
            <strong>WebSocket URL:</strong> {wsUrl}
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-lg border ${isConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <h3 className="font-semibold mb-2">WebSocket Status</h3>
          <div className="text-lg font-medium">
            {isConnected ? '✅ Connected' : '❌ Disconnected'}
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Recording Status</h3>
          <div className="text-lg font-medium">
            {isRecording ? '🎙️ Recording' : '⏸️ Stopped'}
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Audio Level</h3>
          <div className="text-lg font-medium">
            {Math.round(audioLevel)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-100"
              style={{ width: `${audioLevel}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <button
          onClick={testWebSocketConnection}
          disabled={!wsUrl || isConnected}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          🔌 Test WebSocket
        </button>
        
        <button
          onClick={testMicrophone}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          🎤 Test Microphone
        </button>
        
        <button
          onClick={startRecording}
          disabled={!isConnected || isRecording}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          🎙️ Start Recording
        </button>
        
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          ⏹️ Stop Recording
        </button>
        
        <button
          onClick={disconnectWebSocket}
          disabled={!isConnected}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          🔌 Disconnect
        </button>
        
        <button
          onClick={clearMessages}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
        >
          🗑️ Clear Log
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-800 mb-2">Error</h3>
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Message Log */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Message Log</h3>
          <span className="text-sm text-gray-600">{messages.length} messages</span>
        </div>
        <div className="bg-white rounded border p-3 h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No messages yet. Start testing to see activity.</div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className={`text-sm p-2 rounded ${
                  msg.type === 'success' ? 'bg-green-100 text-green-800' :
                  msg.type === 'error' ? 'bg-red-100 text-red-800' :
                  msg.type === 'sent' ? 'bg-blue-100 text-blue-800' :
                  msg.type === 'received' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  <span className="font-mono text-xs text-gray-600">[{msg.timestamp}]</span>
                  <span className="ml-2">{msg.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Testing Instructions</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <div>1. <strong>Test WebSocket:</strong> Verify connection to backend WebSocket endpoint</div>
          <div>2. <strong>Test Microphone:</strong> Check microphone access and audio levels</div>
          <div>3. <strong>Start Recording:</strong> Begin streaming audio data via WebSocket</div>
          <div>4. <strong>Monitor Log:</strong> Watch for incoming messages from the backend</div>
          <div>5. <strong>Stop Recording:</strong> End the audio stream</div>
        </div>
      </div>
    </div>
  );
} 