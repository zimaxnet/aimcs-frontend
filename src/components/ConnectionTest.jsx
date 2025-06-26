import React, { useState } from 'react';
// import azureRealtimeService from '../services/azureRealtimeService'; // Temporarily disabled

const ConnectionTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testType, setTestType] = useState('basic');

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      console.log('Testing Azure OpenAI connection...');
      const result = await azureRealtimeService.testBasicConnection();
      setTestResult(result);
      console.log('Test result:', result);
    } catch (err) {
      setError(err.message);
      console.error('Connection test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const testTextMessage = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      console.log('Testing text message...');
      const response = await azureRealtimeService.sendTextMessage('Hello! Can you confirm the connection is working?');
      setTestResult({
        success: true,
        response: response,
        type: 'text_message'
      });
      console.log('Text message response:', response);
    } catch (err) {
      setError(err.message);
      console.error('Text message test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const testRealtimeSession = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      console.log('Testing realtime session initialization...');
      const result = await azureRealtimeService.initializeRealtimeSession();
      setTestResult({
        success: true,
        response: result,
        type: 'realtime_session'
      });
      console.log('Realtime session result:', result);
    } catch (err) {
      setError(err.message);
      console.error('Realtime session test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const runTest = () => {
    switch (testType) {
      case 'basic':
        return testConnection();
      case 'text':
        return testTextMessage();
      case 'realtime':
        return testRealtimeSession();
      default:
        return testConnection();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Azure OpenAI Connection Test</h1>
      
      <div className="space-y-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="font-semibold text-blue-800 mb-2">Connection Details:</h2>
          <p className="text-sm text-blue-700">
            <strong>Endpoint:</strong> https://aimcs-resource.cognitiveservices.azure.com
          </p>
          <p className="text-sm text-blue-700">
            <strong>Deployment:</strong> gpt-4o-mini-realtime-preview
          </p>
          <p className="text-sm text-blue-700">
            <strong>API Key:</strong> 9bgHRUMvrxKNLkJBx92DYjN4WiGxMzXKqF9faexcMcmjOe1KdYDhJQQJ99BFACMsfrFXJ3w3AAAAACOG0Tsg
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex space-x-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="basic"
              checked={testType === 'basic'}
              onChange={(e) => setTestType(e.target.value)}
              className="mr-2"
            />
            Basic Connection
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="text"
              checked={testType === 'text'}
              onChange={(e) => setTestType(e.target.value)}
              className="mr-2"
            />
            Text Message
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="realtime"
              checked={testType === 'realtime'}
              onChange={(e) => setTestType(e.target.value)}
              className="mr-2"
            />
            Realtime Session
          </label>
        </div>

        <button
          onClick={runTest}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Testing...' : `Run ${testType} Test`}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
          <p className="text-red-700">{error}</p>
          <div className="mt-2 text-sm text-red-600">
            <p><strong>Possible solutions:</strong></p>
            <ul className="list-disc list-inside mt-1">
              <li>Check if the API key is correct</li>
              <li>Verify the deployment name exists</li>
              <li>Ensure the endpoint URL is correct</li>
              <li>Check if you have proper permissions</li>
            </ul>
          </div>
        </div>
      )}

      {testResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">
            {testResult.success ? 'Success!' : 'Test Completed'}
          </h3>
          {testResult.success ? (
            <div>
              <p className="text-green-700 mb-2">
                <strong>Model:</strong> {testResult.model || 'gpt-4o-mini-realtime-preview'}
              </p>
              <p className="text-green-700 mb-2">
                <strong>Response:</strong>
              </p>
              <div className="bg-white p-3 rounded border text-sm">
                {typeof testResult.response === 'string' ? testResult.response : JSON.stringify(testResult.response, null, 2)}
              </div>
            </div>
          ) : (
            <p className="text-red-700">{testResult.error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionTest; 