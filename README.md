# AIMCS Frontend

> **Migration & Consolidation History:**
> 
> In 2024, we migrated and consolidated AIMCS resources for reliability, security, and maintainability:
> 
> - **Primary Reason:** The migration was driven by the need to ensure all resources (frontend, backend, and supporting services) are in the same Azure region as the AI resources (Azure AI Foundry), which is required for compatibility, optimal performance, and to avoid cross-region issues.
> - **Region Alignment:** All resources (frontend, backend, AI services) were migrated to the `eastus2` Azure region to ensure optimal latency and compatibility, and to simplify management.
> - **Backend Migration:** The backend Node.js API was moved from an older Azure Container App environment in `westus` to a new environment in `eastus2`. DNS and environment variables were updated, and old resources were cleaned up.
> - **Frontend Migration:** The frontend was redeployed to an Azure Web App in `eastus2`, with custom domain binding and SSL.
> - **App Service Domain & SSL:** We used Azure App Service Domain to register and manage `aimcs.net` and `api.aimcs.net`. This required careful DNS setup (A, CNAME, TXT records), domain verification, and SSL certificate management. Azure DNSSEC was enabled for security. The process included troubleshooting Azure's custom domain verification and SSL binding quirks.
> - **Repository Consolidation:** We consolidated from two separate repos (frontend and backend) to a single repo (this one). While not a monorepo, this repo now contains all frontend code and documentation/configuration for backend container deployment, making it the single source of truth for AIMCS frontend and deployment info.
> - **Lessons Learned:** DNS propagation and Azure's custom domain verification can be slow and require patience. Environment variables for Vite must be set in Azure App Service, and backend URLs must be updated after migration. Azure handles DNSSEC and certificate renewal automatically once set up.
> 
> For a step-by-step technical account, see [DEPLOYMENT.md](./DEPLOYMENT.md).

The frontend application for the AI Multimodal Customer System (AIMCS), created by the Zimax Networks AI Architecture and Engineering Team.

## 🚀 **Current Deployment Status**

**✅ LIVE SYSTEM - FULLY OPERATIONAL**

- **Frontend**: https://aimcs-frontend-eastus2.azurewebsites.net
- **Frontend Custom Domain**: https://aimcs.net (configured, may need DNS propagation)
- **Backend**: https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io
- **Backend Custom Domain**: https://api.aimcs.net (DNS configured, binding in progress)
- **AI Services**: Azure AI Foundry with model-router deployment
- **Region**: All components deployed in `eastus2` for optimal performance

### ✅ **Recent Fixes & Updates**

**Backend Port Configuration**: **RESOLVED** - Backend target port updated to 3000 to match the application's listening port.

**Custom Domain Status**:
- **Frontend (aimcs.net)**: DNS configured, SSL certificate active, domain binding enabled
- **Backend (api.aimcs.net)**: DNS configured, SSL certificate active, domain binding in progress

**Current Working URLs**:
- Frontend: https://aimcs-frontend-eastus2.azurewebsites.net (fully operational)
- Backend: https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io (fully operational)

### ✅ **CORS Issue Resolution**

**Status**: **RESOLVED** - Backend CORS configuration has been fixed and tested.

**Issue**: Frontend was receiving CORS errors when attempting to connect to the backend API.

**Solution**: Backend CORS configuration was updated to properly allow requests from the frontend domain.

**Testing**: Use the "Test Backend Only" button in the deployed application to verify connectivity.

## Overview

This is a React 18 application built with Vite, featuring:
- Modern, responsive UI with Tailwind CSS
- AI model testing and interaction capabilities
- Professional homepage showcasing the system
- Azure AI Foundry integration with model-router
- Real-time voice chat capabilities
- **Beautiful dashboard with persistent navigation for AI Demo and Backend Test after authentication**
- **Simple unauthenticated AI connection test at `/ai-test`**
- **Full backend integration with Container Apps**

