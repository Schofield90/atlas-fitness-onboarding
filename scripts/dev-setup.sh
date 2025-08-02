#!/bin/bash

# Fast development setup script

echo "🚀 Atlas Fitness Fast Dev Setup"
echo "================================"

# Function to check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker not found. Please install Docker Desktop"
    echo "Visit: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! command_exists vercel; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Sync environment variables
echo ""
echo "🔄 Syncing Vercel environment variables..."
./scripts/sync-vercel-env.sh

# Option to use regular npm dev instead of Docker
echo ""
echo "Choose your development method:"
echo "1) Docker (isolated, consistent)"
echo "2) Local npm (faster, uses your system)"
echo -n "Enter choice [1-2]: "
read choice

case $choice in
    1)
        echo "🐳 Starting Docker development environment..."
        docker-compose -f docker-compose.dev.yml up --build
        ;;
    2)
        echo "💻 Starting local development server..."
        npm run dev
        ;;
    *)
        echo "Invalid choice. Defaulting to local npm..."
        npm run dev
        ;;
esac