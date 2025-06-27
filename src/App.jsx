import React, { useState } from 'react';
import MainPage from './components/MainPage';
import AudioWebSocketTest from './components/AudioWebSocketTest';

export default function App() {
  const [currentPage, setCurrentPage] = useState('main');

  const renderPage = () => {
    switch (currentPage) {
      case 'audio':
        return <AudioWebSocketTest />;
      default:
        return <MainPage />;
    }
  };

  return (
    <div className="App min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">AIMCS Frontend</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentPage('main')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === 'main'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                🔗 Connection Test
              </button>
              <button
                onClick={() => setCurrentPage('audio')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === 'audio'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                🎤 Audio WebSocket Test
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full max-w-7xl mx-auto px-4 py-8">
        {renderPage()}
      </main>
    </div>
  );
} 