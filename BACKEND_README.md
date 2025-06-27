# AIMCS Backend with WebSocket Audio Support

This is the backend server for the AIMCS (AI Multimodal Customer System) with real-time WebSocket audio streaming capabilities.

## 🚀 **Current Status**

**✅ DEPLOYED AND OPERATIONAL**

- **Backend URL**: https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io
- **WebSocket Endpoint**: wss://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io/ws/audio
- **Region**: eastus2
- **Platform**: Azure Container Apps

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    AIMCS Backend (eastus2)                  │
├─────────────────────────────────────────────────────────────┤
│  Node.js Express Server                                     │
│  ├── HTTP API Endpoints                                     │
│  │   ├── GET /health                                        │
│  │   ├── GET /api/status                                    │
│  │   └── POST /api/chat                                     │
│  └── WebSocket Server                                       │
│      └── WS /ws/audio                                       │
├─────────────────────────────────────────────────────────────┤
│  Azure Container Apps                                       │
│  ├── Auto-scaling (1-3 replicas)                           │
│  ├── Health monitoring                                      │
│  └── HTTPS/WSS support                                      │
└─────────────────────────────────────────────────────────────┘
```

## 📡 **API Endpoints**

### HTTP Endpoints

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/health` | GET | Health check | Status, uptime, connections |
| `/api/status` | GET | API status | Endpoints, active connections |
| `/api/chat` | POST | Chat API | Echo response for testing |

### WebSocket Endpoint

| Endpoint | Protocol | Description |
|----------|----------|-------------|
| `/ws/audio` | WSS | Real-time audio streaming |

## 🔌 **WebSocket Message Types**

### From Frontend to Backend

| Type | Payload | Description |
|------|---------|-------------|
| `test` | `{message: string, timestamp: string}` | Test connection |
| `audio` | `{data: base64, timestamp: string}` | Audio data stream |
| `ping` | `{}` | Keep-alive ping |

### From Backend to Frontend

| Type | Payload | Description |
|------|---------|-------------|
| `connection` | `{connectionId: string, message: string}` | Connection established |
| `test_response` | `{originalMessage: string, message: string}` | Test response |
| `audio_received` | `{dataSize: number, message: string}` | Audio acknowledgment |
| `pong` | `{timestamp: string}` | Ping response |
| `error` | `{message: string, error: string}` | Error message |

## 🚀 **Deployment**

### Prerequisites

1. **Azure CLI** installed and logged in
2. **Docker** installed and running
3. **Node.js** 18+ for local development

### Quick Deployment

```bash
# Make script executable
chmod +x deploy-backend.sh

# Deploy to Azure Container Apps
./deploy-backend.sh
```

### Manual Deployment Steps

1. **Build Docker Image**:
   ```bash
   docker build -f backend-Dockerfile -t aimcs-backend:latest .
   ```

2. **Push to Azure Container Registry**:
   ```bash
   az acr login --name aimcsregistry
   docker tag aimcs-backend:latest aimcsregistry.azurecr.io/aimcs-backend:latest
   docker push aimcsregistry.azurecr.io/aimcs-backend:latest
   ```

3. **Deploy to Container Apps**:
   ```bash
   az containerapp create \
     --name aimcs-backend-eastus2 \
     --resource-group aimcs-rg-eastus2 \
     --environment aimcs-backend-eastus2-env \
     --image aimcsregistry.azurecr.io/aimcs-backend:latest \
     --target-port 3000 \
     --ingress external \
     --min-replicas 1 \
     --max-replicas 3
   ```

## 🧪 **Testing**

### Test Backend Endpoints

```bash
# Make test script executable
chmod +x test-backend.sh

# Run comprehensive tests
./test-backend.sh
```

### Manual Testing

1. **Health Check**:
   ```bash
   curl https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io/health
   ```

2. **API Status**:
   ```bash
   curl https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io/api/status
   ```

3. **Chat API**:
   ```bash
   curl -X POST https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello!", "context": {"test": true}}'
   ```

