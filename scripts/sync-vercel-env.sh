#!/bin/bash

# Script to sync environment variables from Vercel to local .env.local

echo "🔄 Syncing environment variables from Vercel..."

# Check if user is logged in to Vercel CLI
if ! vercel whoami &> /dev/null; then
    echo "❌ You need to login to Vercel CLI first"
    echo "Run: vercel login"
    exit 1
fi

# Pull environment variables from Vercel
echo "📥 Pulling environment variables..."
vercel env pull .env.local

# Check if successful
if [ -f .env.local ]; then
    echo "✅ Environment variables synced successfully!"
    echo "📄 Created .env.local with $(grep -c "=" .env.local) variables"
    
    # Add any additional local-only variables if needed
    echo "" >> .env.local
    echo "# Local development overrides" >> .env.local
    echo "NEXTAUTH_URL=http://localhost:3000" >> .env.local
    
    echo "💡 You can now run: npm run dev:docker"
else
    echo "❌ Failed to sync environment variables"
    exit 1
fi