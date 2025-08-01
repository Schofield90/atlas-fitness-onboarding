#!/bin/bash

echo "🚀 Starting Atlas Fitness..."
echo "=========================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please copy .env.local.example to .env.local and add your credentials"
    exit 1
fi

echo "✅ Environment file found"
echo ""
echo "🔧 Starting development server..."
echo ""
echo "The app will be available at:"
echo "  → http://localhost:3000"
echo "  → http://localhost:3000/signup (to create account)"
echo "  → http://localhost:3000/login (to log in)"
echo ""
echo "Starting in 3 seconds..."
sleep 3

# Run the dev server
npm run dev