import React, { useState, useEffect } from 'react';
import { testModelConnection, sendModelRequest, getModelInfo, testRealtimeCapabilities, discoverModels } from '../services/modelApi';

function ModelTest() {
  const [connectionStatus, setConnectionStatus] = useState('Not tested');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState('Not tested');
  const [error, setError] = useState(null);
  const [discoveredModels, setDiscoveredModels] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini-realtime-preview');

  // Environment variables check
  useEffect(() => {
    console.log('Environment variables check:');
    console.log('VITE_MODEL_API_URL:', import.meta.env.VITE_MODEL_API_URL);
    console.log('VITE_MODEL_API_KEY:', import.meta.env.VITE_MODEL_API_KEY ? '***SET***' : 'NOT SET');
    console.log('VITE_MODEL_NAME:', import.meta.env.VITE_MODEL_NAME);
  }, []);

  const handleDiscoverModels = async () => {
    setLoading(true);
    setError(null);
    setDiscoveredModels(null);
    
    try {
      const result = await discoverModels();
      setDiscoveredModels(result);
      console.log('Model discovery successful:', result);
    } catch (error) {
      setError(error.message);
      console.error('Model discovery failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionTest = async () => {
    setLoading(true);
    setError(null);
    setConnectionStatus('Testing...');
    
    try {
      const result = await testModelConnection();
      setConnectionStatus('✅ Connected');
      setModelInfo(result);
      console.log('Connection test successful:', result);
    } catch (error) {
      setConnectionStatus('❌ Failed');
      setError(error.message);
      console.error('Connection test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    setResponse('');
    
    try {
      const result = await sendModelRequest(prompt);
      const responseText = result.choices?.[0]?.message?.content || 'No response received';
      setResponse(responseText);
      console.log('Model response:', result);
    } catch (error) {
      setResponse('');
      setError(error.message);
      console.error('Model request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRealtimeTest = async () => {
    setLoading(true);
    setError(null);
    setRealtimeStatus('Testing...');
    
    try {
      const result = await testRealtimeCapabilities();
      if (result.success) {
        setRealtimeStatus('✅ Realtime Supported');
      } else {
        setRealtimeStatus('⚠️ Realtime Not Available');
      }
      console.log('Realtime test result:', result);
    } catch (error) {
      setRealtimeStatus('❌ Realtime Test Failed');
      setError(error.message);
      console.error('Realtime test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetModelInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const info = await getModelInfo();
      setModelInfo(info);
      console.log('Model info:', info);
    } catch (error) {
      setError(error.message);
      console.error('Failed to get model info:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Azure AI Foundry Model Test</h1>
      
      {/* Environment Variables Display */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="font-semibold text-blue-800 mb-2">Configuration:</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          <div>
            <strong>API URL:</strong> {import.meta.env.VITE_MODEL_API_URL || 'https://ai-derek9189ai830400194680.services.ai.azure.com'}
          </div>
          <div>
            <strong>API Key:</strong> {import.meta.env.VITE_MODEL_API_KEY ? '***SET***' : 'B2nqRP8jzilVgdtE1cj9LEXgyhuJVQtsWOLM4NoRRjkZot0xJq9wJQQJ99BFACHYHv6XJ3w3AAAAACOG1nse'}
          </div>
          <div>
            <strong>Model:</strong> {import.meta.env.VITE_MODEL_NAME || 'gpt-4o-mini-audio-preview'}
          </div>
        </div>
      </div>

      {/* Model Discovery */}
      <div className="mb-6">
        <button 
          onClick={handleDiscoverModels} 
          disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors mb-4"
        >
          🔍 Discover Available Models
        </button>

        {discoveredModels && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">Available Models/Deployments:</h3>
            <pre className="text-sm bg-white p-2 rounded border overflow-auto max-h-60">
              {JSON.stringify(discoveredModels, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <button 
            onClick={handleConnectionTest} 
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Test Connection
          </button>
          <div className="text-sm">
            Status: <span className={connectionStatus.includes('✅') ? 'text-green-600' : connectionStatus.includes('❌') ? 'text-red-600' : 'text-gray-600'}>
              {connectionStatus}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <button 
            onClick={handleRealtimeTest} 
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Test Realtime
          </button>
          <div className="text-sm">
            Status: <span className={realtimeStatus.includes('✅') ? 'text-green-600' : realtimeStatus.includes('❌') ? 'text-red-600' : 'text-gray-600'}>
              {realtimeStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Model Info */}
      {modelInfo && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">Model Information:</h3>
          <pre className="text-sm bg-white p-2 rounded border overflow-auto">
            {JSON.stringify(modelInfo, null, 2)}
          </pre>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
          <p className="text-red-700">{error}</p>
          <div className="mt-2 text-sm text-red-600">
            <p><strong>Troubleshooting:</strong></p>
            <ul className="list-disc list-inside mt-1">
              <li>Check if the API key is correct and has proper permissions</li>
              <li>Verify the model deployment exists and is accessible</li>
              <li>Ensure the endpoint URL is correct for Azure AI Foundry</li>
              <li>Check browser console for detailed error information</li>
              <li>Try discovering available models first</li>
            </ul>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Chat Test</h2>
        
        <div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        <div className="flex space-x-2">
          <button 
            onClick={handleSendPrompt} 
            disabled={loading || !prompt.trim()}
            className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Sending...' : 'Send Prompt'}
          </button>
          
          <button 
            onClick={handleGetModelInfo} 
            disabled={loading}
            className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Get Model Info
          </button>
        </div>

        {response && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">Response:</h4>
            <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
              {response}
            </div>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-center">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelTest; 