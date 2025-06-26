# Azure Web App Deployment Guide

This guide will help you deploy the AI MCP Frontend to Azure Web App.

## Prerequisites

1. **Azure Account**: You need an active Azure subscription
2. **Azure CLI**: Install from [https://docs.microsoft.com/en-us/cli/azure/install-azure-cli](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. **Azure OpenAI Resource**: You need an Azure OpenAI resource with GPT-4o-mini-realtime-preview deployment

## Step 1: Azure OpenAI Setup

1. Create an Azure OpenAI resource in the Azure Portal
2. Deploy the `gpt-4o-mini-realtime-preview` model
3. Note down your:
   - Endpoint URL (e.g., `https://your-resource.openai.azure.com`)
   - API Key
   - Deployment name

## Step 2: Deploy to Azure Web App

### Option A: Using Azure CLI (Quick)

1. **Login to Azure**:
   ```bash
   az login
   ```

2. **Run the deployment script**:
   ```bash
   ./deploy-azure.sh
   ```

3. **Set environment variables** in Azure Portal:
   - Go to your Web App in Azure Portal
   - Navigate to Settings > Configuration > Application settings
   - Add these environment variables:
     - `VITE_AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint
     - `VITE_AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key
     - `VITE_AZURE_OPENAI_DEPLOYMENT`: Your deployment name

4. **Restart the Web App** to apply the environment variables

### Option B: Using GitHub Actions (Recommended)

1. **Fork this repository** to your GitHub account

2. **Get Azure Web App publish profile**:
   - Create a Web App in Azure Portal
   - Go to Overview > Get publish profile
   - Download the file

3. **Set up GitHub Secrets**:
   - Go to your repository Settings > Secrets and variables > Actions
   - Add these secrets:
     - `AZURE_WEBAPP_PUBLISH_PROFILE`: Content of the publish profile file
     - `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint
     - `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key
     - `AZURE_OPENAI_DEPLOYMENT`: Your deployment name

4. **Push to main branch** - GitHub Actions will automatically deploy

## Step 3: Verify Deployment

1. **Check the Web App URL** (provided after deployment)
2. **Test microphone access** - the app requires HTTPS for microphone access
3. **Check browser console** for any errors
4. **Test voice conversation** with the AI

## Troubleshooting

### Common Issues

1. **"Failed to access microphone"**
   - Ensure you're using HTTPS
   - Check browser permissions
   - Try refreshing the page

2. **"Failed to connect to Azure OpenAI"**
   - Verify your endpoint URL and API key
   - Check if your deployment supports Realtime API
   - Ensure environment variables are set correctly

3. **"Build failed"**
   - Check that all dependencies are installed
   - Verify Node.js version (18+ required)
   - Check for any syntax errors in the code

### Environment Variables

Make sure these are set in your Azure Web App:

```bash
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
VITE_AZURE_OPENAI_API_KEY=your-api-key-here
VITE_AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini-realtime-preview
```

### Azure OpenAI Quotas

- Check your Azure OpenAI service quotas
- Ensure you have sufficient tokens for the Realtime API
- Monitor usage in Azure Portal

## Cost Optimization

1. **Use Basic App Service Plan** for development/testing
2. **Monitor Azure OpenAI usage** to avoid unexpected costs
3. **Set up spending limits** in Azure
4. **Use appropriate model tiers** based on your needs

## Security Best Practices

1. **Store API keys securely** in Azure Key Vault
2. **Use managed identities** when possible
3. **Enable HTTPS only** in Azure Web App
4. **Regularly rotate API keys**
5. **Monitor access logs**

## Support

- **Azure Documentation**: [https://docs.microsoft.com/en-us/azure/](https://docs.microsoft.com/en-us/azure/)
- **Azure OpenAI Documentation**: [https://docs.microsoft.com/en-us/azure/ai-services/openai/](https://docs.microsoft.com/en-us/azure/ai-services/openai/)
- **GitHub Issues**: Report bugs in the repository

# AIMCS Frontend: Deployment & Authentication Journey

## Project Goals

- **Modern, secure AI customer system** with React frontend, Node.js backend, and Azure infrastructure.
- **Authentication** via Microsoft Entra External ID (CIAM, formerly Azure AD B2C) with email as the unique user identifier.
- **Seamless deployment** to Azure Web Apps, with robust CI/CD and diagnostics.

---

## Key Steps & Lessons Learned

### 1. Frontend Setup & Theming
- Built with React 18, Vite, and Tailwind CSS.
- Created a professional homepage with a "desert twilight" theme and Zimax Networks branding.
- Added a diagnostics dashboard to show backend connection status.

### 2. Authentication with Azure CIAM
- Registered the app in Azure Entra External ID (CIAM).
- Configured the app for **ID token implicit flow** and set the redirect URI to `https://aimcs.net/`.
- Added `email` as an optional claim and enabled ID tokens in the app registration.
- Used a direct redirect to the working CIAM login URL for reliability:
  ```
  https://zimaxai.ciamlogin.com/zimaxai.onmicrosoft.com/oauth2/v2.0/authorize?client_id=...&redirect_uri=...&scope=openid&response_type=id_token&prompt=login
  ```
- **Lesson:** The `id_token` is returned in the URL hash fragment (`#id_token=...`), not the query string.  
  We updated our JavaScript to check both locations for the token.

### 3. Token Decoding & User Identity
- Decoded the JWT `id_token` in the browser to extract claims.
- **Lesson:** The OID (Object ID) was not always present or reliable.  
  We switched to using the `email` claim as the unique user identifier.
- Updated the UI and debug panel to show only the email and IDP (identity provider).

### 4. Diagnostics & User Experience
- Added a debug panel to show authentication status, email, IDP, and backend status.
- After login, the "Sign In" button changes to "Signed In ✓" and a "Home" button appears for authenticated users.
- The Home button is a placeholder for future navigation/dashboard features.

### 5. Azure Deployment & Caching Issues
- Deployed the frontend as a static site to Azure Web Apps using `az webapp deploy`.
- **Lesson:** Azure App Service can aggressively cache old files.  
  We resolved this by:
  - Manually clearing the `wwwroot` directory via Kudu Debug Console.
  - Deploying a "Hello World" HTML to confirm the cache was cleared.
  - Redeploying the real app, which then worked as expected.

### 6. CI/CD & Automation
- Used GitHub Actions for automated deployment.
- Ensured that the build output (`dist/`) is zipped and deployed to Azure.

---

## Example: Token Extraction Logic

```js
function getIdTokenFromUrl() {
  // Check query string
  let params = new URLSearchParams(window.location.search);
  if (params.get('id_token')) return params.get('id_token');
  // Check hash fragment
  if (window.location.hash) {
    params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (params.get('id_token')) return params.get('id_token');
  }
  return null;
}
```

---

## What We Learned

- **Always check both the query string and hash for tokens** in OAuth/OpenID flows.
- **Email is the most reliable user identifier** in CIAM/B2C scenarios.
- **Azure App Service caching can be persistent**—clear `wwwroot` and deploy a test file if you're stuck.
- **Direct authentication redirects are often more reliable** than complex MSAL setups for simple SPAs.
- **Diagnostics and user feedback are critical** for debugging and user trust.

---

## Next Steps

- Implement a real dashboard or navigation for authenticated users.
- Integrate backend API calls with token validation.
- Expand diagnostics and error handling for production.

---

**This journey and these lessons are now part of the AIMCS project.  
Feel free to contribute, learn, and build on this foundation!** 