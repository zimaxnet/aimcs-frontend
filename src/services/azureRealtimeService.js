// import OpenAI from 'openai'; // Removed to prevent browser error

// Configuration - these should be moved to environment variables
const AZURE_OPENAI_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || 'https://aimcs-resource.cognitiveservices.azure.com';
const AZURE_OPENAI_API_KEY = import.meta.env.VITE_AZURE_OPENAI_API_KEY || '9bgHRUMvrxKNLkJBx92DYjN4WiGxMzXKqF9faexcMcmjOe1KdYDhJQQJ99BFACMsfrFXJ3w3AAAAACOG0Tsg';
const AZURE_OPENAI_DEPLOYMENT = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini-realtime-preview';

class AzureRealtimeService {
  constructor() {
    // OpenAI client completely removed to prevent browser error
    this.client = null;
    this.deployment = AZURE_OPENAI_DEPLOYMENT;
    this.websocket = null;
  }

  // Initialize real-time audio session using WebSocket
  async initializeRealtimeSession() {
    try {
      // Temporarily disabled OpenAI client
      if (!this.client) {
        console.log('OpenAI client is temporarily disabled');
        return {
          sessionId: 'disabled-session-' + Date.now(),
          status: 'disabled',
          message: 'OpenAI client is temporarily disabled'
        };
      }
      
      // For now, we'll test the basic Azure OpenAI connection first
      // The Realtime API is still in preview and requires special access
      
      console.log('Testing Azure OpenAI connection...');
      
      // Test with a simple chat completion to verify the connection works
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant. Respond with "Connection successful!" if you receive this message.'
          },
          {
            role: 'user',
            content: 'Test connection'
          }
        ],
        max_tokens: 50,
        temperature: 0.7,
        stream: false
      });

      const testResponse = response.choices[0].message.content;
      
      // Return a mock session for now
      return {
        sessionId: 'test-session-' + Date.now(),
        status: 'connected',
        testResponse: testResponse
      };
      
    } catch (error) {
      console.error('Error testing Azure OpenAI connection:', error);
      
      // Check if it's an authentication error
      if (error.status === 401) {
        throw new Error('Authentication failed. Please check your API key.');
      } else if (error.status === 404) {
        throw new Error('Deployment not found. Please check your deployment name.');
      } else if (error.status === 403) {
        throw new Error('Access denied. Please check your Azure OpenAI permissions.');
      } else {
        throw new Error(`Azure OpenAI error: ${error.message}`);
      }
    }
  }

  // Test basic Azure OpenAI functionality
  async testBasicConnection() {
    try {
      if (!this.client) {
        return {
          success: false,
          error: 'OpenAI client is temporarily disabled'
        };
      }
      
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: 'Hello, can you hear me?'
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
        stream: false
      });

      return {
        success: true,
        response: response.choices[0].message.content,
        model: response.model
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Start real-time audio conversation (placeholder for future implementation)
  async startRealtimeConversation(audioStream, onAudioReceived, onError) {
    try {
      console.log('Realtime conversation not yet implemented');
      console.log('This would use WebSocket connection to Azure OpenAI Realtime API');
      
      // For now, just return a placeholder
      return {
        status: 'not_implemented',
        message: 'Realtime API requires special access and WebSocket implementation'
      };
      
    } catch (error) {
      console.error('Error in realtime conversation:', error);
      onError?.(error);
    }
  }

  // Send audio chunk to the real-time API (placeholder)
  async sendAudioChunk(sessionId, audioChunk) {
    try {
      console.log('Sending audio chunk:', audioChunk.length, 'bytes');
      console.log('This would send via WebSocket to Azure OpenAI Realtime API');
      
      // Placeholder for actual implementation
      return { status: 'sent', bytes: audioChunk.length };
      
    } catch (error) {
      console.error('Error sending audio chunk:', error);
      throw error;
    }
  }

  // Fallback to text-based conversation
  async sendTextMessage(message, conversationHistory = []) {
    try {
      if (!this.client) {
        return 'OpenAI client is temporarily disabled. Please try again later.';
      }
      
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

      const response = await this.client.chat.completions.create({
        messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Azure OpenAI API error:', error);
      throw new Error('Failed to get response from AI');
    }
  }
}

export default new AzureRealtimeService(); 