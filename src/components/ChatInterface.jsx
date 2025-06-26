import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';
import azureAIService from '../services/azureAIService';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role, content, isUserInput = false) => {
    const newMessage = {
      id: Date.now(),
      role,
      content,
      timestamp: new Date().toLocaleTimeString(),
      isUserInput
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    const userMessage = inputText.trim();
    setInputText('');
    addMessage('user', userMessage, true);
    setIsProcessing(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await azureAIService.sendMessage(userMessage, conversationHistory);
      addMessage('assistant', response);
    } catch (error) {
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceSubmit = async (audioBlob) => {
    setIsProcessing(true);
    
    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const result = await azureAIService.processVoiceInput(audioBlob, conversationHistory);
      
      addMessage('user', result.userInput, true);
      addMessage('assistant', result.aiResponse);
    } catch (error) {
      addMessage('assistant', 'Sorry, I encountered an error processing your voice input. Please try again.');
      console.error('Error processing voice input:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatMessage = (content) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, index) => (
        <span key={index}>
          {line}
          {index < content.split('\n').length - 1 && <br />}
        </span>
      ));
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-gray-800">AI MCP Assistant</h1>
        <p className="text-sm text-gray-600">Voice and text interaction with GPT-4o-mini-realtime-preview</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Start a conversation by typing or using voice input</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                <div className="flex items-center mb-1">
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 mr-2" />
                  ) : (
                    <Bot className="w-4 h-4 mr-2" />
                  )}
                  <span className="text-xs opacity-75">{message.timestamp}</span>
                </div>
                <div className="text-sm">
                  {formatMessage(message.content)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          {/* Voice Recorder */}
          <div className="flex-shrink-0">
            <VoiceRecorder
              onRecordingComplete={handleVoiceSubmit}
              isProcessing={isProcessing}
            />
          </div>

          {/* Text Input */}
          <form onSubmit={handleTextSubmit} className="flex-1 flex space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 