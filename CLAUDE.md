# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend Development
```bash
npm run dev          # Start development server on port 3000
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build
npm run lint         # Run ESLint with React rules
npm run test         # Currently no tests (returns exit 0)
```

### Backend Development
```bash
# Backend runs from backend-server.js with separate dependencies in backend-package.json
node backend-server.js          # Start backend server
```

### Deployment
```bash
./deploy-frontend.sh    # Deploy frontend to Azure Web App
./deploy-backend.sh     # Deploy backend to Azure Container Apps
```

## Architecture Overview

This is a full-stack AI chat application with separate frontend and backend deployments:

### Frontend Architecture
- **Framework**: React 18 + Vite + Tailwind CSS
- **Authentication**: Microsoft Entra External ID (CIAM) with JWT token parsing
- **Main Component**: `src/components/MainPage.jsx` - handles chat UI, authentication, and API calls
- **Deployment**: Azure Web App as static site (https://aimcs.net)

### Backend Architecture  
- **Runtime**: Node.js + Express server (`backend-server.js`)
- **API**: Single endpoint `/api/chat` for text completion + TTS
- **AI Services**: Azure OpenAI (o4-mini for text, gpt-4o-mini-tts for audio)
- **Deployment**: Azure Container Apps (https://api.aimcs.net)

### Key Integration Points
- Frontend communicates with backend via `BACKEND_URL = 'https://api.aimcs.net'`
- Authentication uses direct CIAM redirect with JWT token in URL hash fragment
- User identity based on email claim from JWT token

## Environment Configuration

### Frontend Environment Variables (Vite)
```
VITE_AZURE_OPENAI_ENDPOINT     # Azure OpenAI endpoint URL
VITE_AZURE_OPENAI_API_KEY      # Azure OpenAI API key  
VITE_AZURE_OPENAI_DEPLOYMENT   # Text model deployment name
VITE_BACKEND_API_URL           # Backend API URL
```

### Backend Environment Variables
```
AZURE_OPENAI_ENDPOINT          # Azure OpenAI endpoint URL
AZURE_OPENAI_API_KEY           # Azure OpenAI API key
AZURE_OPENAI_DEPLOYMENT        # Text model (default: o4-mini)
AZURE_OPENAI_TTS_DEPLOYMENT    # TTS model (default: gpt-4o-mini-tts)
PORT                           # Server port (default: 3000)
```

## API Configuration Details

### Text Model (o4-mini)
- API Version: `2025-01-01-preview`
- Parameters: `max_completion_tokens: 1000`
- No temperature parameter (uses model default)

### TTS Model (gpt-4o-mini-tts) 
- API Version: `2025-03-01-preview`
- Voice: `"alloy"`
- Response Format: `"mp3"`

## Authentication Flow

1. User accesses app, checks for `id_token` in URL hash
2. If not authenticated, redirects to CIAM login URL
3. After login, CIAM redirects back with JWT token in hash fragment
4. Frontend extracts and parses JWT to get user email
5. Email used as unique user identifier (not OID)

## File Structure Notes

- `src/App.jsx` - Simple app wrapper with dark gradient theme
- `src/components/MainPage.jsx` - Main chat interface and auth logic  
- `backend-server.js` - Express server with single `/api/chat` endpoint
- `vite.config.js` - Vite configuration with environment variable injection
- `backend-package.json` - Separate dependencies for backend
- Deployment scripts in root directory for Azure services

## Azure Deployment Context

- Frontend: Static files deployed to Azure Web App
- Backend: Containerized and deployed to Azure Container Apps
- Uses Azure Container Registry for Docker images
- Custom domains with SSL certificates (aimcs.net, api.aimcs.net)