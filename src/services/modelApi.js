import axios from 'axios';

// Azure AI Foundry Configuration
const API_BASE_URL = import.meta.env.VITE_MODEL_API_URL || 'https://ai-derek9189ai830400194680.services.ai.azure.com';
const API_KEY = import.meta.env.VITE_MODEL_API_KEY || 'B2nqRP8jzilVgdtE1cj9LEXgyhuJVQtsWOLM4NoRRjkZot0xJq9wJQQJ99BFACHYHv6XJ3w3AAAAACOG1nse';
const MODEL_NAME = import.meta.env.VITE_MODEL_NAME || 'gpt-4o-mini-audio-preview';

// Create axios instance with proper configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'api-key': API_KEY, // Azure OpenAI also uses api-key header
  },
  timeout: 30000, // 30 second timeout
});

// Discover available models and deployments
export const discoverModels = async () => {
  try {
    console.log('Discovering available models and deployments...');
    
    const endpoints = [
      '/models',  // Azure AI Foundry models endpoint
      '/openai/deployments',
      '/openai/models',
      '/deployments',
      '/openai/deployments?api-version=2024-10-01-preview',
      '/openai/models?api-version=2024-10-01-preview'
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying discovery endpoint: ${endpoint}`);
        const response = await apiClient.get(endpoint);
        console.log(`Success with ${endpoint}:`, response.data);
        results.push({
          endpoint: endpoint,
          data: response.data,
          success: true
        });
      } catch (error) {
        console.log(`Discovery endpoint ${endpoint} failed:`, error.response?.status, error.response?.statusText);
        results.push({
          endpoint: endpoint,
          error: error.response?.status + ' ' + error.response?.statusText,
          success: false
        });
      }
    }

    return {
      success: results.some(r => r.success),
      results: results,
      baseUrl: API_BASE_URL
    };

  } catch (error) {
    console.error('Model discovery failed:', error);
    throw new Error(`Discovery failed: ${error.response?.status} ${error.response?.statusText} - ${error.message}`);
  }
};

// Test model connection with discovered models
export const testModelConnection = async () => {
  try {
    console.log('Testing Azure AI Foundry connection...');
    console.log('Base URL:', API_BASE_URL);
    console.log('Model Name:', MODEL_NAME);
    
    // First, try to discover available models
    const discovery = await discoverModels();
    console.log('Discovery results:', discovery);
    
    // Try different endpoint patterns for Azure AI Foundry
    const endpoints = [
      `/models/${MODEL_NAME}`,  // Azure AI Foundry model info
      `/@${MODEL_NAME}/info`,   // Alternative Azure AI Foundry format
      `/openai/deployments/${MODEL_NAME}`,
      `/openai/deployments/${MODEL_NAME}/chat/completions`,
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await apiClient.get(endpoint);
        console.log('Connection successful with endpoint:', endpoint);
        return {
          success: true,
          endpoint: endpoint,
          data: response.data,
          model: MODEL_NAME,
          discovery: discovery
        };
      } catch (error) {
        console.log(`Endpoint ${endpoint} failed:`, error.response?.status, error.response?.statusText);
        continue;
      }
    }

    // If all endpoints fail, try a simple chat completion with Azure AI Foundry format
    const chatResponse = await apiClient.post(`/models/${MODEL_NAME}/chat/completions`, {
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 10,
    });

    return {
      success: true,
      endpoint: 'chat/completions',
      data: chatResponse.data,
      model: MODEL_NAME,
      discovery: discovery
    };

  } catch (error) {
    console.error('All connection attempts failed:', error);
    throw new Error(`Connection failed: ${error.response?.status} ${error.response?.statusText} - ${error.message}`);
  }
};

// Send model request
export const sendModelRequest = async (prompt, options = {}) => {
  try {
    const requestBody = {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.max_tokens || 150,
      temperature: options.temperature || 0.7,
      stream: options.stream || false,
    };

    // Try Azure AI Foundry format first
    try {
      const response = await apiClient.post(`/models/${MODEL_NAME}/chat/completions`, requestBody);
      return response.data;
    } catch (error) {
      console.log('Azure AI Foundry format failed, trying OpenAI format:', error.response?.status);
      
      // Fallback to OpenAI format
      const response = await apiClient.post(`/openai/deployments/${MODEL_NAME}/chat/completions`, requestBody, {
        params: { 'api-version': '2024-10-01-preview' }
      });
      return response.data;
    }
  } catch (error) {
    console.error('Model request failed:', error);
    throw new Error(`Request failed: ${error.response?.status} ${error.response?.statusText} - ${error.message}`);
  }
};

// Get model information
export const getModelInfo = async () => {
  try {
    const response = await apiClient.get(`/openai/deployments/${MODEL_NAME}`, {
      params: { 'api-version': '2024-10-01-preview' }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get model info:', error);
    throw error;
  }
};

// Test realtime capabilities (if available)
export const testRealtimeCapabilities = async () => {
  try {
    // This would test if the model supports realtime features
    const response = await apiClient.post(`/openai/deployments/${MODEL_NAME}/chat/completions`, {
      messages: [{ role: 'user', content: 'Test realtime' }],
      max_tokens: 10,
      stream: true, // Test streaming capability
    }, {
      params: { 'api-version': '2024-10-01-preview' }
    });

    return {
      success: true,
      supportsStreaming: true,
      model: MODEL_NAME
    };
  } catch (error) {
    console.error('Realtime test failed:', error);
    return {
      success: false,
      supportsStreaming: false,
      error: error.message,
      model: MODEL_NAME
    };
  }
};

// Test with a different model
export const testWithDifferentModel = async (modelName = 'gpt-4o-mini') => {
  try {
    console.log(`Testing with model: ${modelName}`);
    
    const response = await apiClient.post(`/openai/deployments/${modelName}/chat/completions`, {
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 10,
    }, {
      params: { 'api-version': '2024-10-01-preview' }
    });

    return {
      success: true,
      model: modelName,
      data: response.data
    };

  } catch (error) {
    console.error(`Test with ${modelName} failed:`, error);
    throw new Error(`Test with ${modelName} failed: ${error.response?.status} ${error.response?.statusText} - ${error.message}`);
  }
}; 