## Technology Stack

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **AI Integration**: Azure AI Foundry with model-router
- **Backend**: Node.js Container App
- **Deployment**: Azure Web Apps + Container Apps
- **CI/CD**: GitHub Actions
- **Authentication**: Microsoft Entra External ID (CIAM)

## Features

- 🏠 **Professional Homepage** - Showcases the AIMCS system and Zimax Networks
- 🤖 **AI Model Testing** - Interactive interface for testing Azure AI models via model-router
- 🎤 **Voice Chat** - Real-time voice interaction capabilities
- 🛠️ **Backend Test** - Diagnostics and API testing with full backend integration
- 📱 **Responsive Design** - Works seamlessly across all devices
- 🔧 **Easy Navigation** - Simple navigation between homepage, dashboard, AI demo, and backend test
- ✨ **Modern Dashboard** - Authenticated users see a beautiful, card-based dashboard with Tailwind, including navigation to all features
- 🧪 **AI Connection Test** - Visit `/ai-test` to verify AI secrets and connectivity without authentication
- 🔗 **Backend Integration** - Full API connectivity with health checks and model management

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AIMCS System (eastus2)                   │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)                                    │
│  https://aimcs-frontend-eastus2.azurewebsites.net           │
│  Custom Domain: https://aimcs.net                           │
│  ├── AI Integration (Azure AI Foundry)                      │
│  ├── Authentication (Microsoft Entra External ID)           │
│  └── Backend API Client                                     │
├─────────────────────────────────────────────────────────────┤
│  Backend (Node.js Container App)                            │
│  https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.  │
│  azurecontainerapps.io                                      │
│  Custom Domain: https://api.aimcs.net (in progress)         │
│  ├── Health Checks                                          │
│  ├── Model Management                                       │
│  ├── Chat API                                               │
│  └── Speech-to-Text                                         │
├─────────────────────────────────────────────────────────────┤
│  AI Services (Azure AI Foundry)                             │
│  https://aimcs-foundry.cognitiveservices.azure.com/         │
│  ├── Model Router Deployment                                │
│  ├── GPT-4o Mini                                            │
│  └── Claude 3 Haiku                                         │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

The system uses the following environment variables:

| Variable | Description | Current Value |
|----------|-------------|---------------|
| `VITE_AZURE_OPENAI_ENDPOINT` | Azure AI Foundry endpoint | `https://aimcs-foundry.cognitiveservices.azure.com/` |
| `VITE_AZURE_OPENAI_API_KEY` | AI Foundry API key | Configured |
| `VITE_AZURE_OPENAI_DEPLOYMENT` | Model deployment name | `model-router` |
| `VITE_BACKEND_API_URL` | Backend Container App URL | `https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io` |

## AI Model Routing & Deployment

AIMCS dynamically selects the optimal Azure OpenAI model for each request type:

- **Text chat**: Uses `model-router`, which automatically selects the best LLM (GPT-4.1, GPT-4.1-mini, GPT-4.1-nano, o4-mini) for each query based on complexity, cost, and performance. In our tests, model-router provided up to 60% cost savings with similar accuracy compared to using GPT-4.1 only. Context length is up to 200,000 input tokens and 32,768 output tokens (as of 2025-05-19 version). See [Model Router documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/model-router).
- **Audio/voice features**: Uses `gpt-4o-mini-audio-preview-2`, which supports audio input/output for real-time voice chat and speech features. This model is used for all audio-based requests and requires audio content in the request or response.

