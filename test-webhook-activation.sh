#!/bin/bash

# Test webhook activation script
# Replace these values with your actual values

PAGE_ID="YOUR_PAGE_ID"
PAGE_ACCESS_TOKEN="YOUR_PAGE_ACCESS_TOKEN"

echo "Testing webhook activation for page: $PAGE_ID"
echo "================================================"

# Subscribe the page to webhooks
curl -X POST "https://graph.facebook.com/v18.0/$PAGE_ID/subscribed_apps" \
-H "Content-Type: application/json" \
-d "{
  \"subscribed_fields\": \"leadgen\",
  \"access_token\": \"$PAGE_ACCESS_TOKEN\"
}"

echo ""
echo ""
echo "Checking subscription status..."
echo "================================================"

# Check if subscription is active
curl -X GET "https://graph.facebook.com/v18.0/$PAGE_ID/subscribed_apps?access_token=$PAGE_ACCESS_TOKEN"

echo ""
echo ""
echo "Done! If successful, you should see your app in the subscribed_apps list."