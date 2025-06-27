#!/bin/bash

# Script to set backend environment variables
# Replace the placeholder values with your actual Azure OpenAI and Speech Services credentials

echo "Setting backend environment variables..."

# Set these values with your actual credentials
AZURE_OPENAI_API_KEY="your-openai-api-key-here"
AZURE_OPENAI_ENDPOINT="https://your-openai-resource.openai.azure.com/"
AZURE_OPENAI_DEPLOYMENT="your-deployment-name"
AZURE_SPEECH_KEY="your-speech-key-here"
AZURE_SPEECH_REGION="eastus2"

# Update the container app
az containerapp update \
  --name aimcs-backend \
  --resource-group aimcs-rg \
  --set-env-vars \
  AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
  AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
  AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
  AZURE_SPEECH_KEY="$AZURE_SPEECH_KEY" \
  AZURE_SPEECH_REGION="$AZURE_SPEECH_REGION"

echo "Environment variables updated. Restarting container app..."

# Restart the container app to pick up new environment variables
az containerapp revision restart \
  --name aimcs-backend \
  --resource-group aimcs-rg \
  --revision $(az containerapp revision list --name aimcs-backend --resource-group aimcs-rg --query "[0].name" -o tsv)

echo "Backend restarted. Testing health endpoint..."

# Wait a moment for restart
sleep 10

# Test the health endpoint
curl -s https://aimcs-backend.kindmoss-db398a44.eastus2.azurecontainerapps.io/health | jq .

echo "Done!" 