#!/bin/bash

# Extract service key
SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.development.local | cut -d'"' -f2)
SUPABASE_URL="https://lzlrojoaxrqvmhempnkn.supabase.co"
TARGET_EMAIL="test@test.co.uk"
NEW_PASSWORD="Test123"
ORG_ID="c762845b-34fc-41ea-9e01-f70b81c44ff7"

echo "🔧 Resetting demo user password..."
echo ""

# Step 1: Try to find the user
echo "Step 1: Finding user..."
USER_DATA=$(curl -s -X GET "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json")

echo "$USER_DATA" > /tmp/users_response.json
echo "Response saved to /tmp/users_response.json"

# Check if we got an error
if echo "$USER_DATA" | grep -q "error"; then
  echo "❌ Error from API:"
  echo "$USER_DATA" | head -20
  echo ""
  echo "This is likely a database permission issue."
  echo "The auth.users table might not be accessible to supabase_auth_admin role."
  exit 1
fi

# Try to find the user ID
USER_ID=$(echo "$USER_DATA" | grep -A5 "$TARGET_EMAIL" | grep '"id"' | cut -d'"' -f4 | head -1)

if [ -z "$USER_ID" ]; then
  echo "❌ User $TARGET_EMAIL not found in the system"
  echo "Attempting to create new user..."

  # Create new user
  CREATE_DATA=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TARGET_EMAIL\",
      \"password\": \"$NEW_PASSWORD\",
      \"email_confirm\": true,
      \"user_metadata\": {
        \"first_name\": \"Test\",
        \"last_name\": \"User\"
      }
    }")

  echo "$CREATE_DATA"
  USER_ID=$(echo "$CREATE_DATA" | grep '"id"' | cut -d'"' -f4 | head -1)

  if [ -z "$USER_ID" ]; then
    echo "❌ Failed to create user"
    exit 1
  fi

  echo "✅ User created: $USER_ID"
else
  echo "✅ Found user: $USER_ID"

  # Update password
  echo ""
  echo "Step 2: Updating password..."
  UPDATE_DATA=$(curl -s -X PUT "$SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"password\": \"$NEW_PASSWORD\",
      \"email_confirm\": true
    }")

  if echo "$UPDATE_DATA" | grep -q "error"; then
    echo "❌ Error updating password:"
    echo "$UPDATE_DATA"
  else
    echo "✅ Password updated successfully"
  fi
fi

echo ""
echo "✅ Demo user is ready!"
echo ""
echo "Login credentials:"
echo "  Email: test@test.co.uk"
echo "  Password: Test123"
echo "  URL: https://login.gymleadhub.co.uk/owner-login"
