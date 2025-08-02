#!/bin/bash

echo "🚀 Starting Atlas Fitness Local Development"
echo "=========================================="
echo ""

# Kill any existing processes on common ports
echo "🧹 Cleaning up old processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📥 Syncing environment variables from Vercel..."
    vercel env pull .env.local
fi

# Display the URL prominently
echo ""
echo "🌐 Starting development server..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                                                                                "
echo "   🎯 Your app will be available at:  http://localhost:3000                    "
echo "                                                                                "
echo "   If port 3000 is busy, check the console for the actual port                 "
echo "                                                                                "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the development server
npm run dev