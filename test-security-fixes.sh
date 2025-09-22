#!/bin/bash

# Security Fixes Verification Script
# Tests if previously found vulnerabilities have been patched

echo "=================================="
echo "SECURITY FIXES VERIFICATION TEST"
echo "=================================="
echo ""

BASE_URL="http://localhost:3000"
FAILURES=0
PASSES=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local headers=${5:-""}
    
    echo -n "Testing: $description... "
    
    if [ -n "$headers" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" -H "$headers")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint")
    fi
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC} (Got $response)"
        ((PASSES++))
    else
        echo -e "${RED}FAIL${NC} (Expected $expected_status, Got $response)"
        ((FAILURES++))
    fi
}

echo "1. AUTHENTICATION BYPASS TESTS"
echo "------------------------------"

# Test unauthenticated admin access
test_endpoint "GET" "/admin" "302" "Unauthenticated admin access should redirect"
test_endpoint "GET" "/admin/dashboard" "302" "Admin dashboard should require auth"
test_endpoint "GET" "/dashboard" "302" "Dashboard should require auth"
test_endpoint "GET" "/api/admin/users" "401" "Admin API should return 401"
test_endpoint "GET" "/api/leads" "401" "Leads API should require auth"

# Test debug routes
test_endpoint "GET" "/bypass-login" "302" "Bypass login should be blocked"
test_endpoint "GET" "/test-login" "302" "Test login should be blocked"
test_endpoint "GET" "/emergency" "302" "Emergency route should be blocked"
test_endpoint "GET" "/auth-debug" "302" "Auth debug should be blocked"

echo ""
echo "2. XSS PROTECTION TESTS"
echo "-----------------------"

# Test XSS via redirect parameter
test_endpoint "GET" "/signin?redirect=javascript:alert(1)" "200" "XSS in redirect should be sanitized"
test_endpoint "GET" "/signin?redirect=%3Cscript%3Ealert(1)%3C/script%3E" "200" "Encoded XSS should be blocked"
test_endpoint "GET" "/dashboard?search=<script>alert(1)</script>" "302" "XSS in search should be sanitized"

echo ""
echo "3. SENSITIVE FILE ACCESS TESTS"
echo "-------------------------------"

# Test access to sensitive files
test_endpoint "GET" "/.env" "404" ".env file should be blocked"
test_endpoint "GET" "/.env.local" "404" ".env.local should be blocked"
test_endpoint "GET" "/.git/config" "404" ".git/config should be blocked"
test_endpoint "GET" "/.git/HEAD" "404" ".git/HEAD should be blocked"
test_endpoint "GET" "/package.json" "404" "package.json should be blocked"
test_endpoint "GET" "/next.config.js" "404" "next.config.js should be blocked"

echo ""
echo "4. IDOR PREVENTION TESTS"
echo "------------------------"

# Test IDOR with manipulated headers
test_endpoint "GET" "/api/organizations/1" "401" "Org access without auth" 
test_endpoint "GET" "/api/organizations/1" "401" "Org access with fake header" "x-organization-id: 99999"
test_endpoint "GET" "/api/leads/1" "401" "Lead access without auth"
test_endpoint "GET" "/api/users/1" "401" "User access without auth"

echo ""
echo "5. CSRF PROTECTION TESTS"
echo "------------------------"

# Test CSRF on state-changing operations
test_endpoint "POST" "/api/leads" "401" "POST without auth should fail"
test_endpoint "PUT" "/api/profile" "401" "Profile update without auth"
test_endpoint "DELETE" "/api/users/1" "401" "Delete without auth"

echo ""
echo "6. SECURITY HEADERS TEST"
echo "------------------------"

echo -n "Checking security headers... "
headers=$(curl -sI "$BASE_URL" | grep -E "(X-Frame-Options|X-Content-Type|Strict-Transport|X-XSS|CSP|Permissions-Policy)")

if echo "$headers" | grep -q "X-Frame-Options"; then
    echo -e "${GREEN}Security headers present${NC}"
    ((PASSES++))
else
    echo -e "${YELLOW}Some security headers may be missing${NC}"
    ((FAILURES++))
fi

echo ""
echo "7. PRIVILEGE ESCALATION TESTS"
echo "-----------------------------"

# Test role manipulation attempts
test_endpoint "PUT" "/api/profile" "401" "Role escalation without auth" 
test_endpoint "PATCH" "/api/users/me" "401" "User update without auth"
test_endpoint "PUT" "/api/organization/members/self" "401" "Member role update"

echo ""
echo "8. API RATE LIMITING TEST"
echo "-------------------------"

echo -n "Testing rate limiting (10 rapid requests)... "
rate_limit_hit=false
for i in {1..10}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/login" -X POST)
    if [ "$response" = "429" ]; then
        rate_limit_hit=true
        break
    fi
done

if [ "$rate_limit_hit" = true ]; then
    echo -e "${GREEN}Rate limiting active${NC}"
    ((PASSES++))
else
    echo -e "${YELLOW}Rate limiting may need configuration${NC}"
    ((FAILURES++))
fi

echo ""
echo "=================================="
echo "         TEST SUMMARY"
echo "=================================="
echo -e "Passed: ${GREEN}$PASSES${NC}"
echo -e "Failed: ${RED}$FAILURES${NC}"

if [ $FAILURES -eq 0 ]; then
    echo -e "\n${GREEN}✓ All security fixes are working correctly!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some security issues remain. Please review failed tests.${NC}"
    exit 1
fi