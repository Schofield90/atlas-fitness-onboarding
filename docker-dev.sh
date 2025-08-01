#!/bin/bash

# Docker development script with better error handling

echo "🐳 Atlas Fitness Docker Development Setup"
echo "========================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    echo "   Visit: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    echo ""
    echo "Creating .env.local from template..."
    cp .env.local.example .env.local
    echo "✅ Created .env.local"
    echo ""
    echo "⚠️  Please edit .env.local with your Supabase credentials before continuing."
    echo "   Get them from your Vercel project settings."
    exit 1
fi

# Function to stop and remove containers
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    docker-compose down
    exit 0
}

# Set up trap to clean up on exit
trap cleanup INT TERM

# Build and start the container
echo ""
echo "🏗️  Building Docker image..."
docker-compose build

echo ""
echo "🚀 Starting development server..."
echo "   App will be available at http://localhost:3000"
echo "   (It may take 30-60 seconds for the first build)"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

# Start the container
docker-compose up

# Clean up will be called automatically on exit