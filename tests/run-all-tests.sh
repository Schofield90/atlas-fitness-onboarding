#!/bin/bash

# Atlas Fitness - Comprehensive Test Suite Runner
# Runs all unit and E2E tests for critical bug fixes

set -e

echo "================================================"
echo "Atlas Fitness - Critical Fixes Test Suite"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run tests with nice output
run_test_suite() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running $test_name...${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    echo ""
}

# Check dependencies
echo "Checking dependencies..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Clean previous test results
echo "Cleaning previous test results..."
rm -rf coverage test-results playwright-report

# Unit Tests
echo ""
echo "================================================"
echo "UNIT TESTS"
echo "================================================"
echo ""

# Run each unit test file
run_test_suite "Leads Tests (Multi-tenancy & Export)" "npm test tests/unit/leads.test.ts"
run_test_suite "Booking Tests (Navigation Fix)" "npm test tests/unit/booking.test.ts"
run_test_suite "Staff Tests (Error Handling)" "npm test tests/unit/staff.test.ts"
run_test_suite "Conversations Tests (New Button)" "npm test tests/unit/conversations.test.ts"
run_test_suite "Forms Tests (Category Accordion)" "npm test tests/unit/forms.test.ts"
run_test_suite "Billing Tests (Error States)" "npm test tests/unit/billing.test.ts"

# E2E Tests
echo ""
echo "================================================"
echo "END-TO-END TESTS"
echo "================================================"
echo ""

# Start dev server for E2E tests
echo "Starting development server for E2E tests..."
npm run dev &
DEV_SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 10

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}Error: Development server failed to start${NC}"
    kill $DEV_SERVER_PID 2>/dev/null
    exit 1
fi

# Run E2E tests
run_test_suite "Full Flow E2E Tests" "npx playwright test tests/e2e/full-flow.test.ts"

# Stop dev server
echo "Stopping development server..."
kill $DEV_SERVER_PID 2>/dev/null

# Generate coverage report
echo ""
echo "================================================"
echo "COVERAGE REPORT"
echo "================================================"
echo ""

if [ -d "coverage" ]; then
    echo "Generating coverage report..."
    npx nyc report --reporter=text-summary
fi

# Summary
echo ""
echo "================================================"
echo "TEST SUMMARY"
echo "================================================"
echo ""
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed successfully!${NC}"
    echo ""
    echo "VERIFICATION COMPLETE:"
    echo "✓ Multi-tenancy fix verified"
    echo "✓ Export feedback working"
    echo "✓ Booking navigation fixed"
    echo "✓ Staff error handling improved"
    echo "✓ Conversations button functional"
    echo "✓ Forms categories working"
    echo "✓ Billing error states handled"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi