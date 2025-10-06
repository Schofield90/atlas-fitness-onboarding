#!/bin/bash

# Verify GoTeamUp Membership Import Results
# This script checks the database for imported memberships

echo "🔍 Verifying GoTeamUp Membership Import..."
echo ""

ORG_ID="ee1206d7-62fb-49cf-9f39-95b9c54423a4"
CLIENT_EMAIL="adambrantsmith@me.com"

# Source environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Missing environment variables"
    echo "   Please ensure .env.local contains:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo "Organization ID: $ORG_ID"
echo "Test Client Email: $CLIENT_EMAIL"
echo ""

# Check programs
echo "📦 Checking programs..."
PROGRAMS=$(curl -s -X POST "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_programs" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"org_id\": \"$ORG_ID\"}")

echo "$PROGRAMS" | jq '.'
echo ""

# Check memberships
echo "🎫 Checking memberships..."
MEMBERSHIPS=$(curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/memberships?select=*&organization_id=eq.$ORG_ID" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

echo "$MEMBERSHIPS" | jq '.'
echo ""

# Check client
echo "👤 Checking client..."
CLIENT=$(curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/clients?select=*&org_id=eq.$ORG_ID&email=eq.$CLIENT_EMAIL" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

echo "$CLIENT" | jq '.'
echo ""

# Count records
PROGRAM_COUNT=$(echo "$PROGRAMS" | jq 'length')
MEMBERSHIP_COUNT=$(echo "$MEMBERSHIPS" | jq 'length')
CLIENT_COUNT=$(echo "$CLIENT" | jq 'length')

echo "📊 Summary:"
echo "   Programs: $PROGRAM_COUNT"
echo "   Memberships: $MEMBERSHIP_COUNT"
echo "   Clients: $CLIENT_COUNT"
echo ""

if [ "$MEMBERSHIP_COUNT" -gt 0 ]; then
    echo "✅ Import successful! Memberships found in database."
else
    echo "❌ Import failed! No memberships found in database."
    exit 1
fi
