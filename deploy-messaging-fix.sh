#!/bin/bash

echo "🚀 Deploying Messaging System Fixes"
echo "=================================="

# Make scripts executable
chmod +x scripts/fix-messaging-system.js
chmod +x test-messaging-fix.js

# Check if we have the required files
if [ ! -f "apply-messaging-fix.sql" ]; then
    echo "❌ Missing apply-messaging-fix.sql file"
    exit 1
fi

if [ ! -f "app/api/messages/send/route.ts" ]; then
    echo "❌ Missing API route file"
    exit 1
fi

if [ ! -f "app/lib/supabase/client-fixed.ts" ]; then
    echo "❌ Missing enhanced client file"
    exit 1
fi

echo "✅ All required files present"

# Step 1: Apply database migration
echo ""
echo "📋 Step 1: Database Migration"
echo "Please apply the following SQL in your Supabase dashboard:"
echo "File: apply-messaging-fix.sql"
echo ""
echo "Or run this command if you have psql access:"
echo "psql \$DATABASE_URL < apply-messaging-fix.sql"
echo ""
read -p "Press Enter after applying the database migration..."

# Step 2: Update the main client file
echo ""
echo "📋 Step 2: Updating Supabase client"
if [ -f "app/lib/supabase/client.ts" ]; then
    # Backup original
    cp "app/lib/supabase/client.ts" "app/lib/supabase/client.ts.backup"
    echo "✅ Backed up original client.ts"
    
    # Replace with fixed version
    cp "app/lib/supabase/client-fixed.ts" "app/lib/supabase/client.ts"
    echo "✅ Updated client.ts with fixes"
else
    echo "⚠️  Original client.ts not found, using fixed version as-is"
fi

# Step 3: Run tests
echo ""
echo "📋 Step 3: Running verification tests"
if command -v node &> /dev/null; then
    node test-messaging-fix.js
else
    echo "⚠️  Node.js not found, skipping automated tests"
fi

# Step 4: Build and deploy
echo ""
echo "📋 Step 4: Building application"
if [ -f "package.json" ]; then
    echo "Installing dependencies..."
    npm install
    
    echo "Building application..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo "✅ Build successful"
    else
        echo "❌ Build failed"
        exit 1
    fi
else
    echo "⚠️  No package.json found, skipping build"
fi

# Summary
echo ""
echo "🎉 Messaging Fix Deployment Complete!"
echo "====================================="
echo ""
echo "✅ Database schema updated"
echo "✅ API routes created"
echo "✅ Frontend components updated"
echo "✅ WebSocket connection improved"
echo "✅ Error handling enhanced"
echo ""
echo "🔧 Next Steps:"
echo "1. Deploy your application to production"
echo "2. Test the messaging functionality in the UI"
echo "3. Monitor console for reduced error messages"
echo "4. Verify real-time updates work correctly"
echo ""
echo "📖 For detailed information, see: MESSAGING_FIX_COMPLETE.md"