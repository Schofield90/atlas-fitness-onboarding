#!/bin/bash

# Apply nutrition system database schema fixes
# This script applies the comprehensive migration to fix all nutrition-related database issues

set -e

echo "🔧 Applying nutrition system database schema fixes..."
echo "=================================================="

# Check for PostgreSQL client
if ! command -v psql &> /dev/null; then
    echo "⚠️  psql not found, trying to install PostgreSQL..."
    if command -v brew &> /dev/null; then
        brew install postgresql
    else
        echo "❌ Cannot install PostgreSQL automatically. Please install it manually."
        echo "   On macOS: brew install postgresql"
        echo "   On Ubuntu: sudo apt-get install postgresql-client"
        exit 1
    fi
fi

# Database connection details
DB_HOST="db.lzlrojoaxrqvmhempnkn.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
DB_PASSWORD="@Aa80236661"

# Migration file
MIGRATION_FILE="/Users/samschofield/atlas-fitness-onboarding/supabase/migrations/20250910_fix_nutrition_and_related_tables.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Applying migration: 20250910_fix_nutrition_and_related_tables.sql"

# Apply the migration
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📋 Verifying schema changes..."
    
    # Verify key tables and columns exist
    echo "Checking nutrition_profiles table..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d nutrition_profiles" | grep client_id && echo "✓ nutrition_profiles.client_id column exists"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d nutrition_profiles" | grep lead_id && echo "✓ nutrition_profiles.lead_id column exists"
    
    echo "Checking bookings table..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt bookings" && echo "✓ bookings table exists"
    
    echo "Checking class_credits table..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt class_credits" && echo "✓ class_credits table exists"
    
    echo "Checking leads table..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt leads" && echo "✓ leads table exists"
    
    echo "Checking organization_staff columns..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d organization_staff" | grep permissions && echo "✓ organization_staff.permissions column exists"
    
    echo ""
    echo "🎉 All schema fixes have been applied successfully!"
    echo "🥗 The nutrition coach should now work correctly."
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi