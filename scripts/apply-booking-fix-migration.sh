#!/bin/bash

# Apply booking system database schema fixes
# This script applies the comprehensive migration to fix all booking-related database issues

set -e

echo "🔧 Applying booking system database schema fixes..."
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
DB_PASSWORD="OGFYlxSChyYLgQxn"

# Migration file
MIGRATION_FILE="/Users/samschofield/atlas-fitness-onboarding/supabase/migrations/20250907_complete_booking_schema_fix.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Applying migration: 20250907_complete_booking_schema_fix.sql"

# Apply the migration
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📋 Verifying schema changes..."
    
    # Verify key tables and columns exist
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d class_bookings" | grep client_id && echo "✓ class_bookings.client_id column exists"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt customer_class_packages" && echo "✓ customer_class_packages table exists"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt class_packages" && echo "✓ class_packages table exists"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d customer_memberships" | grep classes_used_this_period && echo "✓ customer_memberships.classes_used_this_period column exists"
    
    echo ""
    echo "🎉 All schema fixes have been applied successfully!"
    echo "📱 The booking system should now work correctly."
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi