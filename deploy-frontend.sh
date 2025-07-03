#!/bin/bash

# Simple Frontend Deployment Script
# Deploys built files to existing Azure Web App

set -e

echo "🚀 Deploying frontend to existing Azure Web App..."

# Build the application
echo "📦 Building the application..."
npm run build

# Copy web.config to dist
echo "📋 Copying web.config..."
cp web.config dist/

# Create deployment package
echo "📦 Creating deployment package..."
cd dist
zip -r ../dist.zip .
cd ..

# Deploy to existing web app
echo "📤 Deploying to Azure Web App..."
az webapp deployment source config-zip \
    --resource-group aimcs-rg-eastus2 \
    --name aimcs \
    --src dist.zip \
    --output none

# Get the Web App URL
WEB_APP_URL=$(az webapp show --name aimcs --resource-group aimcs-rg-eastus2 --query defaultHostName --output tsv)

echo "✅ Deployment completed successfully!"
echo "🌐 Your application is available at: https://$WEB_APP_URL"
echo "🌐 Custom domain: https://aimcs.net"
echo ""
echo "🧹 Cleaning up..."
rm -f dist.zip

echo "🎉 Frontend deployment complete!" 