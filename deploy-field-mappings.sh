#!/bin/bash

echo "🚀 Deploying Facebook Field Mappings System"
echo "========================================="

# Deploy to Vercel
echo -e "\n📦 Deploying to Vercel..."
vercel --prod

echo -e "\n✅ Deployment complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql"
echo "2. Run the migration from: supabase/migrations/20250904075315_facebook_field_mappings_complete.sql"
echo "3. Test the field mapping interface at: /settings/integrations/facebook"
echo ""
echo "🎯 Features Deployed:"
echo "✓ GHL-style field mapping system"
echo "✓ Auto-detection for common fields"
echo "✓ Visual drag-and-drop interface"
echo "✓ Custom field support"
echo "✓ Field transformations (phone, date, etc.)"
echo "✓ One-time setup per form"
echo ""
echo "📊 Testing the System:"
echo "1. Navigate to Facebook integration settings"
echo "2. Click the ⚙️ icon next to any lead form"
echo "3. Configure field mappings"
echo "4. New leads will automatically use the mappings"