#!/bin/bash

# Create test@test.co.uk user via Supabase Auth Admin API

SUPABASE_URL="https://lzlrojoaxrqvmhempnkn.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjMzNzA5MCwiZXhwIjoyMDM3OTEzMDkwfQ.6yNl1g10KG8KHlYV94f5xPCQqkBBUd_lG1QZzXLTAIg"
ORG_ID="c762845b-34fc-41ea-9e01-f70b81c44ff7"

echo "Creating test user..."

# Create user via Auth Admin API
USER_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.co.uk",
    "password": "Test123",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Test",
      "last_name": "User"
    }
  }')

USER_ID=$(echo $USER_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "❌ Failed to create user"
  echo "$USER_RESPONSE"
  exit 1
fi

echo "✅ Created user: $USER_ID"
echo "Linking to organization..."

# Link to organization
export PGPASSWORD='@Aa80236661'
psql "postgresql://postgres@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres" << EOF
-- Link user to organization
INSERT INTO user_organizations (user_id, organization_id, role)
VALUES ('${USER_ID}', '${ORG_ID}', 'admin')
ON CONFLICT DO NOTHING;

-- Create staff record
INSERT INTO organization_staff (user_id, organization_id, first_name, last_name, email, role, permissions)
VALUES ('${USER_ID}', '${ORG_ID}', 'Test', 'User', 'test@test.co.uk', 'admin', '{"all": true}'::jsonb)
ON CONFLICT DO NOTHING;

SELECT '✅ User linked to organization and staff created';
EOF

echo ""
echo "==========================="
echo "✅ Test Account Created!"
echo "==========================="
echo "Login: test@test.co.uk"
echo "Password: Test123"
echo "Organization: Demo Fitness Studio"
echo "==========================="
