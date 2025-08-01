#!/bin/bash

echo "🚀 Starting Atlas Fitness Development Server..."
echo "==========================================="
echo ""

# Kill any existing processes on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

echo "✅ Cleared ports 3000 and 3001"
echo ""
echo "🔧 Starting Next.js development server..."
echo ""
echo "The app will open in your browser in 10 seconds..."
echo ""

# Start the dev server
npm run dev &

# Wait for the server to start
sleep 10

# Open in browser
echo "🌐 Opening http://localhost:3000 in your default browser..."
open http://localhost:3000

echo ""
echo "If the browser doesn't open automatically, try:"
echo "  - http://localhost:3000"
echo "  - http://127.0.0.1:3000"
echo ""
echo "Press Ctrl+C to stop the server"

# Keep the script running
wait