# AIMCS - AI Multimodal Customer System

A modern web application that provides AI-powered voice and text chat capabilities using Azure AI services.

## 🌐 Live Demo

- **Frontend**: https://aimcs.net
- **Backend API**: https://api.aimcs.net
- **Health Check**: https://api.aimcs.net/health
- **API Status**: https://api.aimcs.net/api/status

## 🚀 Quick Start

1. **Visit the app**: https://aimcs.net
2. **Text Chat**: Type your message and press Enter
3. **Voice Chat**: Click "Start Recording", speak, then "Stop Recording"
4. **Audio Responses**: AI responses include audio playback

## 🏗️ Architecture

```
┌─────────────────┐    HTTP/HTTPS    ┌─────────────────┐
│   Frontend      │ ◄──────────────► │    Backend      │
│   (React/Vite)  │                  │   (Node.js)     │
│   aimcs.net     │                  │  api.aimcs.net  │
└─────────────────┘                  └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │   Azure AI      │
                                    │   Services      │
                                    │                 │
                                    │ • OpenAI GPT-4o │
                                    │ • Speech TTS    │
                                    │ • Audio Models  │
                                    └─────────────────┘
```

## 📋 Current Status

### ✅ Operational Services
- Frontend: https://aimcs.net (fully operational)
- Backend API: https://api.aimcs.net (fully operational)
- Azure OpenAI Integration (GPT-4o text and audio models)
- Azure Speech Services (Text-to-Speech)
- Audio Recording and Processing
- Real-time Chat Interface

### 🔧 Technical Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Hosting**: Azure Web App (Frontend) + Azure Container Apps (Backend)
- **AI Services**: Azure OpenAI + Azure Speech Services
- **Domains**: Custom domains with SSL certificates

## 🎯 Features

### Text Chat
- Real-time AI conversations
- Context-aware responses
- Automatic text-to-speech for AI responses

### Voice Chat
- High-quality audio recording
- Speech-to-text processing via GPT-4o audio model
- Natural language understanding
- Audio response playback

### User Experience
- Dark theme interface
- Responsive design
- Real-time status indicators
- Error handling and fallbacks

## 🔗 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/status` | GET | API status and configuration |
| `/api/chat` | POST | Text chat with AI |
| `/api/audio` | POST | Audio processing |
| `/api/tts` | POST | Text-to-speech generation |

## 🌍 Deployment URLs

│ Service │ URL │ Status │
│---------│-----│--------│
│ Frontend │ https://aimcs.net │ ✅ Live │
│ Backend │ https://api.aimcs.net │ ✅ Live │
│ Health │ https://api.aimcs.net/health │ ✅ Live │
