#!/bin/bash

# CIAM Authentication Test Script (Updated for working metadata)
# This script tests the Microsoft Entra External ID (CIAM) authentication flow

set -e

echo "🔐 Testing CIAM Authentication Flow (Updated)"
echo "=================================="

# Configuration
CLIENT_ID="a9ad55e2-d46f-4bad-bce6-c95f1bc43018"
TENANT_ID="96e7dd96-48b5-4991-a67e-1563013dfbe2"
REDIRECT_URI="https://aimcs.net/"
AUTHORITY="https://zimaxai.ciamlogin.com/96e7dd96-48b5-4991-a67e-1563013dfbe2"
METADATA_URL="https://zimaxai.ciamlogin.com/zimaxai.onmicrosoft.com/v2.0/.well-known/openid-configuration?appid=$CLIENT_ID"

# Discover endpoints from metadata
OPENID_RESPONSE=$(curl -s "$METADATA_URL")
AUTH_ENDPOINT=$(echo "$OPENID_RESPONSE" | jq -r '.authorization_endpoint')
TOKEN_ENDPOINT=$(echo "$OPENID_RESPONSE" | jq -r '.token_endpoint')
ISSUER=$(echo "$OPENID_RESPONSE" | jq -r '.issuer')


echo "📋 Configuration:"
echo "   Client ID: $CLIENT_ID"
echo "   Tenant ID: $TENANT_ID"
echo "   Redirect URI: $REDIRECT_URI"
echo "   Authority: $AUTHORITY"
echo "   Metadata URL: $METADATA_URL"
echo "   Authorization Endpoint: $AUTH_ENDPOINT"
echo "   Token Endpoint: $TOKEN_ENDPOINT"
echo "   Issuer: $ISSUER"
echo ""

# Test 1: Check OpenID Configuration
echo "🔍 Test 1: Checking OpenID Configuration..."
if [ -n "$AUTH_ENDPOINT" ] && [ -n "$TOKEN_ENDPOINT" ]; then
    echo "   ✅ OpenID Configuration found"
    echo "   📄 Authorization Endpoint: $AUTH_ENDPOINT"
    echo "   📄 Token Endpoint: $TOKEN_ENDPOINT"
else
    echo "   ❌ OpenID Configuration missing endpoints"
    echo "   📄 Response: $OPENID_RESPONSE"
fi
echo ""

# Test 2: Check Authorization Endpoint
STATE=$(openssl rand -hex 16)
NONCE=$(openssl rand -hex 16)
AUTH_URL="$AUTH_ENDPOINT?client_id=$CLIENT_ID&response_type=code&redirect_uri=$REDIRECT_URI&scope=openid%20profile%20email&state=$STATE&nonce=$NONCE"
echo "🔍 Test 2: Checking Authorization Endpoint..."
echo "   🔗 Authorization URL (first 200 chars):"
echo "   ${AUTH_URL:0:200}..."
LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -H "Accept: text/html" "$AUTH_URL")
LOGIN_HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep -o 'HTTPSTATUS:[0-9]*' | cut -d: -f2)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed 's/HTTPSTATUS:[0-9]*$//')

if [ "$LOGIN_HTTP_CODE" = "200" ]; then
    echo "   ✅ Login page accessible"
    echo "   📄 Page title: $(echo "$LOGIN_BODY" | grep -o '<title>[^<]*</title>' | head -1)"
else
    echo "   ❌ Login page failed (HTTP $LOGIN_HTTP_CODE)"
    echo "   📄 Response preview: ${LOGIN_BODY:0:200}..."
fi
echo ""

# Test 3: Check Token Endpoint (simulate code exchange)
echo "🔍 Test 3: Token Endpoint Check..."
TOKEN_TEST_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=$CLIENT_ID&code=test_code&redirect_uri=$REDIRECT_URI")
TOKEN_HTTP_CODE=$(echo "$TOKEN_TEST_RESPONSE" | grep -o 'HTTPSTATUS:[0-9]*' | cut -d: -f2)
TOKEN_BODY=$(echo "$TOKEN_TEST_RESPONSE" | sed 's/HTTPSTATUS:[0-9]*$//')

if [ "$TOKEN_HTTP_CODE" = "400" ]; then
    echo "   ✅ Token endpoint accessible (expected 400 for invalid code)"
    echo "   📄 Error response: $(echo "$TOKEN_BODY" | jq -r '.error_description // .error' 2>/dev/null || echo "$TOKEN_BODY")"
elif [ "$TOKEN_HTTP_CODE" = "200" ]; then
    echo "   ⚠️  Token endpoint returned 200 (unexpected)"
else
    echo "   ❌ Token endpoint failed (HTTP $TOKEN_HTTP_CODE)"
    echo "   📄 Response: $TOKEN_BODY"
fi
echo ""

echo "🎯 Next Steps:"
echo "   1. If all tests pass, the CIAM configuration is correct"
echo "   2. You can now test the full flow with your email passcode"
echo "   3. The authorization URL above can be used to start the login flow"
echo ""
echo "📧 To test with email passcode:"
echo "   1. Open this URL in your browser:"
echo "   $AUTH_URL"
echo "   2. Enter your email address"
echo "   3. Check your email for the passcode"
echo "   4. Enter the passcode to complete authentication"
echo ""

echo "✅ CIAM Authentication Test Complete" 