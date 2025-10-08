#!/bin/bash

# TeamUp PDF Import Verification Script
# This script manually tests the TeamUp import API endpoints

set -e

BASE_URL="https://login.gymleadhub.co.uk"
TEST_EMAIL="sam@atlas-gyms.co.uk"
TEST_PASSWORD="@Aa80236661"
PDF_PATH="/Users/samschofield/Downloads/TeamUp.pdf"

echo "==== TeamUp PDF Import Verification ===="
echo ""

# Step 1: Login and get session cookie
echo "[1/5] Logging in as $TEST_EMAIL..."
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "Login response: $LOGIN_RESPONSE"
echo ""

if [ ! -f cookies.txt ]; then
  echo "ERROR: Login failed - no cookies file created"
  exit 1
fi

# Step 2: Upload PDF
echo "[2/5] Uploading TeamUp.pdf..."
UPLOAD_RESPONSE=$(curl -s -b cookies.txt -X POST "$BASE_URL/api/classes/import/teamup-pdf/upload" \
  -F "file=@$PDF_PATH")

echo "Upload response:"
echo "$UPLOAD_RESPONSE" | jq '.'
PDF_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.pdfUrl // empty')

if [ -z "$PDF_URL" ]; then
  echo "ERROR: PDF upload failed"
  exit 1
fi

echo ""
echo "PDF uploaded successfully: $PDF_URL"
echo ""

# Step 3: Analyze PDF
echo "[3/5] Analyzing PDF to extract classes..."
ANALYZE_RESPONSE=$(curl -s -b cookies.txt -X POST "$BASE_URL/api/classes/import/teamup-pdf/analyze" \
  -H "Content-Type: application/json" \
  -d "{\"pdfUrl\":\"$PDF_URL\"}")

echo "Analyze response:"
echo "$ANALYZE_RESPONSE" | jq '.'
CLASSES_JSON=$(echo "$ANALYZE_RESPONSE" | jq '.data.classes')
CLASSES_COUNT=$(echo "$CLASSES_JSON" | jq 'length')

echo ""
echo "Classes extracted: $CLASSES_COUNT"
echo ""

if [ "$CLASSES_COUNT" -lt 40 ]; then
  echo "WARNING: Expected 40+ classes but got $CLASSES_COUNT"
fi

# Save classes to file for import
echo "$CLASSES_JSON" > /tmp/teamup-classes.json

# Step 4: Import classes to database
echo "[4/5] Importing classes to database..."
IMPORT_RESPONSE=$(curl -s -b cookies.txt -X POST "$BASE_URL/api/classes/import/teamup-pdf/import" \
  -H "Content-Type: application/json" \
  -d "{\"classes\":$CLASSES_JSON}")

echo "Import response:"
echo "$IMPORT_RESPONSE" | jq '.'

CLASS_TYPES_CREATED=$(echo "$IMPORT_RESPONSE" | jq -r '.data.classTypesCreated // 0')
SCHEDULES_CREATED=$(echo "$IMPORT_RESPONSE" | jq -r '.data.schedulesCreated // 0')
SESSIONS_CREATED=$(echo "$IMPORT_RESPONSE" | jq -r '.data.sessionsCreated // 0')

echo ""
echo "=== IMPORT RESULTS ==="
echo "Class Types Created: $CLASS_TYPES_CREATED"
echo "Schedules Created: $SCHEDULES_CREATED"
echo "Sessions Created: $SESSIONS_CREATED"
echo ""

# Verify success criteria
SUCCESS=true

if [ "$CLASS_TYPES_CREATED" -lt 30 ]; then
  echo "❌ FAIL: Expected 30+ class types but got $CLASS_TYPES_CREATED"
  SUCCESS=false
else
  echo "✅ PASS: Class types created ($CLASS_TYPES_CREATED)"
fi

if [ "$SCHEDULES_CREATED" -lt 40 ]; then
  echo "❌ FAIL: Expected 40+ schedules but got $SCHEDULES_CREATED"
  SUCCESS=false
else
  echo "✅ PASS: Schedules created ($SCHEDULES_CREATED)"
fi

MIN_SESSIONS=$((SCHEDULES_CREATED * 3))
if [ "$SESSIONS_CREATED" -lt "$MIN_SESSIONS" ]; then
  echo "❌ FAIL: Expected at least $MIN_SESSIONS sessions (3 weeks × $SCHEDULES_CREATED) but got $SESSIONS_CREATED"
  SUCCESS=false
else
  echo "✅ PASS: Sessions created ($SESSIONS_CREATED)"
fi

# Step 5: Show debug log sample
echo ""
echo "=== IMPORT DEBUG LOG (First 10 entries) ==="
echo "$IMPORT_RESPONSE" | jq -r '.data.debug.importLog[]?' | head -10

echo ""
echo "=== TEST SUMMARY ==="
if [ "$SUCCESS" = true ]; then
  echo "✅ ALL TESTS PASSED"
  echo ""
  echo "Next steps:"
  echo "1. Navigate to: $BASE_URL/dashboard/classes"
  echo "2. Verify classes appear in calendar"
  echo "3. Check random samples for correct day/time/instructor"
  exit 0
else
  echo "❌ SOME TESTS FAILED"
  echo ""
  echo "Check the import response above for errors"
  exit 1
fi

# Cleanup
rm -f cookies.txt /tmp/teamup-classes.json
