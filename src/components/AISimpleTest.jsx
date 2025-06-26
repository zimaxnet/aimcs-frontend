import React, { useState } from 'react';

export default function AISimpleTest() {
  const [status, setStatus] = useState('Not tested');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [fullResponse, setFullResponse] = useState('');

  const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
  const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;
  const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;

  const handleTest = async () => {
    setStatus('Testing...');
    setError('');
    setResponse('');
    setDebugInfo('');
    setFullResponse('');
    if (!endpoint || !deployment || !apiKey) {
      setStatus('❌ Missing environment variables');
      return;
    }
    const url = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=2024-10-01-preview`;
    const headers = {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    };
    const body = JSON.stringify({
      messages: [{ role: 'user', content: 'Hello, are you there?' }],
      max_tokens: 20,
    }, null, 2);
    setDebugInfo(`URL: ${url}\nHeaders: ${JSON.stringify(headers, null, 2)}\nBody: ${body}`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });
      const resHeaders = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      const resText = await res.text();
      setFullResponse(`Status: ${res.status} ${res.statusText}\nHeaders: ${JSON.stringify(resHeaders, null, 2)}\nBody: ${resText}`);
      if (!res.ok) {
        setStatus(`❌ Error: ${res.status}`);
        setError(resText);
        return;
      }
      const data = JSON.parse(resText);
      setStatus('✅ Success');
      setResponse(data.choices?.[0]?.message?.content || JSON.stringify(data));
    } catch (err) {
      setStatus('❌ Exception');
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full text-center">
        <h1 className="text-2xl font-bold mb-4">AI Connection Test</h1>
        <div className="mb-4">
          <button
            className="px-6 py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold text-lg"
            onClick={handleTest}
          >
            Test AI Connection
          </button>
        </div>
        <div className="mb-2 text-sm">Status: <span className={status.startsWith('✅') ? 'text-green-600' : status.startsWith('❌') ? 'text-red-600' : 'text-gray-700'}>{status}</span></div>
        {response && <div className="bg-green-50 border border-green-200 rounded p-3 mt-2 text-left"><strong>AI Response:</strong><div>{response}</div></div>}
        {error && <div className="bg-red-50 border border-red-200 rounded p-3 mt-2 text-left"><strong>Error:</strong><div className="text-xs break-all">{error}</div></div>}
        <div className="mt-6 text-xs text-gray-500 text-left">
          <div>Endpoint: {endpoint || 'MISSING'}</div>
          <div>Deployment: {deployment || 'MISSING'}</div>
          <div>API Key: {apiKey ? 'SET' : 'MISSING'}</div>
          {debugInfo && <pre className="bg-gray-100 rounded p-2 mt-2 overflow-x-auto">{debugInfo}</pre>}
          {fullResponse && <pre className="bg-yellow-100 rounded p-2 mt-2 overflow-x-auto">{fullResponse}</pre>}
        </div>
      </div>
    </div>
  );
} 