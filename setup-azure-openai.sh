#!/bin/bash

# Azure OpenAI Setup Script for AIMCS Voice Chat
# This script creates an Azure OpenAI resource and deploys the necessary models

set -e

echo "🚀 Setting up Azure OpenAI for AIMCS Voice Chat..."

# Configuration variables
RESOURCE_GROUP=${RESOURCE_GROUP:-"aimcs-rg"}
OPENAI_RESOURCE_NAME=${OPENAI_RESOURCE_NAME:-"aimcs-openai"}
LOCATION=${LOCATION:-"eastus2"}
SKU=${SKU:-"S0"}

echo "📋 Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   OpenAI Resource: $OPENAI_RESOURCE_NAME"
echo "   Location: $LOCATION"
echo "   SKU: $SKU"

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

# Check if resource group exists
if ! az group show --name $RESOURCE_GROUP &> /dev/null; then
    echo "🏗️  Creating resource group..."
    az group create --name $RESOURCE_GROUP --location $LOCATION --output none
    echo "✅ Resource group created"
else
    echo "✅ Resource group already exists"
fi

# Check if Azure OpenAI resource exists
if ! az cognitiveservices account show --name $OPENAI_RESOURCE_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo "🧠 Creating Azure OpenAI resource..."
    az cognitiveservices account create \
        --name $OPENAI_RESOURCE_NAME \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --kind OpenAI \
        --sku $SKU \
        --output none
    
    echo "✅ Azure OpenAI resource created"
else
    echo "✅ Azure OpenAI resource already exists"
fi

# Wait for the resource to be fully provisioned
echo "⏳ Waiting for Azure OpenAI resource to be ready..."
sleep 30

# Get the endpoint
ENDPOINT=$(az cognitiveservices account show \
    --name $OPENAI_RESOURCE_NAME \
    --resource-group $RESOURCE_GROUP \
    --query properties.endpoint \
    --output tsv)

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

# Check available models using the correct command
echo "🔍 Checking available models..."
MODELS=$(az cognitiveservices account deployment list \
    --name $OPENAI_RESOURCE_NAME \
    --resource-group $RESOURCE_GROUP \
    --output json 2>/dev/null || echo "[]")

echo "📋 Current deployments:"
if [ "$MODELS" != "[]" ]; then
    echo $MODELS | jq -r '.[].{Name:name, Model:model.name, Status:properties.provisioningState}' | column -t
else
    echo "No deployments found"
fi

# Create deployment for GPT-4o-mini (for basic chat)
echo "🚀 Creating GPT-4o-mini deployment..."
if ! echo $MODELS | jq -r '.[].name' | grep -q "gpt-4o-mini"; then
    az cognitiveservices account deployment create \
        --name "gpt-4o-mini" \
        --resource-group $RESOURCE_GROUP \
        --name $OPENAI_RESOURCE_NAME \
        --model-name "gpt-4o-mini" \
        --model-version "2024-05-13" \
        --model-format OpenAI \
        --scale-settings-scale-type Standard \
        --output none
    
    echo "✅ GPT-4o-mini deployment created"
else
    echo "✅ GPT-4o-mini deployment already exists"
fi

# Try to create GPT-4o-mini-realtime-preview deployment
echo "🚀 Attempting to create GPT-4o-mini-realtime-preview deployment..."
if ! echo $MODELS | jq -r '.[].name' | grep -q "gpt-4o-mini-realtime-preview"; then
    if az cognitiveservices account deployment create \
        --name "gpt-4o-mini-realtime-preview" \
        --resource-group $RESOURCE_GROUP \
        --name $OPENAI_RESOURCE_NAME \
        --model-name "gpt-4o-mini-realtime-preview" \
        --model-version "2024-12-01" \
        --model-format OpenAI \
        --scale-settings-scale-type Standard \
        --output none 2>/dev/null; then
        echo "✅ GPT-4o-mini-realtime-preview deployment created"
        REALTIME_DEPLOYMENT="gpt-4o-mini-realtime-preview"
    else
        echo "⚠️  GPT-4o-mini-realtime-preview not available, trying alternative..."
        
        # Try GPT-4o-realtime-preview
        if ! echo $MODELS | jq -r '.[].name' | grep -q "gpt-4o-realtime-preview"; then
            if az cognitiveservices account deployment create \
                --name "gpt-4o-realtime-preview" \
                --resource-group $RESOURCE_GROUP \
                --name $OPENAI_RESOURCE_NAME \
                --model-name "gpt-4o-realtime-preview" \
                --model-version "2024-12-01" \
                --model-format OpenAI \
                --scale-settings-scale-type Standard \
                --output none 2>/dev/null; then
                echo "✅ GPT-4o-realtime-preview deployment created"
                REALTIME_DEPLOYMENT="gpt-4o-realtime-preview"
            else
                echo "⚠️  Realtime models not available in this region/SKU"
                echo "   Using GPT-4o-mini for basic functionality"
                REALTIME_DEPLOYMENT="gpt-4o-mini"
            fi
        else
            echo "✅ GPT-4o-realtime-preview deployment already exists"
            REALTIME_DEPLOYMENT="gpt-4o-realtime-preview"
        fi
    fi
else
    echo "✅ GPT-4o-mini-realtime-preview deployment already exists"
    REALTIME_DEPLOYMENT="gpt-4o-mini-realtime-preview"
fi

# List all deployments
echo "📋 Current deployments:"
az cognitiveservices account deployment list \
    --name $OPENAI_RESOURCE_NAME \
    --resource-group $RESOURCE_GROUP \
    --output table

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

# Set environment variables in Azure Web App
echo ""
echo "🚀 Setting environment variables in Azure Web App..."
WEB_APP_NAME="aimcs-frontend"

if az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
    az webapp config appsettings set \
        --name $WEB_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --settings \
        VITE_AZURE_OPENAI_ENDPOINT="$ENDPOINT" \
        VITE_AZURE_OPENAI_API_KEY="$KEY1" \
        VITE_AZURE_OPENAI_DEPLOYMENT="$REALTIME_DEPLOYMENT" \
        --output none
    
    echo "✅ Environment variables set in Azure Web App"
    
    # Restart the web app to apply changes
    echo "🔄 Restarting Azure Web App..."
    az webapp restart --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --output none
    echo "✅ Azure Web App restarted"
else
    echo "⚠️  Azure Web App '$WEB_APP_NAME' not found"
    echo "   Please set the environment variables manually in Azure Portal"
fi

echo ""
echo "🎉 Azure OpenAI setup completed successfully!"
echo ""
echo "📊 Summary:"
echo "   ✅ Azure OpenAI Resource: $OPENAI_RESOURCE_NAME"
echo "   ✅ Endpoint: $ENDPOINT"
echo "   ✅ Deployment: $REALTIME_DEPLOYMENT"
echo "   ✅ Environment variables configured"
echo ""
echo "🔗 Azure Portal: https://portal.azure.com/#@/resource/subscriptions/*/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.CognitiveServices/accounts/$OPENAI_RESOURCE_NAME"
echo ""
echo "🧪 Next steps:"
echo "   1. Test the voice chat at https://aimcs.net"
echo "   2. Use the setup screen to verify configuration"
echo "   3. Test microphone and WebSocket connections" 