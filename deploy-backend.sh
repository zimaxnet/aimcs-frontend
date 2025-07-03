#!/bin/bash

# AIMCS Backend Deployment Script for Azure Container Apps
# This script builds and deploys the backend with WebSocket support

set -e

echo "🚀 Deploying AIMCS Backend to Azure Container Apps..."

# Configuration variables
RESOURCE_GROUP=${RESOURCE_GROUP:-"aimcs-rg-eastus2"}
CONTAINER_APP_NAME=${CONTAINER_APP_NAME:-"aimcs-backend-eastus2"}
LOCATION=${LOCATION:-"eastus2"}
REGISTRY_NAME=${REGISTRY_NAME:-"aimcsregistry"}
IMAGE_NAME="aimcs-backend"
IMAGE_TAG="latest"

echo "📋 Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Container App: $CONTAINER_APP_NAME"
echo "   Location: $LOCATION"
echo "   Registry: $REGISTRY_NAME"
echo "   Image: $IMAGE_NAME:$IMAGE_TAG"

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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install it first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Create resource group if it doesn't exist
if ! az group show --name $RESOURCE_GROUP &> /dev/null; then
    echo "🏗️  Creating resource group..."
    az group create --name $RESOURCE_GROUP --location $LOCATION --output none
    echo "✅ Resource group created"
else
    echo "✅ Resource group already exists"
fi

# Create Container Registry if it doesn't exist
if ! az acr show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo "🏗️  Creating Container Registry..."
    az acr create \
        --name $REGISTRY_NAME \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --sku Basic \
        --admin-enabled true \
        --output none
    echo "✅ Container Registry created"
else
    echo "✅ Container Registry already exists"
fi

# Get registry login server
REGISTRY_LOGIN_SERVER=$(az acr show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)
echo "📡 Registry login server: $REGISTRY_LOGIN_SERVER"

# Login to Container Registry
echo "🔐 Logging in to Container Registry..."
az acr login --name $REGISTRY_NAME

# Build Docker image
echo "🔨 Building Docker image..."
docker build -f backend-Dockerfile -t $IMAGE_NAME:$IMAGE_TAG .

# Tag image for registry
FULL_IMAGE_NAME="$REGISTRY_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG"
docker tag $IMAGE_NAME:$IMAGE_TAG $FULL_IMAGE_NAME

# Push image to registry
echo "📤 Pushing image to registry..."
docker push $FULL_IMAGE_NAME

# Create Container Apps Environment if it doesn't exist
ENVIRONMENT_NAME="${CONTAINER_APP_NAME}-env"
if ! az containerapp env show --name $ENVIRONMENT_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo "🏗️  Creating Container Apps Environment..."
    az containerapp env create \
        --name $ENVIRONMENT_NAME \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --output none
    echo "✅ Container Apps Environment created"
else
    echo "✅ Container Apps Environment already exists"
fi

# Deploy Container App
echo "🚀 Deploying Container App..."
az containerapp create \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment $ENVIRONMENT_NAME \
    --image $FULL_IMAGE_NAME \
    --target-port 3000 \
    --ingress external \
    --allow-insecure false \
    --min-replicas 1 \
    --max-replicas 3 \
    --cpu 0.5 \
    --memory 1Gi \
    --env-vars \
        NODE_ENV=production \
        PORT=3000 \
        AZURE_OPENAI_TTS_DEPLOYMENT=gpt-4o-mini-tts \
    --output none

echo "✅ Container App deployed"

# Get the Container App URL
CONTAINER_APP_URL=$(az containerapp show \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query properties.configuration.ingress.fqdn \
    --output tsv)

echo ""
echo "🎉 Backend deployment completed successfully!"
echo ""
echo "📊 Summary:"
echo "   ✅ Container Registry: $REGISTRY_NAME"
echo "   ✅ Container App: $CONTAINER_APP_NAME"
echo "   ✅ Environment: $ENVIRONMENT_NAME"
echo "   ✅ Image: $FULL_IMAGE_NAME"
echo ""
echo "🔗 URLs:"
echo "   🌐 Backend API: https://$CONTAINER_APP_URL"
echo "   🔗 Health Check: https://$CONTAINER_APP_URL/health"
echo "   📡 WebSocket: wss://$CONTAINER_APP_URL/ws/audio"
echo "   📊 API Status: https://$CONTAINER_APP_URL/api/status"
echo ""
echo "🔧 Azure Portal: https://portal.azure.com/#@/resource/subscriptions/*/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.App/containerApps/$CONTAINER_APP_NAME"
echo ""
echo "🧪 Next steps:"
echo "   1. Test the health endpoint: curl https://$CONTAINER_APP_URL/health"
echo "   2. Test WebSocket connection from frontend"
echo "   3. Test audio streaming functionality"
echo ""
echo "📝 Environment variable for frontend:"
echo "   VITE_BACKEND_API_URL=https://$CONTAINER_APP_URL" 