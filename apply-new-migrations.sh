#!/bin/bash

# Script to apply new migrations from September 6th pull

echo "🚀 Applying new database migrations..."

# Database connection details
DB_HOST="db.lzlrojoaxrqvmhempnkn.supabase.co"
DB_USER="postgres"
DB_PASS="OGFYlxSChyYLgQxn"
DB_NAME="postgres"

# List of new migrations to apply
migrations=(
    "20250906_class_booking_notifications.sql"
    "20250906_comprehensive_class_booking_system.sql"
    "20250906_enhanced_waiver_system.sql"
    "20250906_facebook_ads_management_platform.sql"
    "20250906_meta_messenger_integration.sql"
    "20250906_team_chat_system.sql"
)

# Apply each migration
for migration in "${migrations[@]}"
do
    echo "📝 Applying migration: $migration"
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "supabase/migrations/$migration"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully applied: $migration"
    else
        echo "❌ Failed to apply: $migration"
        echo "Please check the error and fix before continuing"
        exit 1
    fi
    echo ""
done

echo "🎉 All migrations applied successfully!"