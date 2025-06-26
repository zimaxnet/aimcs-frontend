import React, { useState, useEffect } from 'react';
import { checkBackendHealth, getApiInfo, testBackend, getModels, sendChatMessage } from '../services/backendApi';

const BackendTest = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [apiInfo, setApiInfo] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [models, setModels] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auto-check health on component mount
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    const result = await checkBackendHealth();
    setHealthStatus(result);
    setLoading(false);
  };

  const getApiInformation = async () => {
    setLoading(true);
    const result = await getApiInfo();
    setApiInfo(result);
    setLoading(false);
  };

  const runTest = async () => {
    setLoading(true);
    const result = await testBackend();
    setTestResult(result);
    setLoading(false);
  };

  const fetchModels = async () => {
    setLoading(true);
    const result = await getModels();
    setModels(result);
    setLoading(false);
  };

  const sendChat = async () => {
    if (!chatMessage.trim()) return;
    
    setLoading(true);
    const result = await sendChatMessage(chatMessage);
    setChatResponse(result);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Backend API Test</h2>
        <p className="text-purple-100">
          Test connectivity and functionality of the AIMCS Backend API
        </p>
      </div>

      {/* Health Check */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Health Check</h3>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Health'}
          </button>
        </div>
        {healthStatus && (
          <div className={`p-4 rounded ${healthStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              {healthStatus.success ? (
                <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
              ) : (
                <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
              )}
              <div>
                <p className={`font-medium ${healthStatus.success ? 'text-green-800' : 'text-red-800'}`}>
                  {healthStatus.success ? 'Backend is healthy' : 'Backend health check failed'}
                </p>
                {healthStatus.data && (
                  <pre className="text-sm text-gray-600 mt-2">
                    {JSON.stringify(healthStatus.data, null, 2)}
                  </pre>
                )}
                {healthStatus.error && (
                  <p className="text-sm text-red-600 mt-1">{healthStatus.error}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">API Information</h3>
          <button
            onClick={getApiInformation}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Get API Info'}
          </button>
        </div>
        {apiInfo && (
          <div className={`p-4 rounded ${apiInfo.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <pre className="text-sm text-gray-600">
              {JSON.stringify(apiInfo.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Test Endpoint */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Test Endpoint</h3>
          <button
            onClick={runTest}
            disabled={loading}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Run Test'}
          </button>
        </div>
        {testResult && (
          <div className={`p-4 rounded ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <pre className="text-sm text-gray-600">
              {JSON.stringify(testResult.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Models */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Available Models</h3>
          <button
            onClick={fetchModels}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Get Models'}
          </button>
        </div>
        {models && (
          <div className={`p-4 rounded ${models.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <pre className="text-sm text-gray-600">
              {JSON.stringify(models.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Chat Test */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Chat Test</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Enter a test message..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={sendChat}
            disabled={loading || !chatMessage.trim()}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
          {chatResponse && (
            <div className={`p-4 rounded ${chatResponse.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <pre className="text-sm text-gray-600">
                {JSON.stringify(chatResponse.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackendTest; 