### Model Routing Logic
- The backend automatically routes text chat to `model-router` and audio/voice requests to `gpt-4o-mini-audio-preview-2`.
- This ensures high quality results, optimal cost, and support for advanced audio features.

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_OPENAI_DEPLOYMENT` | Model deployment for text chat | `model-router` |
| `AZURE_OPENAI_AUDIO_DEPLOYMENT` | Model deployment for audio/voice | `gpt-4o-mini-audio-preview-2` |

## Monorepo & Environment Variable Handling

- The project uses a monorepo structure with `aimcs-frontend` as a submodule.
- **Vite environment variables** (`VITE_...`) are injected at build time for security and performance.
- **GitHub Actions workflow** now builds and deploys from the `aimcs-frontend` directory, ensuring secrets are injected in the correct context.
- **Secrets are never committed to the repo**; they are managed via GitHub Secrets and Azure App Service settings.
- The `/ai-test` page provides a minimal, unauthenticated way to verify that AI secrets are present and working in the deployed frontend.

## CI/CD & Deployment

- **Automated builds and deployments** via GitHub Actions
- **Environment variables** are injected at build time for Vite
- **Azure Web App** is configured with the correct AI Foundry endpoint, API key, and deployment name
- **Backend Container App** is deployed separately and integrated via environment variables
- **Static file serving** configured to serve from `dist` directory

## Authentication with Microsoft Entra External ID (CIAM)

This project uses Microsoft Entra External ID (CIAM, formerly Azure AD B2C) for user authentication with email as the unique user identifier. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full authentication flow, troubleshooting, and lessons learned.

### Setup Steps

1. **Register the Application**
   - Register your frontend app in the Entra External ID (CIAM) tenant.
   - Note your **Client ID** and **Tenant ID**.
   - Set the redirect URI to your deployed frontend (e.g., `https://aimcs-frontend-eastus2.azurewebsites.net/`).

2. **Configure App Registration Settings**
   - Go to your CIAM tenant app registration in the Azure portal
   - Navigate to **Authentication** section
   - **Add Redirect URI**: `https://aimcs-frontend-eastus2.azurewebsites.net/` (root path, not `/auth/callback`)
   - **Enable ID Tokens**: In the **Token configuration** section, ensure ID tokens are enabled
   - **Configure Implicit grant and hybrid flows**: Enable "ID tokens" under implicit grant settings
   - **Save** the configuration

3. **Add Optional Claims**
   - Go to **Token configuration** in your app registration
   - Click **Add optional claim**
   - Select `email`, and any other claims you want (e.g., `family_name`, `given_name`)
   - Make sure to check "Turn on the Microsoft Graph email permission" if prompted
   - Click **Add**

