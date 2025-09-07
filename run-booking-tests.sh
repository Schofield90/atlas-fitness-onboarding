#!/bin/bash

# Run Atlas Fitness Booking Flow E2E Tests
# This script runs the comprehensive E2E tests for the fixed booking system

set -e

echo "🚀 Starting Atlas Fitness Booking Flow E2E Tests"
echo "=================================================="

# Check if environment variables are set
if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" || -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]]; then
    echo "❌ Error: Missing required environment variables"
    echo "   Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    exit 1
fi

echo "✅ Environment variables verified"

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Start the development server in background
echo "🌐 Starting development server..."
npm run dev &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
sleep 10

# Function to cleanup on exit
cleanup() {
    echo "🧹 Cleaning up..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Run the specific booking flow tests
echo "🧪 Running booking flow E2E tests..."
npx playwright test e2e/booking-flow-fixed.test.ts --reporter=html --headed

echo ""
echo "✅ Test execution completed!"
echo "📊 Check the HTML report for detailed results"
echo "🔗 Open test-results/report.html to view the report"