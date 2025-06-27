import axios from 'axios';

// Backend API Configuration
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io';

// Create axios instance for backend API
const backendClient = axios.create({
  baseURL: BACKEND_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Health check
export const checkBackendHealth = async () => {
  try {
    const response = await backendClient.get('/health');
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    console.error('Backend health check failed:', error);
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
};

// Get API information
export const getApiInfo = async () => {
  try {
    const response = await backendClient.get('/api');
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    console.error('Failed to get API info:', error);
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
};

// Test endpoint
export const testBackend = async () => {
  try {
    const response = await backendClient.get('/api/test');
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    console.error('Backend test failed:', error);
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
};

// Get available models
export const getModels = async () => {
  try {
    const response = await backendClient.get('/api/models');
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    console.error('Failed to get models:', error);
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
};

// Send chat message
export const sendChatMessage = async (message, conversationHistory = []) => {
  try {
    const response = await backendClient.post('/api/chat', {
      message,
      conversationHistory
    });
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    console.error('Chat request failed:', error);
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
};

// Speech to text (if implemented in backend)
export const speechToText = async (audioBlob) => {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    const response = await backendClient.post('/api/speech-to-text', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    console.error('Speech to text failed:', error);
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
};

export default {
  checkBackendHealth,
  getApiInfo,
  testBackend,
  getModels,
  sendChatMessage,
  speechToText
}; 