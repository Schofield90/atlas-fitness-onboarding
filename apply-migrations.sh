#!/bin/bash

# Script to apply pending migrations to Supabase database
# Run this after pulling new migrations from Git

echo "🔍 Checking for pending migrations..."

MIGRATIONS_DIR="supabase/migrations"
PENDING_MIGRATIONS=(
  "20251006_add_custom_pricing_to_memberships.sql"
  "20251006_add_billing_source_control.sql"
)

echo ""
echo "📋 Pending Migrations:"
echo "  1. Add custom pricing fields (client-level pricing)"
echo "  2. Add billing source control (prevent double billing)"
echo ""

read -p "Apply these migrations to your Supabase database? (y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "📌 To apply these migrations:"
echo ""
echo "Option 1 - Supabase Dashboard (Recommended):"
echo "  1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
echo "  2. Copy and paste the SQL from each migration file"
echo "  3. Click 'Run'"
echo ""
echo "Option 2 - Supabase CLI:"
echo "  1. Link project: npx supabase link --project-ref YOUR_PROJECT_REF"
echo "  2. Apply migrations: npx supabase db push"
echo ""
echo "Option 3 - Direct psql (if you have connection string):"

for migration in "${PENDING_MIGRATIONS[@]}"; do
    migration_path="$MIGRATIONS_DIR/$migration"
    if [ -f "$migration_path" ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📄 Migration: $migration"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        cat "$migration_path"
        echo ""
    fi
done

echo ""
echo "✅ You can copy the SQL above and run it in your Supabase SQL editor"
echo ""
