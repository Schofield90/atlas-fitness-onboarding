#!/bin/bash

# Smart migration script that checks existing tables and handles conflicts
# Usage: ./scripts/smart-migration.sh

echo "🔧 Smart Migration Script for Atlas Fitness Database"
echo "================================================="

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Get the project ID from config
PROJECT_ID=$(supabase projects list --output json | jq -r '.[0].id' 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ No Supabase project linked. Run 'supabase link' first."
    exit 1
fi

echo "✅ Found Supabase project: $PROJECT_ID"
echo ""

# Create a SQL file to check existing tables
cat > /tmp/check_tables.sql << 'EOF'
-- Check which tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
EOF

echo "📊 Checking existing tables..."
supabase db push /tmp/check_tables.sql --dry-run

# Create a migration that handles existing tables
cat > /tmp/smart_migration.sql << 'EOF'
-- Smart migration that checks for existing objects before creating

-- Enable required extensions (IF NOT EXISTS handles duplicates)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION table_exists(table_name text) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND information_schema.tables.table_name = $1
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if a column exists
CREATE OR REPLACE FUNCTION column_exists(table_name text, column_name text) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND information_schema.columns.table_name = $1
        AND information_schema.columns.column_name = $2
    );
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    -- Organizations table
    IF NOT table_exists('organizations') THEN
        CREATE TABLE organizations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
            name TEXT NOT NULL,
            plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            settings JSONB DEFAULT '{}'::jsonb,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created table: organizations';
    ELSE
        -- Add missing columns if table exists
        IF NOT column_exists('organizations', 'slug') THEN
            ALTER TABLE organizations ADD COLUMN slug TEXT UNIQUE CHECK (slug ~ '^[a-z0-9-]+$');
            -- Generate slugs for existing orgs
            UPDATE organizations SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;
            ALTER TABLE organizations ALTER COLUMN slug SET NOT NULL;
            RAISE NOTICE 'Added column: organizations.slug';
        END IF;
    END IF;

    -- Users table
    IF NOT table_exists('users') THEN
        CREATE TABLE users (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            avatar_url TEXT,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created table: users';
    END IF;

    -- Organization Members
    IF NOT table_exists('organization_members') THEN
        CREATE TABLE organization_members (
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
            role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'coach', 'staff')),
            permissions JSONB DEFAULT '{}'::jsonb,
            joined_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (user_id, org_id)
        );
        RAISE NOTICE 'Created table: organization_members';
    END IF;

    -- Continue with other tables...
    -- (Add the rest of the tables from the migration file, each wrapped in IF NOT table_exists())

END $$;

-- Drop the helper functions
DROP FUNCTION IF EXISTS table_exists(text);
DROP FUNCTION IF EXISTS column_exists(text);
EOF

echo ""
echo "📝 Created smart migration file at /tmp/smart_migration.sql"
echo ""
echo "Do you want to:"
echo "1) Run the migration now"
echo "2) View the migration file first"
echo "3) Exit and run manually"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Running smart migration..."
        supabase db push /tmp/smart_migration.sql
        echo ""
        echo "✅ Migration complete!"
        ;;
    2)
        echo ""
        echo "📄 Migration file contents:"
        echo "=========================="
        cat /tmp/smart_migration.sql
        echo ""
        echo "Run this command to apply: supabase db push /tmp/smart_migration.sql"
        ;;
    3)
        echo ""
        echo "📁 Migration file saved to: /tmp/smart_migration.sql"
        echo "Run this command when ready: supabase db push /tmp/smart_migration.sql"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "🎯 Next steps:"
echo "1. Verify tables were created: supabase db diff"
echo "2. Check the Supabase dashboard for your tables"
echo "3. Create test data if needed"
echo ""