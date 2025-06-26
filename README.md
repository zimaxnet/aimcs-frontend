# AIMCS Frontend

> **Deployment & Authentication Journey:**
> See [DEPLOYMENT.md](./DEPLOYMENT.md) for a detailed, step-by-step account of how we built, deployed, and debugged the AIMCS frontend with Azure CIAM authentication, including lessons learned and technical solutions.

The frontend application for the AI Multimodal Customer System (AIMCS), created by the Zimax Networks AI Architecture and Engineering Team.

## Overview

This is a React 18 application built with Vite, featuring:
- Modern, responsive UI with Tailwind CSS
- AI model testing and interaction capabilities
- Professional homepage showcasing the system
- Azure AI Foundry integration
- Real-time voice chat capabilities
- **Beautiful dashboard with persistent navigation for AI Demo and Backend Test after authentication**
- **Simple unauthenticated AI connection test at `/ai-test`**

## Technology Stack

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **AI Integration**: Azure AI Foundry
- **Deployment**: Azure Web Apps
- **CI/CD**: GitHub Actions

## Features

- 🏠 **Professional Homepage** - Showcases the AIMCS system and Zimax Networks
- 🤖 **AI Model Testing** - Interactive interface for testing Azure AI models
- 🎤 **Voice Chat** - Real-time voice interaction capabilities
- 🛠️ **Backend Test** - Diagnostics and API testing
- 📱 **Responsive Design** - Works seamlessly across all devices
- 🔧 **Easy Navigation** - Simple navigation between homepage, dashboard, AI demo, and backend test
- ✨ **Modern Dashboard** - Authenticated users see a beautiful, card-based dashboard with Tailwind, including navigation to all features
- 🧪 **AI Connection Test** - Visit `/ai-test` to verify AI secrets and connectivity without authentication

## Monorepo & Environment Variable Handling

- The project uses a monorepo structure with `aimcs-frontend` as a submodule.
- **Vite environment variables** (`VITE_...`) are injected at build time for security and performance.
- **GitHub Actions workflow** now builds and deploys from the `aimcs-frontend` directory, ensuring secrets are injected in the correct context.
- **Secrets are never committed to the repo**; they are managed via GitHub Secrets and Azure App Service settings.
- The `/ai-test` page provides a minimal, unauthenticated way to verify that AI secrets are present and working in the deployed frontend.

## CI/CD & Deployment

- **Automated builds and deployments** via GitHub Actions
- **Environment variables** are injected at build time for Vite
- **Azure Web App** is configured with the correct OpenAI endpoint, API key, and deployment name

## Authentication with Microsoft Entra External ID (CIAM)

This project uses Microsoft Entra External ID (CIAM, formerly Azure AD B2C) for user authentication with email as the unique user identifier. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full authentication flow, troubleshooting, and lessons learned.

### Setup Steps

1. **Register the Application**
   - Register your frontend app in the Entra External ID (CIAM) tenant.
   - Note your **Client ID** and **Tenant ID**.
   - Set the redirect URI to your deployed frontend (e.g., `https://aimcs.net/`).

2. **Configure App Registration Settings**
   - Go to your CIAM tenant app registration in the Azure portal
   - Navigate to **Authentication** section
   - **Add Redirect URI**: `https://aimcs.net/` (root path, not `/auth/callback`)
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
         redirectUri: "https://aimcs.net/",
         knownAuthorities: ["https://<your-tenant>.ciamlogin.com"],
         postLogoutRedirectUri: "https://aimcs.net/"
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
   - **Redirect URI Mismatch**: Ensure the redirect URI in your app registration exactly matches `https://aimcs.net/`
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
chmod +x test-ciam-auth.sh
./test-ciam-auth.sh
```

**Expected output:**
- OpenID configuration is found and valid
- Authorization endpoint returns a login page
- Token endpoint returns a 400 error for an invalid code (proves endpoint is live)

### 3. Manual Browser Test

You can also test the login flow manually:
- Open the authorization URL printed by the script in your browser
- Enter your email address
- Check your email for the passcode
- Enter the passcode to complete authentication

If you see the Microsoft login page and can complete the flow, your CIAM setup is correct.

---

**If you have issues:**
- Double-check your user flow name, app registration, and permissions in Azure
- Make sure the metadata URL returns a valid JSON document with endpoints
- Reference the [OpenID Configuration](https://zimaxai.ciamlogin.com/zimaxai.onmicrosoft.com/v2.0/.well-known/openid-configuration?appid=a9ad55e2-d46f-4bad-bce6-c95f1bc43018) for troubleshooting

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn

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
VITE_MODEL_API_URL=https://your-backend-api-url
VITE_MODEL_API_KEY=your-api-key
VITE_MODEL_NAME=your-model-name
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

1. Azure Web App created and configured
2. GitHub repository secrets configured:
   - `AZURE_WEBAPP_PUBLISH_PROFILE`
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT`

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
az webapp deployment source config-zip --resource-group <resource-group> --name <webapp-name> --src dist.zip
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
| `VITE_MODEL_API_URL` | Backend API URL | Yes |
| `VITE_MODEL_API_KEY` | API key for authentication | Yes |
| `VITE_MODEL_NAME` | Default model name | No |

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