4. **WebSocket Test** (using wscat):
   ```bash
   npm install -g wscat
   wscat -c wss://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io/ws/audio
   ```

### Frontend Integration

The frontend is configured to connect to the backend via the `VITE_BACKEND_API_URL` environment variable:

```env
VITE_BACKEND_API_URL=https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io
```

## 🔧 **Configuration**

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | production | Node.js environment |

### CORS Configuration

The backend allows requests from:
- `https://aimcs-frontend-eastus2.azurewebsites.net`
- `https://aimcs.net`
- `http://localhost:5173` (development)
- `http://localhost:3000` (development)

## 📊 **Monitoring**

### Azure Container Apps Logs

```bash
# View logs
az containerapp logs show \
  --name aimcs-backend-eastus2 \
  --resource-group aimcs-rg-eastus2 \
  --follow
```

### Health Monitoring

The container includes a health check that monitors the `/health` endpoint every 30 seconds.

## 🔒 **Security**

- **HTTPS/WSS**: All traffic is encrypted
- **CORS**: Configured for specific origins
- **Input Validation**: JSON payload validation
- **Error Handling**: Comprehensive error handling and logging

## 🚨 **Troubleshooting**

### Common Issues

1. **WebSocket Connection Failed**:
   - Check if backend is running: `curl /health`
   - Verify CORS configuration
   - Check browser console for errors

2. **Audio Not Streaming**:
   - Verify microphone permissions
   - Check WebSocket connection status
   - Monitor backend logs for errors

3. **Container App Not Starting**:
   - Check container logs in Azure Portal
   - Verify image exists in registry
   - Check resource quotas

### Debug Commands

```bash
# Check container app status
az containerapp show \
  --name aimcs-backend-eastus2 \
  --resource-group aimcs-rg-eastus2

# View recent logs
az containerapp logs show \
  --name aimcs-backend-eastus2 \
  --resource-group aimcs-rg-eastus2 \
  --tail 100
```

## 🔄 **Updates and Maintenance**

### Update Backend

```bash
# Build new image
docker build -f backend-Dockerfile -t aimcs-backend:latest .

# Push to registry
docker tag aimcs-backend:latest aimcsregistry.azurecr.io/aimcs-backend:latest
docker push aimcsregistry.azurecr.io/aimcs-backend:latest

# Update container app
az containerapp update \
  --name aimcs-backend-eastus2 \
  --resource-group aimcs-rg-eastus2 \
  --image aimcsregistry.azurecr.io/aimcs-backend:latest
```

### Scale Container App

```bash
# Scale to 3 replicas
az containerapp revision set-mode \
  --name aimcs-backend-eastus2 \
  --resource-group aimcs-rg-eastus2 \
  --mode multiple \
  --revision-suffix latest

az containerapp update \
  --name aimcs-backend-eastus2 \
  --resource-group aimcs-rg-eastus2 \
  --min-replicas 3 \
  --max-replicas 5
```

## 📝 **Development**

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### File Structure

```
backend/
├── backend-server.js      # Main server file
├── backend-package.json   # Dependencies
├── backend-Dockerfile     # Docker configuration
├── deploy-backend.sh      # Deployment script
├── test-backend.sh        # Test script
└── BACKEND_README.md      # This file
```

## 🤝 **Integration with Frontend**

The frontend connects to this backend for:
- **Health checks** and status monitoring
- **WebSocket audio streaming** for real-time voice chat
- **API endpoints** for chat and other features

The WebSocket endpoint `/ws/audio` handles:
- Real-time audio data streaming
- Connection management
- Message routing
- Error handling

## 🎯 **Next Steps**

1. **Audio Processing**: Integrate Azure Speech Services for speech-to-text
2. **AI Integration**: Connect audio processing with Azure OpenAI
3. **Real-time Responses**: Implement text-to-speech for AI responses
4. **Session Management**: Add user session tracking
5. **Analytics**: Add usage analytics and monitoring 