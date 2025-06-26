#!/bin/bash

# Azure OpenAI CLI Commands Reference
# This script shows you how to get Azure OpenAI configuration using Azure CLI

echo "🔍 Azure OpenAI CLI Commands Reference"
echo "======================================"
echo ""

# Configuration variables (you can override these)
RESOURCE_GROUP=${RESOURCE_GROUP:-"aimcs-rg"}
OPENAI_RESOURCE_NAME=${OPENAI_RESOURCE_NAME:-"aimcs-openai"}

echo "📋 Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   OpenAI Resource: $OPENAI_RESOURCE_NAME"
echo ""

echo "🚀 Quick Commands:"
echo ""

echo "1. List all Azure OpenAI resources in a resource group:"
echo "   az cognitiveservices account list --resource-group $RESOURCE_GROUP"
echo ""

echo "2. Get Azure OpenAI endpoint:"
echo "   az cognitiveservices account show --name $OPENAI_RESOURCE_NAME --resource-group $RESOURCE_GROUP --query properties.endpoint --output tsv"
echo ""

echo "3. Get Azure OpenAI API keys:"
echo "   az cognitiveservices account keys list --name $OPENAI_RESOURCE_NAME --resource-group $RESOURCE_GROUP"
echo ""

echo "4. List all deployments:"
echo "   az cognitiveservices account deployment list --name $OPENAI_RESOURCE_NAME --resource-group $RESOURCE_GROUP"
echo ""

echo "5. Get specific deployment details:"
echo "   az cognitiveservices account deployment show --name gpt-4o-mini-realtime-preview --account-name $OPENAI_RESOURCE_NAME --resource-group $RESOURCE_GROUP"
echo ""

echo "6. Create a new deployment (if needed):"
echo "   az cognitiveservices account deployment create \\"
echo "     --name gpt-4o-mini-realtime-preview \\"
echo "     --account-name $OPENAI_RESOURCE_NAME \\"
echo "     --resource-group $RESOURCE_GROUP \\"
echo "     --model-name gpt-4o-mini-realtime-preview \\"
echo "     --model-version 2024-12-01 \\"
echo "     --model-format OpenAI \\"
echo "     --scale-settings-scale-type Standard"
echo ""

echo "🔧 Environment Variables:"
echo ""

# Get the actual values if Azure CLI is available
if command -v az &> /dev/null && az account show &> /dev/null; then
    echo "📊 Current values:"
    
    # Get endpoint
    ENDPOINT=$(az cognitiveservices account show --name $OPENAI_RESOURCE_NAME --resource-group $RESOURCE_GROUP --query properties.endpoint --output tsv 2>/dev/null || echo "Not found")
    echo "   VITE_AZURE_OPENAI_ENDPOINT=$ENDPOINT"
    
    # Get API key
    API_KEY=$(az cognitiveservices account keys list --name $OPENAI_RESOURCE_NAME --resource-group $RESOURCE_GROUP --query key1 --output tsv 2>/dev/null || echo "Not found")
    if [ "$API_KEY" != "Not found" ]; then
        echo "   VITE_AZURE_OPENAI_API_KEY=${API_KEY:0:8}..."
    else
        echo "   VITE_AZURE_OPENAI_API_KEY=$API_KEY"
    fi
    
    # Get deployments
    DEPLOYMENTS=$(az cognitiveservices account deployment list --name $OPENAI_RESOURCE_NAME --resource-group $RESOURCE_GROUP --query "[].name" --output tsv 2>/dev/null || echo "Not found")
    echo "   VITE_AZURE_OPENAI_DEPLOYMENT=$DEPLOYMENTS"
    
else
    echo "⚠️  Azure CLI not available or not logged in"
    echo "   Please run 'az login' first"
fi

echo ""
echo "📝 To use these values:"
echo "   1. Copy the values above"
echo "   2. Set them in your Azure Web App:"
echo "      az webapp config appsettings set \\"
echo "        --name YOUR_WEBAPP_NAME \\"
echo "        --resource-group $RESOURCE_GROUP \\"
echo "        --settings \\"
echo "        VITE_AZURE_OPENAI_ENDPOINT=\"YOUR_ENDPOINT\" \\"
echo "        VITE_AZURE_OPENAI_API_KEY=\"YOUR_API_KEY\" \\"
echo "        VITE_AZURE_OPENAI_DEPLOYMENT=\"YOUR_DEPLOYMENT\""
echo ""
echo "✅ Done!" 