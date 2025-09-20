#!/bin/bash

# Atlas Fitness Calendar E2E Test Runner
# 
# This script provides an easy way to run the comprehensive calendar E2E tests
# with different configurations and options.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEST_SUITE="all"
BROWSER="chromium"
HEADED=false
TRACE=false
DEBUG=false
UI_MODE=false
PARALLEL=false
RETRIES=1
TIMEOUT=120000
REPORT_TYPE="html"

# Function to display usage
show_usage() {
    echo -e "${BLUE}Atlas Fitness Calendar E2E Test Runner${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  -s, --suite SUITE     Test suite to run (default: all)"
    echo "                        Options: all, time-display, navigation, timezone, database"
    echo "  -b, --browser BROWSER Browser to use (default: chromium)"
    echo "                        Options: chromium, firefox, safari, mobile"
    echo "  -h, --headed          Run in headed mode (show browser)"
    echo "  -t, --trace           Enable trace recording"
    echo "  -d, --debug           Enable debug mode with verbose output"
    echo "  -u, --ui              Run in UI mode for interactive debugging"
    echo "  -p, --parallel        Run tests in parallel (faster but may cause conflicts)"
    echo "  -r, --retries N       Number of retries for failed tests (default: 1)"
    echo "  --timeout N           Test timeout in milliseconds (default: 120000)"
    echo "  --report TYPE         Report type (default: html)"
    echo "                        Options: html, json, list, junit"
    echo "  --help                Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                                    # Run all tests with default settings"
    echo "  $0 -s time-display -b firefox -h     # Run time display tests in Firefox headed mode"
    echo "  $0 -s navigation -t -d                # Run navigation tests with trace and debug"
    echo "  $0 -u                                 # Run all tests in UI mode for debugging"
    echo "  $0 -s database --timeout 180000      # Run database tests with extended timeout"
    echo ""
    echo "ENVIRONMENT VARIABLES:"
    echo "  NEXT_PUBLIC_SUPABASE_URL             Supabase project URL (required)"
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY        Supabase anon key (required)"
    echo "  SUPABASE_SERVICE_ROLE_KEY            Supabase service role key (required)"
    echo "  BASE_URL                             Application base URL (default: http://localhost:3000)"
    echo "  ARCHIVE_TEST_RESULTS                 Set to 'true' to archive results after tests"
    echo ""
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--suite)
                TEST_SUITE="$2"
                shift 2
                ;;
            -b|--browser)
                BROWSER="$2"
                shift 2
                ;;
            -h|--headed)
                HEADED=true
                shift
                ;;
            -t|--trace)
                TRACE=true
                shift
                ;;
            -d|--debug)
                DEBUG=true
                shift
                ;;
            -u|--ui)
                UI_MODE=true
                shift
                ;;
            -p|--parallel)
                PARALLEL=true
                shift
                ;;
            -r|--retries)
                RETRIES="$2"
                shift 2
                ;;
            --timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --report)
                REPORT_TYPE="$2"
                shift 2
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Validate environment
validate_environment() {
    echo -e "${BLUE}🔍 Validating environment...${NC}"
    
    # Check required environment variables
    local missing_vars=()
    
    if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" ]]; then
        missing_vars+=("NEXT_PUBLIC_SUPABASE_URL")
    fi
    
    if [[ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]]; then
        missing_vars+=("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    fi
    
    if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
        missing_vars+=("SUPABASE_SERVICE_ROLE_KEY")
    fi
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        echo -e "${RED}❌ Missing required environment variables:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "${RED}   - $var${NC}"
        done
        echo ""
        echo -e "${YELLOW}💡 Please set these variables before running the tests.${NC}"
        echo -e "${YELLOW}   You can create a .env.local file or export them in your shell.${NC}"
        exit 1
    fi
    
    # Check if Playwright is installed
    if ! command -v npx &> /dev/null; then
        echo -e "${RED}❌ npx command not found. Please install Node.js and npm.${NC}"
        exit 1
    fi
    
    # Check if Playwright browsers are installed
    if ! npx playwright list | grep -q "chromium"; then
        echo -e "${YELLOW}⚠️  Playwright browsers not detected. Installing...${NC}"
        npx playwright install
    fi
    
    echo -e "${GREEN}✅ Environment validation complete${NC}"
}

# Get test files based on suite
get_test_files() {
    case $TEST_SUITE in
        "all")
            echo "e2e/calendar-time-display-comprehensive.spec.ts e2e/calendar-navigation-comprehensive.spec.ts e2e/calendar-timezone-edge-cases.spec.ts e2e/calendar-database-consistency.spec.ts"
            ;;
        "time-display")
            echo "e2e/calendar-time-display-comprehensive.spec.ts"
            ;;
        "navigation")
            echo "e2e/calendar-navigation-comprehensive.spec.ts"
            ;;
        "timezone")
            echo "e2e/calendar-timezone-edge-cases.spec.ts"
            ;;
        "database")
            echo "e2e/calendar-database-consistency.spec.ts"
            ;;
        *)
            echo -e "${RED}❌ Unknown test suite: $TEST_SUITE${NC}"
            echo -e "${YELLOW}Available suites: all, time-display, navigation, timezone, database${NC}"
            exit 1
            ;;
    esac
}

