#!/bin/bash

echo "🐳 Starting Atlas Fitness with Docker..."
echo "====================================="
echo ""

# Set Docker path
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo ""
    echo "Please start Docker Desktop and try again."
    echo "To start Docker Desktop on Mac:"
    echo "  1. Open Docker Desktop from Applications"
    echo "  2. Wait for Docker to start (whale icon in menu bar)"
    echo "  3. Run this script again"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    echo "The app needs environment variables to connect to Supabase"
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker compose down 2>/dev/null || true

# Build and start the container
echo ""
echo "🏗️  Building Docker image (this may take a minute on first run)..."
docker compose build

echo ""
echo "🚀 Starting the application..."
docker compose up -d

echo ""
echo "⏳ Waiting for the app to start..."
sleep 5

# Check if container is running
if docker compose ps | grep -q "app.*running"; then
    echo ""
    echo "✅ Application started successfully!"
    echo ""
    echo "🌐 Access the app at:"
    echo "   → http://localhost:3000"
    echo "   → http://localhost:3000/memberships"
    echo ""
    echo "📋 Useful commands:"
    echo "   • View logs: docker compose logs -f"
    echo "   • Stop app: docker compose down"
    echo "   • Restart: docker compose restart"
else
    echo ""
    echo "❌ Container failed to start. Check logs with:"
    echo "   docker compose logs"
fi