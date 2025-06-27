import React, { useEffect, useState } from 'react';

export default function AIDebug() {
  const [output, setOutput] = useState('');

  useEffect(() => {
    const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
    const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;
    const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
    const url = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=2024-10-01-preview`;
    const headers = {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    };
    const body = JSON.stringify({
      messages: [{ role: 'user', content: 'Hello from debug page!' }],
      max_tokens: 10,
    }, null, 2);

    setOutput(`REQUEST\n------\nURL: ${url}\nHeaders: ${JSON.stringify(headers, null, 2)}\nBody: ${body}\n\nRESPONSE\n------\nWaiting for response...`);

    fetch(url, {
      method: 'POST',
      headers,
      body,
    })
      .then(async (res) => {
        const resHeaders = {};
        res.headers.forEach((v, k) => { resHeaders[k] = v; });
        const resText = await res.text();
        setOutput(
          `REQUEST\n------\nURL: ${url}\nHeaders: ${JSON.stringify(headers, null, 2)}\nBody: ${body}\n\nRESPONSE\n------\nStatus: ${res.status} ${res.statusText}\nHeaders: ${JSON.stringify(resHeaders, null, 2)}\nBody: ${resText}`
        );
      })
      .catch((err) => {
        setOutput(
          `REQUEST\n------\nURL: ${url}\nHeaders: ${JSON.stringify(headers, null, 2)}\nBody: ${body}\n\nRESPONSE\n------\nException: ${err.message}`
        );
      });
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontWeight: 'bold', fontSize: 24, marginBottom: 16 }}>AI Debug Page</h1>
      <pre style={{ background: '#f3f3f3', padding: 16, borderRadius: 8, fontSize: 14, overflowX: 'auto' }}>{output}</pre>
    </div>
  );
} 