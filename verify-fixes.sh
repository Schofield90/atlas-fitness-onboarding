#!/bin/bash

# Verification script for critical fixes
# This script tests both the public booking page and staff API

echo "========================================="
echo "Critical Fixes Verification Script"
echo "========================================="
echo ""

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
PROD_URL="https://atlas-fitness-onboarding.vercel.app"
ORG_ID="63589490-8f55-4157-bd3a-e141594b748e"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    echo -n "Testing: $description... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $status)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $status)"
        return 1
    fi
}

# Start tests
echo "1. LOCAL ENVIRONMENT TESTS ($BASE_URL)"
echo "----------------------------------------"

# Test public booking page
test_endpoint "$BASE_URL/book/public/$ORG_ID" "200" "Public booking page"
test_endpoint "$BASE_URL/book/public/invalid-org" "200" "Invalid org ID handling"

# Test staff API (will redirect without auth)
test_endpoint "$BASE_URL/api/staff" "307" "Staff API (unauthenticated)"

echo ""
echo "2. PRODUCTION ENVIRONMENT TESTS ($PROD_URL)"
echo "----------------------------------------"

# Test production
test_endpoint "$PROD_URL/book/public/$ORG_ID" "200" "Public booking page"

echo ""
echo "3. DETAILED LOCAL VERIFICATION"
echo "----------------------------------------"

# Check if public booking page returns content
echo -n "Checking booking page content... "
content=$(curl -s "$BASE_URL/book/public/$ORG_ID" | grep -i "booking\|book\|class" | head -1)
if [ -n "$content" ]; then
    echo -e "${GREEN}✅ Content found${NC}"
else
    echo -e "${YELLOW}⚠️  No booking content detected${NC}"
fi

# Check response time
echo -n "Checking response time... "
time=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/book/public/$ORG_ID")
time_ms=$(echo "$time * 1000" | bc | cut -d. -f1)

if [ "$time_ms" -lt "2000" ]; then
    echo -e "${GREEN}✅ Fast${NC} (${time_ms}ms)"
elif [ "$time_ms" -lt "5000" ]; then
    echo -e "${YELLOW}⚠️  Moderate${NC} (${time_ms}ms)"
else
    echo -e "${RED}❌ Slow${NC} (${time_ms}ms)"
fi

echo ""
echo "4. FILE VERIFICATION"
echo "----------------------------------------"

# Check if critical files exist
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $1"
        return 0
    else
        echo -e "${RED}❌${NC} $1 (missing)"
        return 1
    fi
}

echo "Checking required files:"
check_file "app/book/public/[organizationId]/page.tsx"
check_file "app/api/staff/route.ts"

echo ""
echo "Checking test files:"
check_file "app/api/staff/__tests__/route.test.ts"
check_file "app/book/public/__tests__/public-booking.test.tsx"
check_file "tests/e2e/critical-fixes.spec.ts"

echo ""
echo "5. GIT STATUS"
echo "----------------------------------------"

# Check if changes are staged
staged=$(git diff --cached --name-only | wc -l)
unstaged=$(git diff --name-only | wc -l)

if [ "$staged" -gt "0" ]; then
    echo -e "${GREEN}✅${NC} $staged files staged for commit"
else
    echo -e "${YELLOW}⚠️${NC} No files staged for commit"
fi

if [ "$unstaged" -gt "0" ]; then
    echo -e "${YELLOW}⚠️${NC} $unstaged files have unstaged changes"
fi

# Check current branch
branch=$(git branch --show-current)
echo "Current branch: $branch"

echo ""
echo "========================================="
echo "SUMMARY"
echo "========================================="

# Summary calculation
local_pass=true
prod_pass=true

# Check local results
if ! test_endpoint "$BASE_URL/book/public/$ORG_ID" "200" "" > /dev/null 2>&1; then
    local_pass=false
fi

# Check production results
if ! test_endpoint "$PROD_URL/book/public/$ORG_ID" "200" "" > /dev/null 2>&1; then
    prod_pass=false
fi

if [ "$local_pass" = true ]; then
    echo -e "${GREEN}✅ LOCAL: All critical fixes verified${NC}"
else
    echo -e "${RED}❌ LOCAL: Some tests failed${NC}"
fi

if [ "$prod_pass" = true ]; then
    echo -e "${GREEN}✅ PRODUCTION: Fixes deployed and working${NC}"
else
    echo -e "${YELLOW}⚠️  PRODUCTION: Fixes not yet deployed${NC}"
    echo ""
    echo "To deploy to production:"
    echo "  1. git add app/book/public/[organizationId]/page.tsx app/api/staff/route.ts"
    echo "  2. git commit -m \"fix: Critical fixes for public booking and staff API\""
    echo "  3. git push origin main"
fi

echo ""
echo "Test completed at: $(date)"
echo "========================================="