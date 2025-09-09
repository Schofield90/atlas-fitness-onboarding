#!/bin/bash

# Test OTP Login Locally
# This script speeds up testing by automating the OTP flow

PORT=3002
BASE_URL="http://localhost:$PORT"
EMAIL="sam@atlas-gyms.co.uk"

echo "🚀 Testing OTP Login Flow Locally"
echo "================================"
echo "Server: $BASE_URL"
echo "Email: $EMAIL"
echo ""

# Step 1: Send OTP
echo "📧 Step 1: Sending OTP..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/login-otp" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"send\",\"email\":\"$EMAIL\"}")

echo "Response: $RESPONSE"

# Extract OTP if in test mode
OTP=$(echo $RESPONSE | grep -o '"testModeOTP":"[0-9]*"' | cut -d'"' -f4)

if [ -z "$OTP" ]; then
  echo "❌ Failed to get OTP. Response: $RESPONSE"
  exit 1
fi

echo "✅ OTP received: $OTP"
echo ""

# Step 2: Verify OTP
echo "🔐 Step 2: Verifying OTP..."
VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/login-otp" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"verify\",\"email\":\"$EMAIL\",\"otp\":\"$OTP\"}")

echo "Response: $VERIFY_RESPONSE"

# Extract auth URL
AUTH_URL=$(echo $VERIFY_RESPONSE | grep -o '"authUrl":"[^"]*"' | cut -d'"' -f4)

if [ -z "$AUTH_URL" ]; then
  echo "❌ Failed to get auth URL"
  exit 1
fi

echo ""
echo "✅ Authentication successful!"
echo ""
echo "📌 Magic Link URL:"
echo "$AUTH_URL"
echo ""
echo "🌐 You can now:"
echo "1. Open the magic link in your browser to complete login"
echo "2. Or visit $BASE_URL/login-otp to test the full flow"
echo "3. Check $BASE_URL/client after authentication"
echo ""
echo "💡 Tip: The OTP code '$OTP' is valid for 10 minutes"