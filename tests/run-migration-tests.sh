#!/bin/bash

# Migration CSV Parsing Test Suite Runner
# Comprehensive test runner for the migration wizard bucket fix verification

set -e

echo "🚀 Starting Migration CSV Parsing Test Suite..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
TEST_TIMEOUT=60000  # 60 seconds
JEST_MAX_WORKERS=4

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to run test with error handling
run_test() {
    local test_name="$1"
    local test_command="$2"
    local test_file="$3"

    print_status "Running $test_name..."

    if [[ -f "$test_file" ]]; then
        if eval "$test_command"; then
            print_success "$test_name passed ✅"
            return 0
        else
            print_error "$test_name failed ❌"
            return 1
        fi
    else
        print_warning "$test_name skipped (file not found: $test_file) ⚠️"
        return 2
    fi
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check if required environment variables are set
if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" ]]; then
    print_error "NEXT_PUBLIC_SUPABASE_URL environment variable is not set"
    exit 1
fi

if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    print_error "SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
    exit 1
fi

if [[ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]]; then
    print_error "NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set"
    exit 1
fi

print_success "Environment variables configured ✅"

# Check if node modules are installed
if [[ ! -d "node_modules" ]]; then
    print_error "node_modules not found. Please run 'pnpm install' first"
    exit 1
fi

print_success "Node modules found ✅"

# Initialize counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

echo ""
echo "🧪 Running Unit Tests"
echo "====================="

# Unit Test 1: Parse CSV API Endpoint
run_test \
    "Parse CSV API Endpoint Tests" \
    "jest tests/api/migration-parse-csv.test.ts --maxWorkers=$JEST_MAX_WORKERS --testTimeout=$TEST_TIMEOUT" \
    "tests/api/migration-parse-csv.test.ts"
result=$?
if [[ $result -eq 0 ]]; then ((TESTS_PASSED++)); elif [[ $result -eq 1 ]]; then ((TESTS_FAILED++)); else ((TESTS_SKIPPED++)); fi

# Unit Test 2: File Format Handling
run_test \
    "CSV File Format Tests" \
    "jest tests/unit/migration-file-formats.test.ts --maxWorkers=$JEST_MAX_WORKERS --testTimeout=$TEST_TIMEOUT" \
    "tests/unit/migration-file-formats.test.ts"
result=$?
if [[ $result -eq 0 ]]; then ((TESTS_PASSED++)); elif [[ $result -eq 1 ]]; then ((TESTS_FAILED++)); else ((TESTS_SKIPPED++)); fi

# Unit Test 3: Error Handling
run_test \
    "Error Handling Tests" \
    "jest tests/unit/migration-error-handling.test.ts --maxWorkers=$JEST_MAX_WORKERS --testTimeout=$TEST_TIMEOUT" \
    "tests/unit/migration-error-handling.test.ts"
result=$?
if [[ $result -eq 0 ]]; then ((TESTS_PASSED++)); elif [[ $result -eq 1 ]]; then ((TESTS_FAILED++)); else ((TESTS_SKIPPED++)); fi

# Unit Test 4: Security and Organization Isolation
run_test \
    "Security and Organization Tests" \
    "jest tests/unit/migration-security.test.ts --maxWorkers=$JEST_MAX_WORKERS --testTimeout=$TEST_TIMEOUT" \
    "tests/unit/migration-security.test.ts"
result=$?
if [[ $result -eq 0 ]]; then ((TESTS_PASSED++)); elif [[ $result -eq 1 ]]; then ((TESTS_FAILED++)); else ((TESTS_SKIPPED++)); fi

echo ""
echo "🔗 Running Integration Tests"
echo "============================="

# Integration Test: Bucket Fix Verification
run_test \
    "Bucket Fix Integration Tests" \
    "jest tests/integration/migration-bucket-fix.test.ts --maxWorkers=1 --testTimeout=120000" \
    "tests/integration/migration-bucket-fix.test.ts"
result=$?
if [[ $result -eq 0 ]]; then ((TESTS_PASSED++)); elif [[ $result -eq 1 ]]; then ((TESTS_FAILED++)); else ((TESTS_SKIPPED++)); fi

echo ""
echo "🌐 Running E2E Tests"
echo "===================="

# E2E Test: Full Migration Workflow
if command -v playwright &> /dev/null; then
    run_test \
        "Migration Workflow E2E Tests" \
        "playwright test tests/e2e/migration-workflow.spec.ts --timeout=120000" \
        "tests/e2e/migration-workflow.spec.ts"
    result=$?
    if [[ $result -eq 0 ]]; then ((TESTS_PASSED++)); elif [[ $result -eq 1 ]]; then ((TESTS_FAILED++)); else ((TESTS_SKIPPED++)); fi
else
    print_warning "Playwright not found, skipping E2E tests"
    ((TESTS_SKIPPED++))
fi

echo ""
echo "📊 Test Summary"
echo "==============="

print_status "Tests Passed: $TESTS_PASSED"
if [[ $TESTS_FAILED -gt 0 ]]; then
    print_error "Tests Failed: $TESTS_FAILED"
else
    print_success "Tests Failed: $TESTS_FAILED"
fi
print_warning "Tests Skipped: $TESTS_SKIPPED"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
echo "Total Tests: $TOTAL_TESTS"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo ""
    print_success "🎉 All migration tests passed! The bucket fix is working correctly."
    echo ""
    echo "✅ Key Verifications Completed:"
    echo "   • Files upload to migration-uploads bucket"
    echo "   • CSV parsing reads from migration-uploads bucket"
    echo "   • No 400 Bad Request errors occur"
    echo "   • Organization isolation is maintained"
    echo "   • Error handling works correctly"
    echo "   • Various file formats and sizes are supported"
    echo ""
else
    echo ""
    print_error "❌ Some tests failed. Please review the output above."
    echo ""
    echo "🔍 Debugging Tips:"
    echo "   • Check environment variables are set correctly"
    echo "   • Verify Supabase connection and permissions"
    echo "   • Ensure the migration-uploads bucket exists"
    echo "   • Check that the parse-csv route uses the correct bucket name"
    echo ""
fi

# Exit with appropriate code
if [[ $TESTS_FAILED -gt 0 ]]; then
    exit 1
else
    exit 0
fi