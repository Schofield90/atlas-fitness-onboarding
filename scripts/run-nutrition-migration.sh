#!/bin/bash

echo "🔧 Running nutrition database migration via API..."
echo "=================================================="

# Check if the server is running
SERVER_URL="http://localhost:3000"

# First check migration status
echo "📋 Checking current migration status..."
curl -s "$SERVER_URL/api/admin/apply-nutrition-migration" \
  -H "Cookie: $(cat ~/.atlas-auth-cookie 2>/dev/null)" | jq '.' || echo "Status check failed"

echo ""
echo "📄 Applying migration..."

# Run the migration
RESPONSE=$(curl -s -X POST "$SERVER_URL/api/admin/apply-nutrition-migration" \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat ~/.atlas-auth-cookie 2>/dev/null)")

if [ $? -eq 0 ]; then
  echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
  
  # Check if successful
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
  
  if [ "$SUCCESS" = "true" ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo "🥗 The nutrition coach should now work correctly."
  else
    echo ""
    echo "⚠️  Migration completed with some issues. Please review the output above."
  fi
else
  echo "❌ Failed to connect to the server."
  echo "Make sure the development server is running: npm run dev"
fi