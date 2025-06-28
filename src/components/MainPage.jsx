import React, { useState, useRef, useEffect } from 'react';

const MainPage = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const BACKEND_URL = 'https://api.aimcs.net';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (sender, message, type = 'user', audioData = null, audioFormat = null) => {
    const newMessage = {
      id: Date.now(),
      sender,
      message,
      type,
      timestamp: new Date().toISOString(),
      audioData,
      audioFormat
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendTextMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage('You', userMessage, 'user');

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        addMessage('AI', data.message, 'ai', data.audioData, data.audioFormat);
      } else {
        addMessage('System', 'Failed to send message', 'error');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      addMessage('System', 'Error sending message', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (audioData, audioFormat) => {
    if (!audioData) return;
    
    const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], {
      type: audioFormat || 'audio/mp3'
    });
    
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
    
    // Clean up URL after playing
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-400 mb-2">AIMCS</h1>
          <p className="text-gray-300">AI Multimodal Customer System</p>
        </div>

        {/* Messages */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <p>Start a conversation with text!</p>
              <p className="text-sm mt-2">Type your message and press Enter or click Send</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`mb-4 ${
                msg.type === 'ai' ? 'text-left' : 
                msg.type === 'user' ? 'text-right' : 'text-center'
              }`}>
                <div className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.type === 'ai' ? 'bg-blue-600 text-white' :
                  msg.type === 'user' ? 'bg-green-600 text-white' :
                  msg.type === 'system' ? 'bg-gray-600 text-gray-200' :
                  msg.type === 'error' ? 'bg-red-600 text-white' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  <div className="text-xs opacity-75 mb-1">{msg.sender}</div>
                  <div>{msg.message}</div>
                  {msg.audioData && (
                    <button
                      onClick={() => playAudio(msg.audioData, msg.audioFormat)}
                      className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      🔊 Play Audio
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Controls */}
        <div className="flex flex-col space-y-4">
          {/* Text Input */}
          <div className="flex space-x-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 resize-none"
              rows="2"
              disabled={isLoading}
            />
            <button
              onClick={sendTextMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Send
            </button>
          </div>

          {/* Status */}
          {isLoading && (
            <div className="text-center text-gray-400">
              🔄 Processing...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm">Powered by <span className="text-blue-400 font-semibold">Zimax Networks AI</span></p>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
