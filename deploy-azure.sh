#!/bin/bash

# Azure Web App Deployment Script
# This script builds and deploys the frontend to Azure Web App

set -e

echo "🚀 Starting Azure Web App deployment..."

# Install dependencies with legacy peer deps
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Build the application
echo "📦 Building the application..."
npm run build

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "🔐 Please log in to Azure first:"
    az login
fi

# Configuration variables (you can override these)
RESOURCE_GROUP=${RESOURCE_GROUP:-"aimcs-rg"}
WEB_APP_NAME=${WEB_APP_NAME:-"aimcs-frontend"}
LOCATION=${LOCATION:-"westus"}
NODE_VERSION=${NODE_VERSION:-"20-lts"}
OPENAI_RESOURCE_NAME=${OPENAI_RESOURCE_NAME:-"aimcs-resource"}

echo "📋 Deployment Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Web App Name: $WEB_APP_NAME"
echo "   Location: $LOCATION"
echo "   Node Version: $NODE_VERSION"
echo "   OpenAI Resource: $OPENAI_RESOURCE_NAME"

# Fetch Azure OpenAI configuration
echo "🔍 Fetching Azure OpenAI configuration..."
if [ -f "./get-azure-openai-config.sh" ]; then
    # Set environment variables for the config script
    export RESOURCE_GROUP=$RESOURCE_GROUP
    export OPENAI_RESOURCE_NAME=$OPENAI_RESOURCE_NAME
    
    # Run the configuration script
    source ./get-azure-openai-config.sh
    
    # Read the generated values
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
        echo "✅ Azure OpenAI configuration loaded"
    else
        echo "⚠️  Could not load Azure OpenAI configuration"
        echo "   Please run ./get-azure-openai-config.sh manually"
    fi
else
    echo "⚠️  Azure OpenAI config script not found"
    echo "   Please ensure get-azure-openai-config.sh exists"
fi

# Create resource group if it doesn't exist
echo "🏗️  Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION --output none

# Create App Service plan if it doesn't exist
echo "📋 Creating App Service plan..."
az appservice plan create \
    --name "${WEB_APP_NAME}-plan" \
    --resource-group $RESOURCE_GROUP \
    --sku B1 \
    --is-linux \
    --output none

# Create Web App if it doesn't exist
echo "🌐 Creating Web App..."
az webapp create \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --plan "${WEB_APP_NAME}-plan" \
    --runtime "NODE|${NODE_VERSION}" \
    --output none

# Configure the Web App
echo "⚙️  Configuring Web App..."
az webapp config set \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --startup-file "npm start" \
    --output none

# Set environment variables
echo "🔧 Setting environment variables..."
ENV_SETTINGS="WEBSITE_NODE_DEFAULT_VERSION=${NODE_VERSION} NPM_CONFIG_PRODUCTION=false"

# Add Azure OpenAI environment variables if available
if [ -n "$VITE_AZURE_OPENAI_ENDPOINT" ]; then
    ENV_SETTINGS="$ENV_SETTINGS VITE_AZURE_OPENAI_ENDPOINT=\"$VITE_AZURE_OPENAI_ENDPOINT\""
fi

if [ -n "$VITE_AZURE_OPENAI_API_KEY" ]; then
    ENV_SETTINGS="$ENV_SETTINGS VITE_AZURE_OPENAI_API_KEY=\"$VITE_AZURE_OPENAI_API_KEY\""
fi

if [ -n "$VITE_AZURE_OPENAI_DEPLOYMENT" ]; then
    ENV_SETTINGS="$ENV_SETTINGS VITE_AZURE_OPENAI_DEPLOYMENT=\"$VITE_AZURE_OPENAI_DEPLOYMENT\""
fi

az webapp config appsettings set \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings $ENV_SETTINGS \
    --output none

# Create deployment package
echo "📦 Creating deployment package..."
cd dist
zip -r ../dist.zip .
cd ..

# Deploy the application
echo "📤 Deploying application..."
az webapp deployment source config-zip \
    --resource-group $RESOURCE_GROUP \
    --name $WEB_APP_NAME \
    --src dist.zip \
    --output none

# Get the Web App URL
WEB_APP_URL=$(az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName --output tsv)

echo "✅ Deployment completed successfully!"
echo "🌐 Your application is available at: https://$WEB_APP_URL"
echo ""
echo "📝 Environment variables set:"
if [ -n "$VITE_AZURE_OPENAI_ENDPOINT" ]; then
    echo "   ✅ VITE_AZURE_OPENAI_ENDPOINT"
fi
if [ -n "$VITE_AZURE_OPENAI_API_KEY" ]; then
    echo "   ✅ VITE_AZURE_OPENAI_API_KEY"
fi
if [ -n "$VITE_AZURE_OPENAI_DEPLOYMENT" ]; then
    echo "   ✅ VITE_AZURE_OPENAI_DEPLOYMENT"
fi
echo ""
echo "🔗 Azure Portal: https://portal.azure.com/#@/resource/subscriptions/*/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$WEB_APP_NAME"
echo ""
echo "🧹 Cleaning up..."
rm -f dist.zip 