# Build Playwright command
build_command() {
    local test_files=$1
    local cmd="npx playwright test"
    
    # Add test files
    cmd="$cmd $test_files"
    
    # Add configuration file
    cmd="$cmd --config=playwright.calendar.config.ts"
    
    # Add browser project
    case $BROWSER in
        "chromium")
            cmd="$cmd --project=calendar-chrome"
            ;;
        "firefox")
            cmd="$cmd --project=calendar-firefox"
            ;;
        "safari")
            cmd="$cmd --project=calendar-safari"
            ;;
        "mobile")
            cmd="$cmd --project=calendar-mobile"
            ;;
        *)
            echo -e "${RED}❌ Unknown browser: $BROWSER${NC}"
            echo -e "${YELLOW}Available browsers: chromium, firefox, safari, mobile${NC}"
            exit 1
            ;;
    esac
    
    # Add options
    if [[ "$HEADED" == true ]]; then
        cmd="$cmd --headed"
    fi
    
    if [[ "$TRACE" == true ]]; then
        cmd="$cmd --trace=on"
    fi
    
    if [[ "$UI_MODE" == true ]]; then
        cmd="$cmd --ui"
    fi
    
    if [[ "$PARALLEL" == true ]]; then
        cmd="$cmd --workers=4"
    else
        cmd="$cmd --workers=1"
    fi
    
    if [[ "$DEBUG" == true ]]; then
        cmd="DEBUG=pw:* $cmd"
    fi
    
    # Add retries
    cmd="$cmd --retries=$RETRIES"
    
    # Add timeout
    cmd="$cmd --timeout=$TIMEOUT"
    
    # Add reporter
    cmd="$cmd --reporter=$REPORT_TYPE"
    
    echo "$cmd"
}

