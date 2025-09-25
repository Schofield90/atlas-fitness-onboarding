#!/bin/bash

echo "🔍 Testing samschofield90@hotmail.co.uk login on members.gymleadhub.co.uk"
echo "============================================================"
echo ""

# Wait for deployment
echo "⏳ Waiting 45 seconds for deployment to complete..."
sleep 45

# Test 1: Send OTP
echo "1️⃣ Sending OTP request..."
SEND_RESPONSE=$(curl -s -X POST https://members.gymleadhub.co.uk/api/login-otp \
  -H "Content-Type: application/json" \
  -d '{"action": "send", "email": "samschofield90@hotmail.co.uk"}')

echo "Response: $SEND_RESPONSE"

# Check if successful
if echo "$SEND_RESPONSE" | grep -q '"success":true'; then
  echo "✅ OTP sent successfully!"
  
  # Get the OTP from database (for testing)
  echo ""
  echo "2️⃣ Checking OTP in database..."
  
  # This would normally be received via email
  echo "📧 Check email for OTP code"
  echo ""
  echo "To verify the OTP was generated, run:"
  echo "export \$(cat .env.local | xargs) && node -e \""
  echo "const { createClient } = require('@supabase/supabase-js');"
  echo "const supabase = createClient("
  echo "  process.env.NEXT_PUBLIC_SUPABASE_URL,"
  echo "  process.env.SUPABASE_SERVICE_ROLE_KEY,"
  echo "  { auth: { autoRefreshToken: false, persistSession: false } }"
  echo ");"
  echo "(async () => {"
  echo "  const { data } = await supabase"
  echo "    .from('otp_tokens')"
  echo "    .select('token, expires_at')"
  echo "    .eq('email', 'samschofield90@hotmail.co.uk')"
  echo "    .order('created_at', { ascending: false })"
  echo "    .limit(1);"
  echo "  if (data && data[0]) {"
  echo "    console.log('OTP Code:', data[0].token);"
  echo "    console.log('Expires:', data[0].expires_at);"
  echo "  }"
  echo "})();\""
  
else
  echo "❌ Failed to send OTP"
  echo "Error details: $SEND_RESPONSE"
  
  # Additional debugging
  echo ""
  echo "🔧 Debugging information:"
  echo "- Check if samschofield90@hotmail.co.uk exists in clients table"
  echo "- Verify RESEND_API_KEY is configured in Vercel"
  echo "- Check Vercel function logs for errors"
fi

echo ""
echo "3️⃣ Testing invalid email (should fail)..."
INVALID_RESPONSE=$(curl -s -X POST https://members.gymleadhub.co.uk/api/login-otp \
  -H "Content-Type: application/json" \
  -d '{"action": "send", "email": "nonexistent@example.com"}')

if echo "$INVALID_RESPONSE" | grep -q '"success":false'; then
  echo "✅ Correctly rejected invalid email"
else
  echo "⚠️  Security issue: Invalid email was accepted"
fi

echo ""
echo "4️⃣ Testing gym owner email (should be blocked)..."
OWNER_RESPONSE=$(curl -s -X POST https://members.gymleadhub.co.uk/api/login-otp \
  -H "Content-Type: application/json" \
  -d '{"action": "send", "email": "sam@atlas-gyms.co.uk"}')

if echo "$OWNER_RESPONSE" | grep -q "gym owner"; then
  echo "✅ Correctly blocked gym owner from members portal"
else
  echo "⚠️  Security issue: Gym owner not blocked"
  echo "Response: $OWNER_RESPONSE"
fi

echo ""
echo "✅ Test completed!"