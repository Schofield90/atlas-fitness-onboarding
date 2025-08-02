#!/bin/bash

echo "🚀 Deploying to Vercel..."
echo ""

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Please commit them first."
    exit 1
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Code pushed to GitHub!"
echo ""
echo "🔄 Vercel will automatically deploy from the main branch."
echo ""
echo "📊 Check deployment status at:"
echo "   https://vercel.com/schofield90s-projects/atlas-fitness-onboarding"
echo ""
echo "🔗 Or run: vercel ls"
echo ""