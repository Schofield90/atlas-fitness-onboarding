#!/bin/bash

# Test script for critical production fixes
echo "Testing Critical Production Fixes"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Verify public booking page exists
echo -e "\n${YELLOW}Test 1: Public Booking Page${NC}"
if [ -f "app/book/public/[organizationId]/page.tsx" ]; then
    echo -e "${GREEN}✓ Public booking page exists at app/book/public/[organizationId]/page.tsx${NC}"
else
    echo -e "${RED}✗ Public booking page NOT found${NC}"
    exit 1
fi

# Test 2: Verify staff API has correct join syntax
echo -e "\n${YELLOW}Test 2: Staff API Join Syntax${NC}"
if grep -q "users!user_id" app/api/staff/route.ts; then
    echo -e "${GREEN}✓ Staff API uses correct join syntax (users!user_id)${NC}"
else
    echo -e "${RED}✗ Staff API still has incorrect join syntax${NC}"
    exit 1
fi

# Test 3: Check that BookingWidget is imported correctly
echo -e "\n${YELLOW}Test 3: BookingWidget Import${NC}"
if grep -q "import { BookingWidget }" "app/book/public/[organizationId]/page.tsx"; then
    echo -e "${GREEN}✓ BookingWidget is properly imported${NC}"
else
    echo -e "${RED}✗ BookingWidget import not found${NC}"
    exit 1
fi

# Test 4: Check that organizationId is used as slug
echo -e "\n${YELLOW}Test 4: OrganizationId Usage${NC}"
if grep -q "slug={organizationId}" "app/book/public/[organizationId]/page.tsx"; then
    echo -e "${GREEN}✓ OrganizationId is passed as slug to BookingWidget${NC}"
else
    echo -e "${RED}✗ OrganizationId not properly passed to BookingWidget${NC}"
    exit 1
fi

echo -e "\n${GREEN}================================="
echo -e "All tests passed successfully! ✓${NC}"
echo -e "\n${YELLOW}Manual Testing Commands:${NC}"
echo "1. Test public booking page (replace with actual org ID):"
echo "   curl http://localhost:3000/book/public/63589490-8f55-4157-bd3a-e141594b748e"
echo ""
echo "2. Test staff API (requires authentication):"
echo "   curl http://localhost:3000/api/staff -H 'Cookie: [auth-cookie]'"
echo ""
echo "3. Start dev server to test:"
echo "   npm run dev"