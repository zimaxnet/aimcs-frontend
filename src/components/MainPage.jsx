import React, { useState, useRef, useEffect } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../authConfig';

const msalInstance = new PublicClientApplication(msalConfig);

const translations = {
  en: {
    title: 'AIMCS',
    subtitle: 'AI Multimodal Customer System',
    startConversation: 'Start a conversation with text!',
    typeMessage: 'Type your message and press Enter or click Send',
    send: 'Send',
    processing: 'Processing...',
    poweredBy: 'Powered by',
    playAudio: '🔊 Play Audio',
    placeholder: 'Type your message...'
  },
  es: {
    title: 'AIMCS',
    subtitle: 'Sistema de Cliente Multimodal con IA',
    startConversation: '¡Comienza una conversación con texto!',
    typeMessage: 'Escribe tu mensaje y presiona Enter o haz clic en Enviar',
    send: 'Enviar',
    processing: 'Procesando...',
    poweredBy: 'Desarrollado por',
    playAudio: '🔊 Reproducir audio',
    placeholder: 'Escribe tu mensaje...'
  }
};

const MainPage = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [userEmail, setUserEmail] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const BACKEND_URL = 'https://api.aimcs.net';

  // Initialize MSAL and handle authentication
  useEffect(() => {
    const initializeMsal = async () => {
      try {
        console.log('Initializing MSAL with config:', msalConfig);
        await msalInstance.initialize();
        
        // Handle redirect response
        const response = await msalInstance.handleRedirectPromise();
        console.log('Redirect response:', response);
        if (response) {
          const account = response.account;
          console.log('Account from redirect:', account);
          if (account && account.username) {
            setUserEmail(account.username);
            setIsAuthenticated(true);
            setAuthLoading(false);
            return;
          }
        }

        // Check for existing accounts
        const accounts = msalInstance.getAllAccounts();
        console.log('Existing accounts:', accounts);
        if (accounts.length > 0) {
          const account = accounts[0];
          setUserEmail(account.username);
          setIsAuthenticated(true);
          setAuthLoading(false);
        } else {
          // No authenticated user, show login button instead of auto-redirect
          console.log('No authenticated user found');
          setAuthLoading(false);
        }
      } catch (error) {
        console.error('MSAL initialization error:', error);
        setAuthLoading(false);
      }
    };

    initializeMsal();
  }, []);

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
        addMessage('Zimax AI', data.message, 'ai', data.audioData, data.audioFormat);
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

  const handleLogin = async () => {
    try {
      console.log('Starting login with config:', msalConfig);
      await msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-4xl font-bold text-blue-400 mb-4">AIMCS</h1>
          <p className="text-gray-300 mb-8">AI Multimodal Customer System</p>
          <button
            onClick={handleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-4 pt-16">
        {/* Top Bar: Language Toggle + User Email */}
        <div className="flex justify-between items-center mb-2">
          {/* Language Toggle */}
          <button
            className="bg-gray-700 text-white px-3 py-1 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            aria-label={language === 'en' ? 'Cambiar a español' : 'Switch to English'}
          >
            {language === 'en' ? 'ES' : 'EN'}
          </button>
          {/* User Email and Logout */}
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-400 font-semibold">{userEmail}</span>
              <button
                onClick={() => msalInstance.logoutRedirect()}
                className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
              >
                Logout
              </button>
            </div>
          )}
        </div>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-400 mb-2">{translations[language].title}</h1>
          <p className="text-gray-300">{translations[language].subtitle}</p>
        </div>
        {/* Messages */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <p>{translations[language].startConversation}</p>
              <p className="text-sm mt-2">{translations[language].typeMessage}</p>
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
                      {translations[language].playAudio}
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
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 rounded-lg p-2 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={2}
              placeholder={translations[language].placeholder}
              disabled={isLoading}
            />
            <button
              onClick={sendTextMessage}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-60"
              disabled={isLoading || !inputMessage.trim()}
            >
              {isLoading ? translations[language].processing : translations[language].send}
            </button>
          </div>
        </div>
        <div className="text-center text-gray-400 text-xs mt-8 pb-4">
          {translations[language].poweredBy} Zimax Networks AI
        </div>
      </div>
    </div>
  );
};

export default MainPage;
