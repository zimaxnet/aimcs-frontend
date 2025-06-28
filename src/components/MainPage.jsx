import React, { useState, useRef, useEffect } from 'react';

const MainPage = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      addMessage('System', 'Recording started...', 'system');
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      addMessage('System', 'Failed to start recording', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      addMessage('System', 'Processing audio...', 'system');
      
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const processAudio = async (audioBlob) => {
    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Audio = reader.result.split(',')[1];
        const audioFormat = audioBlob.type;
        
        const response = await fetch(`${BACKEND_URL}/api/audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioData: base64Audio,
            audioFormat: audioFormat
          }),
        });

        if (response.ok) {
          const data = await response.json();
          addMessage('AI', data.message, 'ai', data.audioData, data.audioFormat);
        } else {
          addMessage('System', 'Audio processing failed', 'error');
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('❌ Error processing audio:', error);
      addMessage('System', 'Error processing audio', 'error');
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
              <p>Start a conversation with text or voice!</p>
              <p className="text-sm mt-2">Click "Start Recording" to use voice chat</p>
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

          {/* Audio Controls */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isRecording ? '🛑 Stop Recording' : '🎤 Start Recording'}
            </button>
          </div>

          {/* Status */}
          {(isLoading || isRecording) && (
            <div className="text-center text-gray-400">
              {isLoading && '🔄 Processing...'}
              {isRecording && '🎤 Recording...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainPage;
