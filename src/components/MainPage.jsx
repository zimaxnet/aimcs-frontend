import React, { useState, useRef, useEffect } from 'react';

export default function MainPage() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const websocketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Environment variables
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'wss://aimcs-backend.kindmoss-db398a44.eastus2.azurecontainerapps.io';

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to WebSocket
  const connectWebSocket = async () => {
    if (!backendUrl) {
      setError('Backend URL not configured');
      return;
    }

    try {
      const wsUrl = backendUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws/audio';
      
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError('');
        addMessage('System connected', 'system');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'chat_response':
              addMessage(data.message, 'ai');
              break;
            case 'speech_recognized':
              addMessage(`🎤 "${data.message}"`, 'speech');
              break;
            case 'speech_recognizing':
              // Update the last message if it's a partial recognition
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.type === 'speech') {
                  lastMessage.message = `🎤 "${data.message}" (recognizing...)`;
                } else {
                  newMessages.push({
                    id: Date.now(),
                    message: `🎤 "${data.message}" (recognizing...)`,
                    type: 'speech',
                    timestamp: new Date().toLocaleTimeString()
                  });
                }
                return newMessages;
              });
              break;
            case 'speech_response':
              // Play the AI's speech response
              playAudioResponse(data.audioData);
              addMessage(`🔊 "${data.message}"`, 'ai_speech');
              break;
            case 'audio_processing':
              addMessage('🎤 Processing audio...', 'system');
              break;
            case 'audio_stopped':
              addMessage('⏹️ Audio processing stopped', 'system');
              break;
            case 'connection':
              addMessage('Ready for voice and text chat', 'system');
              break;
            default:
              console.log('Received message:', data);
          }
        } catch (e) {
          console.log('Raw message:', event.data);
        }
      };

      ws.onerror = (error) => {
        setError(`Connection error: ${error.message}`);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        addMessage('Connection lost', 'system');
      };

    } catch (err) {
      setError(`WebSocket error: ${err.message}`);
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage(userMessage, 'user');

    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      // Send via WebSocket
      const chatMessage = {
        type: 'chat',
        message: userMessage,
        timestamp: new Date().toISOString()
      };
      websocketRef.current.send(JSON.stringify(chatMessage));
    } else {
      // Fallback to HTTP API
      try {
        setLoading(true);
        const response = await fetch(`${backendUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage })
        });

        if (response.ok) {
          const data = await response.json();
          addMessage(data.message, 'ai');
        } else {
          addMessage('Sorry, I could not process your message.', 'error');
        }
      } catch (err) {
        addMessage('Connection error. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Start recording audio
  const startRecording = async () => {
    if (!isConnected) {
      await connectWebSocket();
    }

    try {
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
          const reader = new FileReader();
          reader.onload = () => {
            const audioData = {
              type: 'audio',
              data: reader.result.split(',')[1],
              timestamp: new Date().toISOString()
            };
            websocketRef.current.send(JSON.stringify(audioData));
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      addMessage('🎤 Recording...', 'system');

    } catch (err) {
      setError(`Microphone access failed: ${err.message}`);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      addMessage('⏹️ Recording stopped', 'system');
      
      // Send stop_audio command to backend
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        const stopMessage = {
          type: 'stop_audio',
          timestamp: new Date().toISOString()
        };
        websocketRef.current.send(JSON.stringify(stopMessage));
      }
    }
  };

  // Add message to chat
  const addMessage = (message, type = 'user') => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  // Play audio response from AI
  const playAudioResponse = (audioData) => {
    try {
      // Convert base64 to blob
      const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], {
        type: 'audio/mp3'
      });
      
      // Create audio URL and play
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl); // Clean up
      };
      
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
      
    } catch (error) {
      console.error('Error processing audio response:', error);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Connect on component mount
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="text-center py-12">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          AI Multimodal Customer System
        </h1>
        <p className="text-xl text-gray-600">
          Talk or type to interact with AI
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 pb-6">
        {/* Chat Messages */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Start a conversation by typing a message or using the microphone
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.type === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : msg.type === 'ai'
                      ? 'bg-gray-200 text-gray-800'
                      : msg.type === 'ai_speech'
                      ? 'bg-purple-200 text-purple-800 border-2 border-purple-300'
                      : msg.type === 'speech'
                      ? 'bg-purple-100 text-purple-800'
                      : msg.type === 'system'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    <div className="text-sm">{msg.message}</div>
                    <div className="text-xs opacity-70 mt-1">{msg.timestamp}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex gap-4">
            {/* Microphone Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              className={`p-4 rounded-full text-white font-bold transition-all ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? '⏹️' : '🎤'}
            </button>

            {/* Text Input */}
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                disabled={loading}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-700 text-sm">{error}</div>
            </div>
          )}

          {/* Connection Status */}
          <div className="mt-4 text-sm text-gray-600">
            Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 bg-white border-t">
        <p className="text-gray-600">
          Developed by Zimax AI
        </p>
      </footer>
    </div>
  );
}
