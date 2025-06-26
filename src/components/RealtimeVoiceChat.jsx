import React, { useState, useRef, useEffect } from 'react';
import { Settings, AlertCircle, Phone, Mic, MicOff, Info, Globe } from 'lucide-react';

// Import Azure service with error handling
let azureRealtimeService = null;
/*
try {
  azureRealtimeService = require('../services/azureRealtimeService').default;
} catch (error) {
  console.warn('Azure service import failed:', error);
  azureRealtimeService = {
    initializeRealtimeSession: () => Promise.reject(new Error('Azure service not available')),
    sendAudioChunk: () => Promise.reject(new Error('Azure service not available'))
  };
}
*/
azureRealtimeService = {
  initializeRealtimeSession: () => Promise.reject(new Error('Azure service temporarily disabled')),
  sendAudioChunk: () => Promise.reject(new Error('Azure service temporarily disabled'))
};

// Test basic Azure OpenAI connection
async function testBasicAzureOpenAI(setWsStatus) {
  try {
    setWsStatus('Testing basic Azure OpenAI connection...');
    
    const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || 'https://aimcs-foundry.cognitiveservices.azure.com/';
    const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-audio-preview';
    const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
    
    if (!apiKey) {
      setWsStatus('❌ API Key not found');
      return;
    }
    
    // Use the latest API version for Azure OpenAI
    const apiUrl = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=2024-10-01-preview`;
    setWsStatus('Testing URL: ' + apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Hello, can you hear me?'
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      setWsStatus(`✅ Basic API working! Response: ${data.choices[0].message.content}`);
    } else {
      const errorText = await response.text();
      setWsStatus(`❌ Basic API failed: ${response.status} ${errorText}`);
      
      // If 401, try with Authorization header instead
      if (response.status === 401) {
        setWsStatus('Trying with Authorization header...');
        const authResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: 'Hello, can you hear me?'
              }
            ],
            max_tokens: 50,
            temperature: 0.7
          })
        });
        
        if (authResponse.ok) {
          const authData = await authResponse.json();
          setWsStatus(`✅ Basic API working with Authorization header! Response: ${authData.choices[0].message.content}`);
        } else {
          const authErrorText = await authResponse.text();
          setWsStatus(`❌ Both authentication methods failed. API Key might be invalid or expired.`);
        }
      }
    }
    
  } catch (err) {
    setWsStatus('❌ Basic API exception: ' + err.message);
  }
}

// Test Azure OpenAI Realtime WebSocket connection
function testAzureRealtimeWebSocket(setWsStatus) {
  try {
    const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || 'https://aimcs-foundry.cognitiveservices.azure.com/';
    const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-audio-preview';
    const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
    
    if (!apiKey) {
      setWsStatus('❌ API Key not found. Please set VITE_AZURE_OPENAI_API_KEY in your .env file');
      return;
    }
    
    // Convert HTTPS endpoint to WSS for WebSocket
    const wsEndpoint = endpoint.replace('https://', 'wss://');
    
    // Try the latest Azure OpenAI Realtime WebSocket endpoints
    const endpoints = [
      // Latest format for Azure OpenAI Realtime
      `${wsEndpoint}openai/deployments/${deployment}/realtime/audio?api-version=2024-10-01-preview&api-key=${apiKey}`,
      // Alternative format
      `${wsEndpoint}openai/realtime?api-version=2024-10-01-preview&deployment=${deployment}&api-key=${apiKey}`,
      // Legacy format (if still supported)
      `${wsEndpoint}openai/deployments/${deployment}/audio/ws?api-version=2024-10-01-preview&api-key=${apiKey}`
    ];
    
    let currentEndpointIndex = 0;
    
    function tryNextEndpoint() {
      if (currentEndpointIndex >= endpoints.length) {
        setWsStatus('❌ All WebSocket endpoints failed. Realtime API might not be available.');
        return;
      }
      
      const wsUrl = endpoints[currentEndpointIndex];
      setWsStatus(`Testing WebSocket endpoint ${currentEndpointIndex + 1}: ${wsUrl.substring(0, 50)}...`);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setWsStatus(`✅ WebSocket connected to endpoint ${currentEndpointIndex + 1}!`);
        ws.close();
      };
      
      ws.onerror = (error) => {
        console.log(`WebSocket endpoint ${currentEndpointIndex + 1} failed:`, error);
        currentEndpointIndex++;
        setTimeout(tryNextEndpoint, 1000);
      };
      
      ws.onclose = () => {
        console.log(`WebSocket endpoint ${currentEndpointIndex + 1} closed`);
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          currentEndpointIndex++;
          setTimeout(tryNextEndpoint, 1000);
        }
      }, 5000);
    }
    
    tryNextEndpoint();
    
  } catch (err) {
    setWsStatus('❌ WebSocket test exception: ' + err.message);
  }
}

export default function RealtimeVoiceChat({ user }) {
  const [showSetup, setShowSetup] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState('');
  const [micStatus, setMicStatus] = useState('Not tested');
  const [showAzureInfo, setShowAzureInfo] = useState(false);
  const [wsStatus, setWsStatus] = useState('Not tested');
  
  const mediaRecorderRef = useRef(null);
  const websocketRef = useRef(null);
  const audioContextRef = useRef(null);

  console.log('RealtimeVoiceChat component rendering...');

  const startVoiceChat = async () => {
    try {
      setError('');
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create media recorder with optimal settings for Azure OpenAI
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000 // 16kHz for optimal speech recognition
      });

      // Get Azure OpenAI configuration
      const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || 'https://aimcs-foundry.cognitiveservices.azure.com/';
      const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'model-router';
      const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Azure OpenAI API key not configured');
      }

      // Convert HTTPS endpoint to WSS for WebSocket
      const wsEndpoint = endpoint.replace('https://', 'wss://');
      
      // Use the latest Azure OpenAI Realtime WebSocket endpoint
      const wsUrl = `${wsEndpoint}openai/deployments/${deployment}/realtime/audio?api-version=2024-10-01-preview&api-key=${apiKey}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      websocketRef.current = new WebSocket(wsUrl);

      websocketRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setIsRecording(true);
        
        // Start recording
        mediaRecorderRef.current.start(100); // 100ms chunks for real-time processing
        
        // Send initial configuration message
        websocketRef.current.send(JSON.stringify({
          type: 'configuration',
          messages: [{
            role: "system",
            content: "You are a helpful AI assistant. Respond naturally in conversation."
          }],
          stream: true
        }));
      };

      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          
          if (data.type === 'transcript') {
            setTranscript(data.text);
          } else if (data.type === 'response') {
            setAiResponse(prev => prev + data.content);
          } else if (data.choices && data.choices[0].delta.content) {
            setAiResponse(prev => prev + data.choices[0].delta.content);
          }
        } catch (parseError) {
          console.error('Error parsing WebSocket message:', parseError);
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error: ' + error.message);
        setIsConnected(false);
      };

      websocketRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsRecording(false);
      };

      // Handle audio data
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
          // Convert audio blob to base64 and send
          const reader = new FileReader();
          reader.onload = () => {
            const base64Audio = reader.result.split(',')[1];
            websocketRef.current.send(JSON.stringify({
              type: 'audio',
              audio: base64Audio,
              format: "webm",
              sample_rate: 16000
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };

    } catch (err) {
      console.error('Error starting voice chat:', err);
      setError('Failed to start voice chat: ' + err.message);
    }
  };

  const stopVoiceChat = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsRecording(false);
    setIsConnected(false);
  };

  useEffect(() => {
    return () => {
      stopVoiceChat();
    };
  }, []);

  const testMicrophone = async () => {
    try {
      setMicStatus('Testing microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      setIsRecording(true);
      setMicStatus('Microphone working!');
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setMicStatus('Microphone test completed');
      }, 3000);
    } catch (err) {
      setMicStatus('❌ Microphone error: ' + err.message);
    }
  };

  if (showSetup) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Settings className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Azure OpenAI Setup
          </h2>
          <p className="text-gray-600">
            Configure your Azure OpenAI service to enable real-time voice chat
          </p>
        </div>

        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">Configuration Required</span>
          </div>
          <p className="text-sm mt-1">
            Please set the following environment variables:
          </p>
          <ul className="text-xs mt-2 list-disc list-inside">
            <li>VITE_AZURE_OPENAI_ENDPOINT</li>
            <li>VITE_AZURE_OPENAI_API_KEY</li>
            <li>VITE_AZURE_OPENAI_DEPLOYMENT</li>
          </ul>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setShowAzureInfo(!showAzureInfo)}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center"
          >
            <Info className="w-4 h-4 mr-2" />
            Check Azure Configuration
          </button>
          {showAzureInfo && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              <p className="text-sm">
                <strong>Environment variables found:</strong>
              </p>
              <ul className="text-xs mt-2 list-disc list-inside">
                <li>Endpoint: {import.meta.env.VITE_AZURE_OPENAI_ENDPOINT ? '✅ Set' : '❌ Missing'}</li>
                <li>API Key: {import.meta.env.VITE_AZURE_OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}</li>
                <li>Deployment: {import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT ? '✅ Set' : '❌ Missing'}</li>
              </ul>
            </div>
          )}
          <button
            onClick={() => testBasicAzureOpenAI(setWsStatus)}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center"
          >
            <Globe className="w-4 h-4 mr-2" />
            Test Basic Azure OpenAI API
          </button>
          <button
            onClick={() => testAzureRealtimeWebSocket(setWsStatus)}
            className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center"
          >
            <Globe className="w-4 h-4 mr-2" />
            Test Azure Realtime WebSocket
          </button>
          <div className="text-xs text-gray-700 bg-gray-100 rounded p-2 mt-2">
            WebSocket Status: {wsStatus}
          </div>
          <button
            onClick={testMicrophone}
            disabled={isRecording}
            className={`
              w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center
              ${isRecording 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
              }
            `}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Testing Microphone...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Test Microphone
              </>
            )}
          </button>
          <div className="text-xs text-gray-700 bg-gray-100 rounded p-2">
            Microphone Status: {micStatus}
          </div>
          <button
            onClick={() => setShowSetup(false)}
            className="w-full py-3 px-4 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
          >
            Start Voice Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full">
      <h2 className="text-2xl font-bold mb-4">🎤 Realtime Voice Chat</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-2">Signed in as: <span className="font-semibold">{user.email || user.emails?.[0]}</span></p>
        <p className="text-sm text-gray-500">Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        {!isRecording ? (
          <button
            onClick={startVoiceChat}
            className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-semibold text-lg"
          >
            🎤 Start Voice Chat
          </button>
        ) : (
          <button
            onClick={stopVoiceChat}
            className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 font-semibold text-lg"
          >
            ⏹️ Stop Voice Chat
          </button>
        )}
      </div>

      {isRecording && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded border">
            <h3 className="font-semibold mb-2">🎙️ Recording...</h3>
            <p className="text-sm text-gray-600">Speak into your microphone to chat with AI</p>
          </div>
          
          {transcript && (
            <div className="p-4 bg-gray-50 rounded border">
              <h3 className="font-semibold mb-2">You said:</h3>
              <p className="text-gray-700">{transcript}</p>
            </div>
          )}
          
          {aiResponse && (
            <div className="p-4 bg-green-50 rounded border">
              <h3 className="font-semibold mb-2">AI Response:</h3>
              <p className="text-gray-700">{aiResponse}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500">
        <p>Using latest Azure OpenAI Realtime API (2024-10-01-preview)</p>
        <p>Audio format: WebM with Opus codec, 16kHz sample rate</p>
      </div>
    </div>
  );
} 