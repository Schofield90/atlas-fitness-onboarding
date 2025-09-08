#!/bin/bash

# Booking System QA Test Runner
# This script runs all tests related to the booking data consistency issues

set -e

echo "🔍 ATLAS FITNESS BOOKING SYSTEM QA TEST SUITE"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required environment variables are set
if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" || -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    echo -e "${RED}❌ Missing required environment variables${NC}"
    echo "Please ensure the following are set:"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    exit 1
fi

echo -e "${BLUE}📋 Running Booking System Tests...${NC}"
echo ""

# Create test results directory
mkdir -p test-results

echo -e "${YELLOW}1. Running Unit Tests for Attendees API${NC}"
echo "Testing edge cases and data mismatch scenarios..."
npm test -- __tests__/api/booking-attendees.test.ts --verbose --coverage

echo ""
echo -e "${YELLOW}2. Running E2E Tests for Calendar Data Consistency${NC}"
echo "Testing complete user workflow from calendar to detail views..."
npx playwright test e2e/booking-data-consistency.spec.ts --headed

echo ""
echo -e "${YELLOW}3. Generating Test Reports${NC}"

# Generate a summary report
cat > test-results/booking-qa-summary.md << EOF
# Booking System QA Test Report

Generated on: $(date)

## Issues Identified

### 1. Calendar Overview vs Detail View Data Mismatch
- **Root Cause**: Calendar overview uses \`bookings\` table, detail view uses \`class_bookings\` table
- **Impact**: Users see different booking counts between views
- **Severity**: High - affects user trust and data integrity

### 2. Unknown Customer Display
- **Root Cause**: NULL \`customer_id\` in \`class_bookings\` table or failed JOINs with \`leads\` table  
- **Impact**: Customers appear as "Unknown" with no membership info
- **Severity**: Medium - affects staff ability to manage classes

## Test Coverage

### Unit Tests (\`__tests__/api/booking-attendees.test.ts\`)
- ✅ API endpoint edge cases
- ✅ NULL customer handling
- ✅ Failed JOIN scenarios  
- ✅ Booking type mapping
- ✅ Data synchronization verification

### E2E Tests (\`e2e/booking-data-consistency.spec.ts\`)
- ✅ Complete user workflow testing
- ✅ Calendar to detail view navigation
- ✅ Visual verification of counts
- ✅ Unknown customer detection
- ✅ UI responsiveness under data issues

## Recommended Fixes

1. **Synchronize Booking Tables**: Ensure both \`bookings\` and \`class_bookings\` contain the same data
2. **Fix Customer References**: Ensure \`customer_id\` is properly set and references valid records
3. **Implement Data Validation**: Add checks to prevent NULL customer references
4. **Create Database Triggers**: Auto-sync between booking tables when data changes

## Run Commands

\`\`\`bash
# Unit tests only
npm test -- __tests__/api/booking-attendees.test.ts

# E2E tests only  
npx playwright test e2e/booking-data-consistency.spec.ts

# All booking tests
./scripts/run-booking-tests.sh
\`\`\`
EOF

echo -e "${GREEN}✅ Test suite completed!${NC}"
echo ""
echo "📊 Results saved to test-results/booking-qa-summary.md"
echo ""
echo -e "${BLUE}🔧 Next Steps:${NC}"
echo "1. Review test results and screenshots"
echo "2. Implement recommended database fixes"
echo "3. Re-run tests to verify fixes"
echo "4. Deploy with confidence!"