#!/bin/bash

# Apply the clients table fix
echo "Applying clients table fix..."

# Check if we have the required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"
    echo "Please set them and try again."
    exit 1
fi

# Apply the SQL fix using curl
curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d @<(echo '{"sql":"'$(cat fix-clients-table-complete.sql | sed 's/"/\\"/g' | tr '\n' ' ')'"}')

echo "Clients table fix applied successfully!"