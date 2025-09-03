#!/bin/bash

# Test script for Facebook lead forms persistence

echo "🧪 Testing Facebook Lead Forms Persistence"
echo "========================================="

# Check if forms are saved in database
echo -e "\n1️⃣ Checking saved forms in database..."
curl -s "https://atlas-fitness-onboarding.vercel.app/api/integrations/facebook/lead-forms-fast?checkSaved=true" \
  -H "Cookie: $(cat ~/.atlas-cookies 2>/dev/null)" | jq '.'

echo -e "\n2️⃣ To test the full flow:"
echo "   a) Go to: https://atlas-fitness-onboarding.vercel.app/settings/integrations/facebook"
echo "   b) Select some lead forms and click 'Save Forms'"
echo "   c) Watch the browser console for logs"
echo "   d) Refresh the page"
echo "   e) The forms should still be selected"

echo -e "\n3️⃣ Debug endpoint to check database directly:"
echo "   https://atlas-fitness-onboarding.vercel.app/api/debug/check-lead-forms"

echo -e "\n✅ The fix deployed includes:"
echo "   - Fixed column name from 'status' to 'form_status'"
echo "   - Using upsert operation for insert/update"
echo "   - Frontend loads saved forms on page load"

echo -e "\nNote: You need to be authenticated to test these endpoints."