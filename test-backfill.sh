#!/bin/bash

# Test GoCardless payment backfill endpoint
# This will link existing unlinked payments to clients

ORGANIZATION_ID="ee1206d7-62fb-49cf-9f39-95b9c54423a4"

echo "Testing GoCardless payment backfill..."
echo "Organization ID: $ORGANIZATION_ID"
echo ""

curl -X POST \
  https://login.gymleadhub.co.uk/api/gym/gocardless/backfill-payments \
  -H "Content-Type: application/json" \
  -d "{\"organizationId\": \"$ORGANIZATION_ID\"}" \
  | jq '.'

echo ""
echo "Backfill complete!"
