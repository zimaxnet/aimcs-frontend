import React, { useState, useEffect, useRef } from 'react';

export default function AudioWebSocketTest() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [backendUrl, setBackendUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Environment variables
  const backendApiUrl = import.meta.env.VITE_BACKEND_API_URL;

  useEffect(() => {
    // Set backend URL
    if (backendApiUrl) {
      setBackendUrl(backendApiUrl);
    }
  }, [backendApiUrl]);

  // Test HTTP API connection
  const testHttpConnection = async () => {
    if (!backendUrl) {
      setError('Backend URL not configured');
      return;
    }

    try {
      setError('');
      addMessage('🔌 Testing HTTP API connection...', 'info');

      const response = await fetch(`${backendUrl}/health`);
      
      if (response.ok) {
        const data = await response.json();
        addMessage('✅ HTTP API connected successfully!', 'success');
        addMessage(`📊 Backend Status: ${JSON.stringify(data)}`, 'received');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (err) {
      setError(`HTTP API error: ${err.message || 'Connection failed'}`);
      addMessage('❌ HTTP API connection failed', 'error');
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

  // Start recording and processing
  const startRecording = async () => {
    if (!backendUrl) {
      setError('Backend URL not configured. Please test connection first.');
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

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          // Convert blob to base64 for HTTP transmission
          const reader = new FileReader();
          reader.onload = async () => {
            const audioData = reader.result.split(',')[1]; // Remove data URL prefix
            
            try {
              setLoading(true);
              addMessage('🔄 Processing audio...', 'info');
              
              const response = await fetch(`${backendUrl}/api/audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioData: audioData })
              });

              if (response.ok) {
                const data = await response.json();
                addMessage(`📨 AI Response: ${data.message}`, 'received');
                
                // Optionally test TTS
                if (data.message) {
                  await testTTS(data.message);
                }
              } else {
                const errorText = await response.text();
                addMessage(`❌ Audio processing failed: ${errorText}`, 'error');
              }
            } catch (err) {
              addMessage(`❌ Audio processing error: ${err.message}`, 'error');
            } finally {
              setLoading(false);
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(2000); // Send data every 2 seconds
      setIsRecording(true);
      addMessage('✅ Recording started!', 'success');

    } catch (err) {
      setError(`Recording failed: ${err.message}`);
      addMessage('❌ Recording failed', 'error');
    }
  };

  // Test TTS functionality
  const testTTS = async (text) => {
    try {
      addMessage('🔊 Testing TTS...', 'info');
      
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
        addMessage('✅ TTS audio generated successfully!', 'success');
        
        // Play the audio
        if (data.audioData) {
          playAudioResponse(data.audioData);
        }
      } else {
        addMessage('❌ TTS failed', 'error');
      }
    } catch (err) {
      addMessage(`❌ TTS error: ${err.message}`, 'error');
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
        addMessage('❌ Error playing audio response', 'error');
      });
      
    } catch (error) {
      console.error('Error processing audio response:', error);
      addMessage('❌ Error processing audio response', 'error');
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
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
        🎤 Audio HTTP API Test
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
          <h3 className="font-semibold mb-2">API Status</h3>
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
          onClick={testHttpConnection}
          disabled={!backendUrl || loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          🔌 Test HTTP API
        </button>
        
        <button
          onClick={testMicrophone}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          🎤 Test Microphone
        </button>
        
        <button
          onClick={startRecording}
          disabled={!backendUrl || isRecording || loading}
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
          <div>1. <strong>Test HTTP API:</strong> Verify connection to backend HTTP endpoints</div>
          <div>2. <strong>Test Microphone:</strong> Check microphone access and audio levels</div>
          <div>3. <strong>Start Recording:</strong> Begin sending audio data via HTTP POST</div>
          <div>4. <strong>Monitor Log:</strong> Watch for AI responses and TTS audio</div>
          <div>5. <strong>Stop Recording:</strong> End the audio stream</div>
        </div>
      </div>
    </div>
  );
} 