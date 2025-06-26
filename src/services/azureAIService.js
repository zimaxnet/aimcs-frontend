import axios from 'axios';

// Configuration - these should be moved to environment variables
const AZURE_OPENAI_ENDPOINT = process.env.VITE_AZURE_OPENAI_ENDPOINT || 'https://your-resource.openai.azure.com';
const AZURE_OPENAI_API_KEY = process.env.VITE_AZURE_OPENAI_API_KEY || 'your-api-key';
const AZURE_OPENAI_DEPLOYMENT = process.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini-realtime-preview';

class AzureAIService {
  constructor() {
    this.baseURL = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}`;
    this.headers = {
      'Content-Type': 'application/json',
      'api-key': AZURE_OPENAI_API_KEY,
    };
  }

  // Convert audio blob to text using Azure Speech Services
  async speechToText(audioBlob) {
    try {
      // For now, we'll use a simple approach - in production you'd want to use Azure Speech Services
      // This is a placeholder that would need to be replaced with actual Azure Speech Services integration
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // This would be replaced with actual Azure Speech Services endpoint
      const response = await axios.post('/api/speech-to-text', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data.text;
    } catch (error) {
      console.error('Speech to text error:', error);
      throw new Error('Failed to convert speech to text');
    }
  }

  // Send message to GPT-4o-mini-realtime-preview
  async sendMessage(message, conversationHistory = []) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful AI assistant. Respond concisely and helpfully.'
        },
        ...conversationHistory,
        {
          role: 'user',
          content: message
        }
      ];

      const response = await axios.post(
        `${this.baseURL}/chat/completions?api-version=2024-02-15-preview`,
        {
          messages,
          max_tokens: 1000,
          temperature: 0.7,
          stream: false
        },
        {
          headers: this.headers,
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Azure AI API error:', error);
      throw new Error('Failed to get response from AI');
    }
  }

  // Combined voice-to-text and AI response
  async processVoiceInput(audioBlob, conversationHistory = []) {
    try {
      // Convert speech to text
      const text = await this.speechToText(audioBlob);
      
      // Get AI response
      const response = await this.sendMessage(text, conversationHistory);
      
      return {
        userInput: text,
        aiResponse: response
      };
    } catch (error) {
      console.error('Voice processing error:', error);
      throw error;
    }
  }
}

export default new AzureAIService(); 