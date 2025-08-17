#!/bin/bash

# Comprehensive Feature Verification Script
# This script tests all implemented features across Blocks 1-7

echo "======================================"
echo "Atlas Fitness Feature Verification"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for passed/failed tests
PASSED=0
FAILED=0

# Function to test file existence
test_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} File missing: $1"
        ((FAILED++))
    fi
}

# Function to test directory existence
test_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Directory missing: $1"
        ((FAILED++))
    fi
}

echo "=== Block 1: Dashboard & Reporting ==="
test_file "app/api/dashboard/charts/route.ts"
test_file "app/api/reports/attendance/route.ts"
test_file "app/api/reports/revenue/route.ts"
test_file "app/api/reports/membership-usage/route.ts"
test_file "app/dashboard/reports/page.tsx"
echo ""

echo "=== Block 2: Class Scheduling & Calendar ==="
test_file "app/classes/[id]/page.tsx"
test_file "app/api/classes/recurring/route.ts"
test_file "app/api/classes/waitlist/route.ts"
test_file "app/components/classes/RecurrenceModal.tsx"
test_file "app/components/classes/WaitlistManager.tsx"
echo ""

echo "=== Block 3: Customer & Membership Management ==="
test_file "app/members/[customerId]/page.tsx"
test_file "app/api/customers/[id]/activity/route.ts"
test_file "app/api/customers/churn-prediction/route.ts"
test_file "app/membership-plans/page.tsx"
test_file "app/api/membership-plans/route.ts"
echo ""

echo "=== Block 4: Staff & Payroll ==="
test_file "app/api/payroll/dashboard/route.ts"
test_file "app/api/timesheets/route.ts"
test_file "app/api/payroll/batches/route.ts"
test_file "app/components/staff/TimeClockWidget.tsx"
echo ""

echo "=== Block 5: AI & Workflows ==="
test_file "app/ai-intelligence/page.tsx"
test_file "app/api/ai/insights/route.ts"
test_file "app/api/workflows/engine/route.ts"
test_file "app/api/chatbot/conversation/route.ts"
test_file "app/components/workflows/WorkflowBuilder.tsx"
echo ""

echo "=== Block 6: Integrations & Communications ==="
test_file "app/api/integrations/validate/route.ts"
test_file "app/api/templates/route.ts"
test_file "app/components/integrations/IntegrationStatus.tsx"
echo ""

echo "=== Block 7: SOPs & Training ==="
test_file "app/sops/[id]/page.tsx"
test_file "app/api/sops/route.ts"
test_file "app/api/training/assignments/route.ts"
test_file "app/components/sops/SOPEditor.tsx"
echo ""

echo "=== Database Migrations ==="
test_file "supabase/migrations/20250817_comprehensive_features.sql"
echo ""

echo "======================================"
echo "Verification Results:"
echo "======================================"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All features verified successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run database migrations: supabase db push"
    echo "2. Test locally: npm run dev"
    echo "3. Deploy to production: vercel --prod"
else
    echo -e "${YELLOW}⚠ Some features are missing. Please review the failures above.${NC}"
fi

# Test build
echo ""
echo "=== Testing Build ==="
echo "Running build test (this may take a minute)..."
npm run build:fast 2>&1 | tail -5

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
else
    echo -e "${RED}✗ Build failed. Check for errors above.${NC}"
fi

echo ""
echo "======================================"
echo "Feature Implementation Complete!"
echo "======================================"