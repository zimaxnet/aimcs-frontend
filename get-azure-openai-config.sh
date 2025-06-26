#!/bin/bash

# Azure OpenAI Configuration Fetcher
# This script fetches Azure OpenAI endpoint, API key, and deployment information using Azure CLI

set -e

echo "🔍 Fetching Azure OpenAI configuration..."

# Configuration variables (you can override these)
RESOURCE_GROUP=${RESOURCE_GROUP:-"aimcs-rg"}
OPENAI_RESOURCE_NAME=${OPENAI_RESOURCE_NAME:-"aimcs-resource"}

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

echo "📋 Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   OpenAI Resource: $OPENAI_RESOURCE_NAME"

# Get the OpenAI resource
echo "🔍 Looking for Azure OpenAI resource..."
OPENAI_RESOURCE=$(az cognitiveservices account list \
    --resource-group $RESOURCE_GROUP \
    --query "[?name=='$OPENAI_RESOURCE_NAME']" \
    --output json)

if [ "$OPENAI_RESOURCE" == "[]" ]; then
    echo "❌ Azure OpenAI resource '$OPENAI_RESOURCE_NAME' not found in resource group '$RESOURCE_GROUP'"
    echo ""
    echo "Available OpenAI resources in this resource group:"
    az cognitiveservices account list \
        --resource-group $RESOURCE_GROUP \
        --query "[].{Name:name, Kind:kind, Location:location}" \
        --output table
    exit 1
fi

# Extract endpoint
ENDPOINT=$(echo $OPENAI_RESOURCE | jq -r '.[0].properties.endpoint')
echo "✅ Endpoint: $ENDPOINT"

# Get API keys
echo "🔑 Fetching API keys..."
API_KEYS=$(az cognitiveservices account keys list \
    --name $OPENAI_RESOURCE_NAME \
    --resource-group $RESOURCE_GROUP \
    --output json)

KEY1=$(echo $API_KEYS | jq -r '.key1')
KEY2=$(echo $API_KEYS | jq -r '.key2')

echo "✅ Key 1: ${KEY1:0:8}..."
echo "✅ Key 2: ${KEY2:0:8}..."

# List available deployments
echo "🚀 Fetching deployments..."
DEPLOYMENTS=$(az cognitiveservices account deployment list \
    --name $OPENAI_RESOURCE_NAME \
    --resource-group $RESOURCE_GROUP \
    --output json)

echo "📋 Available deployments:"
echo $DEPLOYMENTS | jq -r '.[].{Name:name, Model:model.name, Status:properties.provisioningState}' | column -t

# Check for gpt-4o-mini-realtime-preview deployment
REALTIME_DEPLOYMENT=$(echo $DEPLOYMENTS | jq -r '.[] | select(.model.name | contains("gpt-4o-mini-realtime-preview")) | .name')

if [ -n "$REALTIME_DEPLOYMENT" ]; then
    echo "✅ Found realtime deployment: $REALTIME_DEPLOYMENT"
else
    echo "⚠️  No gpt-4o-mini-realtime-preview deployment found in CLI, but using known deployment name"
    REALTIME_DEPLOYMENT="gpt-4o-mini-realtime-preview"
fi

# Generate environment variables file
echo ""
echo "📝 Generating .env file..."
cat > .env << EOF
# Azure OpenAI Configuration
VITE_AZURE_OPENAI_ENDPOINT=$ENDPOINT
VITE_AZURE_OPENAI_API_KEY=$KEY1
VITE_AZURE_OPENAI_DEPLOYMENT=$REALTIME_DEPLOYMENT
EOF

echo "✅ Created .env file with Azure OpenAI configuration"

# Generate Azure Web App configuration
echo ""
echo "📝 Azure Web App environment variables to set:"
echo "VITE_AZURE_OPENAI_ENDPOINT=$ENDPOINT"
echo "VITE_AZURE_OPENAI_API_KEY=$KEY1"
echo "VITE_AZURE_OPENAI_DEPLOYMENT=$REALTIME_DEPLOYMENT"

# Generate Azure CLI command to set Web App settings
echo ""
echo "🚀 To set these in your Azure Web App, run:"
echo "az webapp config appsettings set \\"
echo "    --name YOUR_WEBAPP_NAME \\"
echo "    --resource-group $RESOURCE_GROUP \\"
echo "    --settings \\"
echo "    VITE_AZURE_OPENAI_ENDPOINT=\"$ENDPOINT\" \\"
echo "    VITE_AZURE_OPENAI_API_KEY=\"$KEY1\" \\"
echo "    VITE_AZURE_OPENAI_DEPLOYMENT=\"$REALTIME_DEPLOYMENT\""

echo ""
echo "✅ Configuration fetched successfully!" 