#!/bin/bash

echo "🚀 Deploying Facebook Integration Fix to Production"
echo "=================================================="
echo ""

# Check if we have uncommitted changes
echo "📋 Checking git status..."
git status --short

echo ""
echo "📦 Changes to deploy:"
echo "  - Fixed API to return all page fields (followers, category, etc.)"
echo "  - Added null safety checks in frontend"
echo "  - Updated middleware to include /integrations routes"
echo "  - Made TypeScript types optional for page fields"
echo ""

# Add all changes
echo "➕ Adding changes to git..."
git add -A

# Create commit
echo "💾 Creating commit..."
git commit -m "fix: Facebook integration page display errors

- Fixed TypeError when displaying page followers count
- Updated API to return complete page data including followers_count, category, cover
- Added null safety checks for optional fields
- Updated TypeScript interfaces to make fields properly optional
- Fixed middleware authentication for /integrations routes
- Enriched database with page details from Facebook API

Resolves: ErrorBoundary crash on /integrations/facebook page"

# Push to main branch
echo "⬆️  Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Code pushed to GitHub!"
echo ""
echo "🔄 Triggering Vercel deployment..."
echo "Vercel will automatically deploy from the main branch"
echo ""
echo "📱 Monitor deployment at:"
echo "https://vercel.com/your-team/atlas-fitness-onboarding"
echo ""
echo "🌐 Once deployed, the fix will be live at:"
echo "https://atlas-fitness-onboarding.vercel.app/integrations/facebook"
echo ""
echo "⏱️  Deployment usually takes 2-3 minutes"