4. **Set Up API Permissions and Grant Admin Consent**
   - Go to **API permissions** in your app registration
   - Click **Add a permission** > **Microsoft Graph** > **Delegated permissions**
   - Add the following permissions:
     - `openid` (Sign users in)
     - `profile` (View users' basic profile)
     - `email` (View users' email address)
     - `User.Read` (Sign in and read user profile)
   - Click **Add permissions**
   - Click **Grant admin consent for [your tenant]** to grant these permissions for all users
   - Ensure all permissions show as "Granted for [your tenant]"

5. **Create a User Flow**
   - In the Entra External ID portal, create a user flow (e.g., `aimcs-userflow`) with email passcode enabled.

6. **Configure MSAL in React**
   - Install dependencies:
     ```bash
     npm install @azure/msal-react @azure/msal-browser
     ```
   - Create `src/authConfig.js`:
     ```js
     export const msalConfig = {
       auth: {
         clientId: "<YOUR_CLIENT_ID>",
         authority: "https://<your-tenant>.ciamlogin.com/<tenant-id>/<user-flow>",
         redirectUri: "https://aimcs-frontend-eastus2.azurewebsites.net/",
         knownAuthorities: ["https://<your-tenant>.ciamlogin.com"],
         postLogoutRedirectUri: "https://aimcs-frontend-eastus2.azurewebsites.net/"
       },
       cache: {
         cacheLocation: "sessionStorage",
         storeAuthStateInCookie: false
       },
       system: {
         allowNativeBroker: false
       }
     };
     ```
   - Replace placeholders with your actual values.

7. **Wrap Your App in MSAL Provider**
   - In `src/main.jsx`:
     ```js
     import { PublicClientApplication } from "@azure/msal-browser";
     import { MsalProvider } from "@azure/msal-react";
     import { msalConfig } from "./authConfig";
     import App from "./App";
     import React from "react";
     import ReactDOM from "react-dom/client";

     const msalInstance = new PublicClientApplication(msalConfig);

     ReactDOM.createRoot(document.getElementById("root")).render(
       <MsalProvider instance={msalInstance}>
         <App />
       </MsalProvider>
     );
     ```

8. **Add Sign In/Out Buttons**
   - Example:
     ```js
     import { useMsal } from "@azure/msal-react";

     export function SignInButton() {
       const { instance } = useMsal();
       return <button onClick={() => instance.loginRedirect()}>Sign In</button>;
     }

     export function SignOutButton() {
       const { instance } = useMsal();
       return <button onClick={() => instance.logoutRedirect()}>Sign Out</button>;
     }
     ```

9. **How Passcode Email Works**
   - When a user starts the sign-in flow, Entra External ID automatically uses Microsoft Graph to send the passcode email. **No extra code is needed in your app for this.**

10. **Troubleshooting Authentication**
   - **Redirect URI Mismatch**: Ensure the redirect URI in your app registration exactly matches `https://aimcs-frontend-eastus2.azurewebsites.net/`
   - **ID Tokens Not Enabled**: Verify ID tokens are enabled in the app registration's token configuration
   - **User Flow Issues**: Check that the user flow is properly configured and published
   - **API Permissions**: Ensure all required Microsoft Graph permissions are granted and admin consent is given
   - **Console Errors**: Check browser console for detailed error messages during sign-in

11. **Next Steps**
   - Secure backend endpoints by validating the JWT access token.
   - Use the same CIAM tenant for backend API registration.

## Verifying CIAM Endpoint Configuration

To ensure your Microsoft Entra External ID (CIAM) tenant and user flow are correctly set up, you can verify the OpenID Connect endpoints using the metadata URL and a command-line script.

### 1. OpenID Configuration Metadata URL

You can check your CIAM OpenID configuration at:

```
https://zimaxai.ciamlogin.com/zimaxai.onmicrosoft.com/v2.0/.well-known/openid-configuration?appid=a9ad55e2-d46f-4bad-bce6-c95f1bc43018
```

This endpoint returns a JSON document with all the necessary endpoints for authentication, including:
- `authorization_endpoint`
- `token_endpoint`
- `issuer`
- `scopes_supported`

**Example endpoints from the metadata:**
- Authorization endpoint: `https://zimaxai.ciamlogin.com/96e7dd96-48b5-4991-a67e-1563013dfbe2/oauth2/v2.0/authorize`
- Token endpoint: `https://zimaxai.ciamlogin.com/96e7dd96-48b5-4991-a67e-1563013dfbe2/oauth2/v2.0/token`

Reference: [zimaxai.ciamlogin.com OpenID Configuration](https://zimaxai.ciamlogin.com/zimaxai.onmicrosoft.com/v2.0/.well-known/openid-configuration?appid=a9ad55e2-d46f-4bad-bce6-c95f1bc43018)

### 2. Command-Line Test Script

A script (`test-ciam-auth.sh`) is included to verify your CIAM endpoints and login flow from the command line. It will:
- Fetch the OpenID configuration
- Test the authorization endpoint (login page)
- Test the token endpoint (simulated code exchange)

**How to run:**
```bash
./test-ciam-auth.sh
```

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- Azure CLI (for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/zimaxnet/aimcs-frontend.git
cd aimcs-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
VITE_AZURE_OPENAI_ENDPOINT=https://aimcs-foundry.cognitiveservices.azure.com/
VITE_AZURE_OPENAI_API_KEY=your-api-key
VITE_AZURE_OPENAI_DEPLOYMENT=model-router
VITE_BACKEND_API_URL=https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Deployment

### Azure Web Apps Deployment

This project is configured for automatic deployment to Azure Web Apps via GitHub Actions.

#### Prerequisites

1. Azure Web App created and configured in `eastus2` region
2. Backend Container App deployed in `eastus2` region
3. GitHub repository secrets configured:
   - `AZURE_WEBAPP_PUBLISH_PROFILE`
   - `VITE_AZURE_OPENAI_ENDPOINT`
   - `VITE_AZURE_OPENAI_API_KEY`
   - `VITE_AZURE_OPENAI_DEPLOYMENT`
   - `VITE_BACKEND_API_URL`

#### Deployment Process

1. Push changes to the `main` or `master` branch
2. GitHub Actions will automatically:
   - Build the application
   - Deploy to Azure Web Apps
   - Set environment variables

#### Manual Deployment

If you need to deploy manually:

```bash
# Build the application
npm run build

# Deploy using Azure CLI
az webapp deployment source config-zip --resource-group aimcs-rg-eastus2 --name aimcs-frontend-eastus2 --src dist.zip
```

## Project Structure

```
src/
├── components/          # React components
│   ├── HomePage.jsx    # Main homepage
│   ├── ModelTest.jsx   # AI model testing interface
│   ├── ChatInterface.jsx
│   ├── ConnectionTest.jsx
│   ├── RealtimeVoiceChat.jsx
│   └── VoiceRecorder.jsx
├── services/           # API services
│   ├── azureAIService.js
│   ├── azureRealtimeService.js
│   ├── backendApi.js   # Backend API integration
│   └── modelApi.js
├── hooks/              # Custom React hooks
│   └── useVoiceRecorder.js
├── App.jsx            # Main application component
├── main.jsx           # Application entry point
└── index.css          # Global styles
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_AZURE_OPENAI_ENDPOINT` | Azure AI Foundry endpoint | Yes |
| `VITE_AZURE_OPENAI_API_KEY` | AI Foundry API key | Yes |
| `VITE_AZURE_OPENAI_DEPLOYMENT` | Model deployment name | Yes |
| `VITE_BACKEND_API_URL` | Backend Container App URL | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

© 2024 Zimax Networks. All rights reserved.

## Support

For support and questions, please contact the Zimax Networks AI Architecture and Engineering Team.

## ⚠️ Region Alignment Requirement (Important)

**All components must be deployed in the same Azure region as your Azure AI Foundry resource and model deployments.**

- For this project, the region is: **eastus2**
- If any component is in a different region, you may encounter 404 errors or network access issues when calling Azure AI services.
- Always create your resource group, App Service plan, Web App, and Container Apps in the same region as your Azure AI Foundry resource.

## Updated Deployment Process (2024)

1. **Create Resource Group and App Service Plan in eastus2**
2. **Deploy Frontend Web App in eastus2**
3. **Deploy Backend Container App in eastus2**
4. **Set environment variables for both frontend and backend to match your Azure AI Foundry resource**
5. **Update GitHub Actions workflow to deploy to the correct region and app name**
6. **(Optional) Move custom domain and SSL to the new Web App**

### Example Azure CLI for eastus2

```bash
# Create resource group
az group create --name aimcs-rg-eastus2 --location eastus2

# Create App Service plan
az appservice plan create --name aimcs-appservice-plan-eastus2 --resource-group aimcs-rg-eastus2 --sku B1 --is-linux --location eastus2

# Create Web App
az webapp create --name aimcs-frontend-eastus2 --resource-group aimcs-rg-eastus2 --plan aimcs-appservice-plan-eastus2 --runtime "NODE|20-lts"

# Set environment variables
az webapp config appsettings set --name aimcs-frontend-eastus2 --resource-group aimcs-rg-eastus2 --settings \
  VITE_AZURE_OPENAI_ENDPOINT="https://aimcs-foundry.cognitiveservices.azure.com/" \
  VITE_AZURE_OPENAI_API_KEY="<your-key>" \
  VITE_AZURE_OPENAI_DEPLOYMENT="model-router" \
  VITE_BACKEND_API_URL="https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io"
```

## Lessons Learned / Troubleshooting

- **404 errors from Azure AI services** can occur if your Web App or backend is in a different region than your AI Foundry resource, even if all environment variables are correct.
- **Cloud Shell and local dev may work** even when the Web App fails, due to Azure network policies.
- **Role assignments**: Ensure your GitHub Actions service principal has Contributor access to the new resource group.
- **Custom domains and SSL** must be reconfigured for new Web Apps in a new region.
- **Always update your GitHub Actions secrets** with the publish profile for the new Web App.
- **Backend integration**: Ensure the backend Container App is in the same region as the frontend for optimal performance.

## Current System Status

### ✅ **Frontend (aimcs-frontend-eastus2)**
- **Status**: ✅ Operational
- **URL**: https://aimcs-frontend-eastus2.azurewebsites.net
- **Region**: eastus2
- **Runtime**: Node.js 20 LTS
- **Features**: React 18, Vite, Tailwind CSS, AI integration

### ✅ **Backend (aimcs-backend-eastus2)**
- **Status**: ✅ Operational
- **URL**: https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io
- **Region**: eastus2
- **Runtime**: Node.js Container App
- **Features**: Health checks, model management, chat API, speech-to-text

### ✅ **AI Services (aimcs-foundry)**
- **Status**: ✅ Operational
- **Endpoint**: https://aimcs-foundry.cognitiveservices.azure.com/
- **Region**: eastus2
- **Deployment**: model-router
- **Models**: GPT-4o Mini, Claude 3 Haiku

### ✅ **Authentication (Microsoft Entra External ID)**
- **Status**: ✅ Configured
- **Provider**: CIAM (Customer Identity and Access Management)
- **Flow**: Email passcode authentication
- **Integration**: MSAL React

# Updated for AI Foundry deployment
# Updated deployment source configuration
# Trigger deployment - Thu Jun 26 18:52:59 MST 2025
# Trigger deployment with corrected GitHub integration
# Updated for backend integration fix
# Fix: Environment variables injected at build time
# Trigger deployment with backend URL fix
# Updated AI secrets for eastus2 migration - Thu Jun 26 19:45:53 MST 2025

## 🚦 Latest Progress & Test Results (June 27, 2025)

### ✅ End-to-End System Verification

All major AIMCS features have been tested and are fully operational:

- **Backend Health & Status**: `/health` and `/api/status` endpoints return healthy, AI is configured, and connection count is tracked.
- **AI Chat API**: `/api/chat` endpoint returns real Azure OpenAI responses, including token usage and context.
- **WebSocket Integration**: `/ws/audio` endpoint supports real-time WebSocket connections for both chat and audio streaming. Node.js and browser clients can connect, send test, chat, and ping messages, and receive AI responses.
- **Frontend**: React/Vite app is live and accessible at [aimcs-frontend-eastus2.azurewebsites.net](https://aimcs-frontend-eastus2.azurewebsites.net), with connection and audio WebSocket test pages.
- **Audio WebSocket Test**: The `AudioWebSocketTest` React component allows browser-based microphone access, real-time audio streaming, and message logging to the backend WebSocket endpoint.
- **CI/CD**: GitHub Actions workflow builds and deploys both frontend and backend, with environment variables injected at build time.
- **Region Alignment**: All resources are deployed in `eastus2` to ensure Azure OpenAI connectivity.

### 🧪 Recent Test Results

- **Backend API**: Health, status, and chat endpoints tested via `curl` and return correct responses.
- **WebSocket**: Node.js test script (`websocket-test.js`) successfully connects, sends/receives test, chat, and ping messages, and receives AI responses.
- **Frontend**: Accessible and functional, with all environment variables correctly injected and backend connectivity verified.
- **Audio Streaming**: Audio data is sent from browser to backend via WebSocket and acknowledged; further AI audio processing can be enabled as needed.

**System is ready for further development, production use, and demonstration.**
