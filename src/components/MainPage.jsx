import React, { useState, useRef, useEffect } from 'react';

export default function MainPage() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const messagesEndRef = useRef(null);

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

  // Send text message via HTTP API
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage(userMessage, 'user');

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
        
        // Optionally convert AI response to speech
        if (data.message) {
          await convertToSpeech(data.message);
        }
      } else {
        addMessage('Sorry, I could not process your message.', 'error');
      }
    } catch (err) {
      console.error('Chat error:', err);
      addMessage('Connection error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Convert text to speech
  const convertToSpeech = async (text) => {
    try {
      const response = await fetch(`${backendUrl}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text,
          voice: 'en-US-JennyNeural',
          speed: 1.0
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioData) {
          playAudioResponse(data.audioData);
        }
      }
    } catch (err) {
      console.error('TTS error:', err);
      // Don't show error to user, TTS is optional
    }
  };

  // Start recording audio
  const startRecording = async () => {
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

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          // Convert blob to base64 for HTTP transmission
          const reader = new FileReader();
          reader.onload = async () => {
            const audioData = reader.result.split(',')[1]; // Remove data URL prefix
            
            try {
              setLoading(true);
              const response = await fetch(`${backendUrl}/api/audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioData: audioData })
              });

              if (response.ok) {
                const data = await response.json();
                addMessage(data.message, 'ai');
                
                // Optionally convert AI response to speech
                if (data.message) {
                  await convertToSpeech(data.message);
                }
              } else {
                addMessage('Sorry, I could not process your audio.', 'error');
              }
            } catch (err) {
              console.error('Audio processing error:', err);
              addMessage('Audio processing failed. Please try again.', 'error');
            } finally {
              setLoading(false);
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(1000); // Send data every 1 second
      setIsRecording(true);
      addMessage('🎤 Recording...', 'system');

    } catch (err) {
      setError(`Microphone access failed: ${err.message}`);
      addMessage('❌ Microphone access denied', 'error');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      addMessage('⏹️ Recording stopped', 'system');
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

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
        🎤 AIMCS Voice & Text Chat
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
            <span className="w-3 h-3 rounded-full mr-2 bg-green-500"></span>
            <span className="font-medium">Audio Processing:</span>
            <span className="ml-2 text-gray-600">✅ HTTP-Based</span>
          </div>
        </div>
        {backendUrl && (
          <div className="mt-2 text-xs text-gray-600">
            <strong>Backend URL:</strong> {backendUrl}
          </div>
        )}
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Connection Status</h3>
          <div className="text-lg font-medium">
            ✅ HTTP API Ready
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Recording Status</h3>
          <div className="text-lg font-medium">
            {isRecording ? '🎙️ Recording' : '⏸️ Stopped'}
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Processing</h3>
          <div className="text-lg font-medium">
            {loading ? '🔄 Processing...' : '✅ Ready'}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <button
          onClick={startRecording}
          disabled={isRecording || loading}
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
          onClick={clearMessages}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
        >
          🗑️ Clear Chat
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-800 mb-2">Error</h3>
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Chat Messages</h3>
          <span className="text-sm text-gray-600">{messages.length} messages</span>
        </div>
        <div className="bg-white rounded border p-3 h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Start typing or recording to begin chatting with AI!
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.type === 'user' ? 'bg-blue-500 text-white' :
                    msg.type === 'ai' ? 'bg-green-500 text-white' :
                    msg.type === 'system' ? 'bg-gray-500 text-white' :
                    msg.type === 'error' ? 'bg-red-500 text-white' :
                    'bg-gray-300 text-gray-800'
                  }`}>
                    <div className="text-sm">{msg.message}</div>
                    <div className="text-xs opacity-75 mt-1">{msg.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Text Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here..."
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!inputMessage.trim() || loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Send
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">How to Use</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <div>1. <strong>Text Chat:</strong> Type your message and press Send or Enter</div>
          <div>2. <strong>Voice Chat:</strong> Click "Start Recording" and speak into your microphone</div>
          <div>3. <strong>AI Responses:</strong> AI will respond with text and optionally play audio</div>
          <div>4. <strong>Stop Recording:</strong> Click "Stop Recording" when you're done speaking</div>
        </div>
      </div>
    </div>
  );
}
