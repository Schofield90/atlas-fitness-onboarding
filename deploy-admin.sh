#!/bin/bash

# Deploy Admin Portal to Vercel
echo "🚀 Deploying Admin Portal to Vercel..."
echo "======================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Please install it first:"
    echo "   npm i -g vercel"
    exit 1
fi

# Deploy using the admin configuration
echo "📦 Building and deploying admin portal..."

# Deploy to production with admin config
vercel --prod \
  --local-config vercel.admin.json \
  --yes

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Admin Portal deployed successfully!"
    echo "======================================="
    echo "🌐 Access your admin portal at:"
    echo "   https://admin.gymleadhub.co.uk"
    echo ""
    echo "📝 Next steps:"
    echo "1. Ensure domain is pointing to Vercel"
    echo "2. Set environment variables in Vercel dashboard"
    echo "3. Test signin at https://admin.gymleadhub.co.uk/signin"
else
    echo ""
    echo "❌ Deployment failed. Please check the error above."
    exit 1
fi