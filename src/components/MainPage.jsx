import React, { useState, useEffect } from 'react';

export default function MainPage() {
  const [aiStatus, setAiStatus] = useState('Not tested');
  const [backendStatus, setBackendStatus] = useState('Not tested');
  const [aiResponse, setAiResponse] = useState('');
  const [backendResponse, setBackendResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Environment variables
  const aiEndpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
  const aiDeployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;
  const aiApiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
  const backendUrl = import.meta.env.VITE_BACKEND_API_URL;

  // Test AI Connection
  const testAI = async () => {
    setLoading(true);
    setError('');
    setAiResponse('');
    
    if (!aiEndpoint || !aiDeployment || !aiApiKey) {
      setAiStatus('❌ Missing environment variables');
      setError('AI environment variables are not configured');
      setLoading(false);
      return;
    }

    try {
      setAiStatus('Testing...');
      const url = `${aiEndpoint}openai/deployments/${aiDeployment}/chat/completions?api-version=2024-10-01-preview`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': aiApiKey,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello! Please respond with a simple greeting.' }],
          max_tokens: 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAiStatus('✅ Connected');
      setAiResponse(data.choices?.[0]?.message?.content || 'No response content');
    } catch (err) {
      setAiStatus('❌ Failed');
      setError(`AI Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test Backend Connection
  const testBackend = async () => {
    setLoading(true);
    setError('');
    setBackendResponse('');
    
    if (!backendUrl) {
      setBackendStatus('❌ Missing backend URL');
      setError('Backend URL is not configured');
      setLoading(false);
      return;
    }

    try {
      setBackendStatus('Testing...');
      const response = await fetch(`${backendUrl}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setBackendStatus('✅ Connected');
      setBackendResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setBackendStatus('❌ Failed');
      setError(`Backend Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test both connections
  const testAll = async () => {
    setLoading(true);
    setError('');
    setAiResponse('');
    setBackendResponse('');
    
    await Promise.all([testAI(), testBackend()]);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
        AIMCS - AI & Backend Connection Test
      </h1>
      
      {/* Environment Variables Status */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Configuration Status:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${aiEndpoint ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">AI Endpoint:</span>
            <span className="ml-2 text-gray-600">{aiEndpoint ? '✅ Set' : '❌ Missing'}</span>
          </div>
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${aiDeployment ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">AI Deployment:</span>
            <span className="ml-2 text-gray-600">{aiDeployment ? '✅ Set' : '❌ Missing'}</span>
          </div>
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${aiApiKey ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">AI API Key:</span>
            <span className="ml-2 text-gray-600">{aiApiKey ? '✅ Set' : '❌ Missing'}</span>
          </div>
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${backendUrl ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">Backend URL:</span>
            <span className="ml-2 text-gray-600">{backendUrl ? '✅ Set' : '❌ Missing'}</span>
          </div>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <button
          onClick={testAll}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Testing...' : 'Test All Connections'}
        </button>
        <button
          onClick={testAI}
          disabled={loading}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Test AI Only
        </button>
        <button
          onClick={testBackend}
          disabled={loading}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Test Backend Only
        </button>
      </div>

      {/* Status Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* AI Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">AI Connection Status</h3>
          <div className="text-lg font-medium mb-2">{aiStatus}</div>
          {aiResponse && (
            <div className="mt-3">
              <h4 className="font-medium text-green-700 mb-1">Response:</h4>
              <div className="bg-white p-3 rounded border text-sm text-gray-700">
                {aiResponse}
              </div>
            </div>
          )}
        </div>

        {/* Backend Status */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-800 mb-2">Backend Connection Status</h3>
          <div className="text-lg font-medium mb-2">{backendStatus}</div>
          {backendResponse && (
            <div className="mt-3">
              <h4 className="font-medium text-purple-700 mb-1">Response:</h4>
              <div className="bg-white p-3 rounded border text-sm text-gray-700 overflow-auto max-h-32">
                <pre>{backendResponse}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-800 mb-2">Error</h3>
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Environment Variables Debug */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Debug Information</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <div><strong>AI Endpoint:</strong> {aiEndpoint || 'Not set'}</div>
          <div><strong>AI Deployment:</strong> {aiDeployment || 'Not set'}</div>
          <div><strong>AI API Key:</strong> {aiApiKey ? '***SET***' : 'Not set'}</div>
          <div><strong>Backend URL:</strong> {backendUrl || 'Not set'}</div>
        </div>
      </div>
    </div>
  );
} // Force rebuild Thu Jun 26 20:18:52 MST 2025
