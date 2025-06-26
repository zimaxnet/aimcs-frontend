import React, { useState } from 'react';
import RealtimeVoiceChat from './RealtimeVoiceChat';

// Dashboard component for authenticated users with voice chat integration
export default function Dashboard({ user, onNavigate }) {
  const [showVoiceChat, setShowVoiceChat] = useState(false);

  const userEmail = user.email || (user.emails && user.emails[0]) || 'N/A';
  const idp = user.idp || user.iss || 'N/A';

  if (showVoiceChat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-4xl">
          <div className="mb-4 flex justify-between items-center">
            <button
              onClick={() => setShowVoiceChat(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold">AIMCS Voice Chat</h1>
          </div>
          <RealtimeVoiceChat user={user} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-2xl w-full flex flex-col items-center">
        <h1 className="text-4xl font-extrabold mb-2 text-indigo-800 tracking-tight">Welcome, {userEmail}</h1>
        <p className="text-gray-500 mb-6 text-sm">IDP: {idp}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8">
          <button
            className="flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-500 text-white rounded-xl shadow-lg p-6 hover:scale-105 transition-transform focus:outline-none"
            onClick={() => setShowVoiceChat(true)}
          >
            <span className="text-3xl mb-2">🎤</span>
            <span className="font-bold text-lg">Voice Chat</span>
            <span className="text-xs mt-1">Talk to GPT-4o in real time</span>
          </button>
          <button
            className="flex flex-col items-center justify-center bg-gradient-to-br from-green-400 to-green-600 text-white rounded-xl shadow-lg p-6 hover:scale-105 transition-transform focus:outline-none"
            onClick={() => onNavigate('demo')}
          >
            <span className="text-3xl mb-2">🤖</span>
            <span className="font-bold text-lg">AI Demo</span>
            <span className="text-xs mt-1">Test AI models</span>
          </button>
          <button
            className="flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-700 text-white rounded-xl shadow-lg p-6 hover:scale-105 transition-transform focus:outline-none"
            onClick={() => onNavigate('backend')}
          >
            <span className="text-3xl mb-2">🛠️</span>
            <span className="font-bold text-lg">Backend Test</span>
            <span className="text-xs mt-1">API & diagnostics</span>
          </button>
        </div>
        <div className="w-full bg-indigo-50 rounded-lg p-4 shadow-inner text-center">
          <h2 className="text-lg font-bold mb-2 text-indigo-700">AIMCS Dashboard</h2>
          <p className="text-gray-700">Choose a feature above to get started, or use the navigation at the top to return home.</p>
        </div>
      </div>
      {/* Debug panel for AI env vars */}
      <div className="fixed bottom-0 left-0 bg-white p-2 text-xs shadow z-50 border-t border-r border-gray-200">
        <div>Endpoint: {import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || 'MISSING'}</div>
        <div>Deployment: {import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'MISSING'}</div>
        <div>API Key: {import.meta.env.VITE_AZURE_OPENAI_API_KEY ? 'SET' : 'MISSING'}</div>
      </div>
    </div>
  );
} 