# Run pre-test checks
pre_test_checks() {
    echo -e "${BLUE}🔧 Running pre-test checks...${NC}"
    
    # Check if server is running
    local base_url=${BASE_URL:-"http://localhost:3000"}
    echo -e "${BLUE}   Checking server at $base_url...${NC}"
    
    if curl -s --connect-timeout 5 "$base_url/health" > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ Server is running${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Server not detected. Starting development server...${NC}"
        echo -e "${YELLOW}   Please ensure 'npm run dev' is running in another terminal.${NC}"
        echo -e "${YELLOW}   Press Enter to continue when server is ready, or Ctrl+C to exit.${NC}"
        read -r
    fi
    
    # Create screenshots directory
    mkdir -p e2e/screenshots
    
    echo -e "${GREEN}✅ Pre-test checks complete${NC}"
}

# Main execution function
main() {
    echo -e "${BLUE}"
    echo "████████████████████████████████████████████████████████████"
    echo "█                                                          █"
    echo "█           Atlas Fitness Calendar E2E Tests              █"
    echo "█                                                          █"
    echo "████████████████████████████████████████████████████████████"
    echo -e "${NC}"
    echo ""
    
    parse_args "$@"
    
    echo -e "${BLUE}📋 Test Configuration:${NC}"
    echo -e "${BLUE}   Suite: $TEST_SUITE${NC}"
    echo -e "${BLUE}   Browser: $BROWSER${NC}"
    echo -e "${BLUE}   Headed: $HEADED${NC}"
    echo -e "${BLUE}   Trace: $TRACE${NC}"
    echo -e "${BLUE}   Debug: $DEBUG${NC}"
    echo -e "${BLUE}   UI Mode: $UI_MODE${NC}"
    echo -e "${BLUE}   Parallel: $PARALLEL${NC}"
    echo -e "${BLUE}   Retries: $RETRIES${NC}"
    echo -e "${BLUE}   Timeout: ${TIMEOUT}ms${NC}"
    echo -e "${BLUE}   Report: $REPORT_TYPE${NC}"
    echo ""
    
    validate_environment
    pre_test_checks
    
    # Get test files and build command
    local test_files=$(get_test_files)
    local cmd=$(build_command "$test_files")
    
    echo -e "${BLUE}🚀 Starting calendar tests...${NC}"
    echo -e "${BLUE}Command: $cmd${NC}"
    echo ""
    
    # Execute the tests
    local start_time=$(date +%s)
    
    if eval "$cmd"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo ""
        echo -e "${GREEN}🎉 Calendar tests completed successfully!${NC}"
        echo -e "${GREEN}   Duration: ${duration}s${NC}"
        echo -e "${GREEN}   Suite: $TEST_SUITE${NC}"
        echo -e "${GREEN}   Browser: $BROWSER${NC}"
        
        # Show report locations
        echo ""
        echo -e "${BLUE}📊 Test artifacts available:${NC}"
        echo -e "${BLUE}   HTML Report: playwright-calendar-report/index.html${NC}"
        echo -e "${BLUE}   Screenshots: e2e/screenshots/${NC}"
        echo -e "${BLUE}   JSON Results: calendar-test-results.json${NC}"
        
        if [[ "$TRACE" == true ]]; then
            echo -e "${BLUE}   Traces: test-results/${NC}"
        fi
        
        if [[ "$REPORT_TYPE" == "html" ]] && [[ "$UI_MODE" != true ]]; then
            echo ""
            echo -e "${YELLOW}💡 Run 'npx playwright show-report playwright-calendar-report' to view results${NC}"
        fi
        
        exit 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo ""
        echo -e "${RED}❌ Calendar tests failed!${NC}"
        echo -e "${RED}   Duration: ${duration}s${NC}"
        echo -e "${RED}   Suite: $TEST_SUITE${NC}"
        echo -e "${RED}   Browser: $BROWSER${NC}"
        
        echo ""
        echo -e "${YELLOW}🔍 Debug information:${NC}"
        echo -e "${YELLOW}   Check HTML report for detailed results${NC}"
        echo -e "${YELLOW}   Review screenshots in e2e/screenshots/${NC}"
        
        if [[ "$TRACE" == true ]]; then
            echo -e "${YELLOW}   Analyze traces in test-results/${NC}"
        fi
        
        echo ""
        echo -e "${YELLOW}💡 Common fixes:${NC}"
        echo -e "${YELLOW}   - Ensure server is running (npm run dev)${NC}"
        echo -e "${YELLOW}   - Check environment variables${NC}"
        echo -e "${YELLOW}   - Verify database connectivity${NC}"
        echo -e "${YELLOW}   - Try running with --headed to see browser${NC}"
        echo -e "${YELLOW}   - Run with --trace for detailed debugging${NC}"
        
        exit 1
    fi
}

# Run the main function with all arguments
main "$@"