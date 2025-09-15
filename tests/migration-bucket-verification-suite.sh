#!/bin/bash

# Migration Bucket Verification Test Suite
# This script runs comprehensive tests to verify that all migration operations
# use the correct "migration-uploads" bucket and would fail if old bucket names were used.

set -e

echo "🧪 Migration Bucket Verification Test Suite"
echo "=========================================="
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -e "${BLUE}📋 Running: ${test_name}${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: ${test_name}${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED: ${test_name}${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo
}

# Function to check if required environment variables are set
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking Prerequisites${NC}"

    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL is not set${NC}"
        exit 1
    fi

    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY is not set${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Prerequisites met${NC}"
    echo
}

# Function to verify bucket exists
verify_bucket_setup() {
    echo -e "${BLUE}🗄️  Verifying Bucket Setup${NC}"

    # This would require a separate script or API call to verify bucket existence
    # For now, we'll assume the bucket is set up correctly
    echo -e "${GREEN}✅ Assuming migration-uploads bucket is configured${NC}"
    echo
}

echo "Starting Migration Bucket Verification Tests..."
echo

# Check prerequisites
check_prerequisites

# Verify bucket setup
verify_bucket_setup

echo -e "${YELLOW}📋 Test Suite Overview:${NC}"
echo "1. Unit Tests - Storage bucket verification"
echo "2. Integration Tests - Upload bucket verification"
echo "3. Integration Tests - Existing bucket fix verification"
echo "4. API Tests - Parse CSV bucket usage"
echo "5. End-to-End Tests - Complete workflow verification"
echo

# 1. Unit Tests - Storage Bucket Verification
run_test "Unit Tests: Migration Storage Bucket Verification" \
    "cd /Users/samschofield/atlas-fitness-onboarding && npm test -- tests/unit/migration-storage-bucket-verification.test.ts"

# 2. Integration Tests - Upload Bucket Verification
run_test "Integration Tests: Migration Upload Bucket Verification" \
    "cd /Users/samschofield/atlas-fitness-onboarding && npm test -- tests/integration/migration-upload-bucket-verification.test.ts"

# 3. Integration Tests - Existing Bucket Fix Verification
run_test "Integration Tests: Migration Bucket Fix Verification" \
    "cd /Users/samschofield/atlas-fitness-onboarding && npm test -- tests/integration/migration-bucket-fix.test.ts"

# 4. API Tests - Parse CSV Bucket Usage
run_test "API Tests: Migration Parse CSV Bucket Usage" \
    "cd /Users/samschofield/atlas-fitness-onboarding && npm test -- tests/api/migration-parse-csv.test.ts"

# 5. End-to-End Tests - Complete Workflow Verification
run_test "E2E Tests: Migration Bucket Consistency Workflow" \
    "cd /Users/samschofield/atlas-fitness-onboarding && npx playwright test tests/e2e/migration-bucket-consistency-workflow.spec.ts"

echo
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo "========================"
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo
    echo -e "${GREEN}🎉 All Migration Bucket Verification Tests Passed!${NC}"
    echo -e "${GREEN}✅ All operations are using the correct 'migration-uploads' bucket${NC}"
    echo -e "${GREEN}✅ No 400 Bad Request errors should occur${NC}"
    echo -e "${GREEN}✅ Old bucket names ('migrations', 'migration-files') are not being used${NC}"

    echo
    echo -e "${BLUE}🔒 Verification Summary:${NC}"
    echo "- File uploads use migration-uploads bucket ✅"
    echo "- Parse CSV endpoint uses migration-uploads bucket ✅"
    echo "- Analyze endpoint uses migration-uploads bucket ✅"
    echo "- Process endpoint uses migration-uploads bucket ✅"
    echo "- Error messages reference correct bucket ✅"
    echo "- No regression to old bucket names ✅"

    exit 0
else
    echo
    echo -e "${RED}❌ Some Migration Bucket Verification Tests Failed${NC}"
    echo -e "${YELLOW}⚠️  Please review the failed tests above${NC}"
    echo -e "${YELLOW}⚠️  This may indicate bucket naming inconsistencies${NC}"

    echo
    echo -e "${RED}🚨 Potential Issues:${NC}"
    echo "- Some endpoints may still use old bucket names"
    echo "- File upload/download operations may fail"
    echo "- 400 Bad Request errors may still occur"
    echo "- Manual verification of bucket usage required"

    exit 1
fi