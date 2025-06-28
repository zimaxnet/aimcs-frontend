import React, { useState, useRef, useEffect } from 'react';

export default function MainPage() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionMode, setConnectionMode] = useState('http'); // 'http' or 'websocket'
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const messagesEndRef = useRef(null);
  const audioChunksRef = useRef([]);
  const websocketRef = useRef(null);
  const streamRef = useRef(null);

  // Environment variables
  const backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'https://aimcs-backend-eastus2.thankfulbay-fde9fe29.eastus2.azurecontainerapps.io';
  
  // Debug logging
  console.log('🔍 Backend URL Debug:', {
    envVar: import.meta.env.VITE_BACKEND_API_URL,
    finalUrl: backendUrl,
    hasEnvVar: !!import.meta.env.VITE_BACKEND_API_URL
  });

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket connection management
  useEffect(() => {
    if (connectionMode === 'websocket') {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [connectionMode]);

  const connectWebSocket = () => {
    try {
      const wsUrl = backendUrl.replace('https://', 'wss://');
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        console.log('🔌 WebSocket connected');
        setIsWebSocketConnected(true);
        addMessage('System', 'Connected to real-time streaming mode', 'system');
      };
      
      websocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      websocketRef.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsWebSocketConnected(false);
        addMessage('System', 'Disconnected from streaming mode', 'system');
      };
      
      websocketRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsWebSocketConnected(false);
        addMessage('System', 'WebSocket connection error', 'error');
      };
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error);
      addMessage('System', 'Failed to connect to streaming mode', 'error');
    }
  };

  const disconnectWebSocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    setIsWebSocketConnected(false);
    setIsStreaming(false);
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'connection':
        console.log('✅ WebSocket connection established');
        break;
      case 'audio_response':
      case 'text_response':
        addMessage('AI', data.message, 'ai', data.audioData, data.audioFormat);
        break;
      case 'error':
        addMessage('System', data.message, 'error');
        break;
      case 'pong':
        console.log('🏓 WebSocket ping-pong');
        break;
      default:
        console.log('📨 Unknown WebSocket message type:', data.type);
    }
  };

  // Send text message via HTTP API
  const sendTextMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage('You', userMessage, 'user');

    if (connectionMode === 'websocket' && isWebSocketConnected) {
      // Send via WebSocket
      websocketRef.current.send(JSON.stringify({
        type: 'text_message',
        text: userMessage
      }));
    } else {
      // Send via HTTP
      setIsLoading(true);
      try {
        const response = await fetch(`${backendUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: userMessage }),
        });

        if (response.ok) {
          const data = await response.json();
          addMessage('AI', data.message, 'ai', data.audioData, data.audioFormat);
        } else {
          addMessage('System', 'Failed to send message', 'error');
        }
      } catch (error) {
        console.error('❌ Error sending message:', error);
        addMessage('System', 'Error sending message', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startStreaming = async () => {
    if (connectionMode !== 'websocket' || !isWebSocketConnected) {
      addMessage('System', 'Please enable WebSocket mode for streaming', 'error');
      return;
    }

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsStreaming(true);
      addMessage('System', 'Started real-time audio streaming - just talk!', 'system');

      // Create MediaRecorder for streaming
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Convert to base64 and send via WebSocket
          const reader = new FileReader();
          reader.onload = () => {
            const base64Audio = reader.result.split(',')[1];
            if (websocketRef.current && isWebSocketConnected) {
              websocketRef.current.send(JSON.stringify({
                type: 'audio_chunk',
                audioData: base64Audio,
                audioFormat: 'webm;codecs=opus',
                isFinal: false
              }));
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(1000); // Send chunks every second
      console.log('🎤 Started audio streaming');

    } catch (error) {
      console.error('❌ Error starting streaming:', error);
      addMessage('System', 'Failed to start audio streaming', 'error');
    }
  };

  const stopStreaming = () => {
    if (mediaRecorderRef.current && isStreaming) {
      mediaRecorderRef.current.stop();
      setIsStreaming(false);
      addMessage('System', 'Stopped audio streaming', 'system');
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    if (connectionMode === 'websocket') {
      startStreaming();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      addMessage('System', 'Recording started...', 'system');
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      addMessage('System', 'Failed to start recording', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      addMessage('System', 'Processing audio...', 'system');
      
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const processAudio = async (audioBlob) => {
    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Audio = reader.result.split(',')[1];
        const audioFormat = audioBlob.type;
        
        const response = await fetch(`${backendUrl}/api/audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioData: base64Audio,
            audioFormat: audioFormat
          }),
        });

        if (response.ok) {
          const data = await response.json();
          addMessage('AI', data.message, 'ai', data.audioData, data.audioFormat);
        } else {
          addMessage('System', 'Audio processing failed', 'error');
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('❌ Error processing audio:', error);
      addMessage('System', 'Error processing audio', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (audioData, audioFormat) => {
    if (!audioData) return;
    
    const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], {
      type: audioFormat || 'audio/mp3'
    });
    
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
    
    // Clean up URL after playing
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
  };

  // Add message to chat
  const addMessage = (sender, message, type = 'user', audioData = null, audioFormat = null) => {
    const newMessage = {
      id: Date.now(),
      sender,
      message,
      type,
      timestamp: new Date().toISOString(),
      audioData,
      audioFormat
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-400 mb-2">AIMCS</h1>
          <p className="text-gray-300">AI Multimodal Customer System</p>
          
          {/* Connection Mode Toggle */}
          <div className="mt-4 flex justify-center items-center space-x-4">
            <span className="text-sm text-gray-400">Connection Mode:</span>
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setConnectionMode('http')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  connectionMode === 'http' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                HTTP
              </button>
              <button
                onClick={() => setConnectionMode('websocket')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  connectionMode === 'websocket' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                WebSocket
              </button>
            </div>
            
            {/* Connection Status */}
            {connectionMode === 'websocket' && (
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isWebSocketConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-gray-400">
                  {isWebSocketConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <p>Start a conversation with text or voice!</p>
              {connectionMode === 'websocket' && (
                <p className="text-sm mt-2">WebSocket mode enables real-time streaming</p>
              )}
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`mb-4 ${
                msg.type === 'ai' ? 'text-left' : 
                msg.type === 'user' ? 'text-right' : 'text-center'
              }`}>
                <div className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.type === 'ai' ? 'bg-blue-600 text-white' :
                  msg.type === 'user' ? 'bg-green-600 text-white' :
                  msg.type === 'system' ? 'bg-gray-600 text-gray-200' :
                  msg.type === 'error' ? 'bg-red-600 text-white' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  <div className="text-xs opacity-75 mb-1">{msg.sender}</div>
                  <div>{msg.message}</div>
                  {msg.audioData && (
                    <button
                      onClick={() => playAudio(msg.audioData, msg.audioFormat)}
                      className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      🔊 Play Audio
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Controls */}
        <div className="flex flex-col space-y-4">
          {/* Text Input */}
          <div className="flex space-x-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 resize-none"
              rows="2"
              disabled={isLoading}
            />
            <button
              onClick={sendTextMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Send
            </button>
          </div>

          {/* Audio Controls */}
          <div className="flex justify-center space-x-4">
            {connectionMode === 'websocket' ? (
              // WebSocket Streaming Controls
              <button
                onClick={isStreaming ? stopStreaming : startStreaming}
                disabled={!isWebSocketConnected}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isStreaming
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } ${!isWebSocketConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isStreaming ? '🛑 Stop Streaming' : '🎤 Start Streaming'}
              </button>
            ) : (
              // HTTP Recording Controls
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRecording ? '🛑 Stop Recording' : '🎤 Start Recording'}
              </button>
            )}
          </div>

          {/* Status */}
          {(isLoading || isRecording || isStreaming) && (
            <div className="text-center text-gray-400">
              {isLoading && '🔄 Processing...'}
              {isRecording && '🎤 Recording...'}
              {isStreaming && '🔴 Live Streaming...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
