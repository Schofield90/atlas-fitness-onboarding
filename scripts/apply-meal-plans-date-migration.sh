#!/bin/bash

echo "🔧 Applying meal plans date field migration..."
echo "=================================================="

# Database connection details
DB_HOST="db.lzlrojoaxrqvmhempnkn.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
DB_PASSWORD="OGFYlxSChyYLgQxn"

# Path to migration file
MIGRATION_FILE="supabase/migrations/20250911_add_date_to_meal_plans.sql"

echo "📄 Running migration: $MIGRATION_FILE"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "⚠️  psql command not found. Trying with Docker..."
    
    # Try using Docker PostgreSQL client
    docker run --rm -v "$(pwd)/$MIGRATION_FILE:/migration.sql:ro" \
        postgres:15 \
        psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME" \
        -f /migration.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Migration applied successfully using Docker!"
    else
        echo "❌ Failed to apply migration. Please install psql or Docker."
        exit 1
    fi
else
    # Use native psql
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE
    
    if [ $? -eq 0 ]; then
        echo "✅ Migration applied successfully!"
    else
        echo "❌ Failed to apply migration."
        exit 1
    fi
fi

echo ""
echo "🎉 Meal plans will now persist with their dates!"
echo "📅 Each day's meal plan is saved independently."