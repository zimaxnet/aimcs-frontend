#!/bin/bash

# Test script for AIMCS Backend
# This script tests the health endpoint and WebSocket connection

set -e

# Get backend URL from environment or use default
BACKEND_URL=${VITE_BACKEND_API_URL:-"https://aimcs-backend-eastus2.greenwave-bb2ac4ae.eastus2.azurecontainerapps.io"}

echo "🧪 Testing AIMCS Backend..."
echo "📡 Backend URL: $BACKEND_URL"
echo ""

# Test health endpoint
echo "1️⃣ Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health")
echo "✅ Health Response:"
echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
echo ""

# Test API status endpoint
echo "2️⃣ Testing API status endpoint..."
STATUS_RESPONSE=$(curl -s "$BACKEND_URL/api/status")
echo "✅ Status Response:"
echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
echo ""

# Test chat endpoint
echo "3️⃣ Testing chat endpoint..."
CHAT_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from test script!", "context": {"test": true}}')
echo "✅ Chat Response:"
echo "$CHAT_RESPONSE" | jq '.' 2>/dev/null || echo "$CHAT_RESPONSE"
echo ""

# Test WebSocket endpoint (basic connectivity)
echo "4️⃣ Testing WebSocket endpoint..."
WS_URL=$(echo "$BACKEND_URL" | sed 's/https:/wss:/' | sed 's/http:/ws:/')
echo "📡 WebSocket URL: $WS_URL/ws/audio"

# Use wscat if available, otherwise just show the URL
if command -v wscat &> /dev/null; then
    echo "🔌 Attempting WebSocket connection (will timeout after 5 seconds)..."
    timeout 5 wscat -c "$WS_URL/ws/audio" || echo "⚠️  WebSocket connection test completed (timeout expected)"
else
    echo "⚠️  wscat not installed. Install with: npm install -g wscat"
    echo "🔌 WebSocket URL for manual testing: $WS_URL/ws/audio"
fi

echo ""
echo "🎉 Backend testing completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Test WebSocket connection from frontend"
echo "   2. Test audio streaming functionality"
echo "   3. Monitor backend logs in Azure Portal" 