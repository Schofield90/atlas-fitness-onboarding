#!/bin/bash

# Supabase connection details
SUPABASE_URL="https://lzlrojoaxrqvmhempnkn.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k"

echo "🚀 Running Admin HQ migration..."

# Read the migration file
MIGRATION_FILE="supabase/migrations/20250821_admin_hq_foundation.sql"

# Use the Supabase REST API to run the migration
# We'll use psql if available, otherwise fall back to API calls
if command -v psql &> /dev/null; then
    echo "Using psql to run migration..."
    
    # Extract database URL components
    DB_HOST="db.lzlrojoaxrqvmhempnkn.supabase.co"
    DB_NAME="postgres"
    DB_USER="postgres"
    
    # You'll need to provide the database password
    echo "Please enter the database password for the Supabase project:"
    read -s DB_PASSWORD
    
    export PGPASSWORD=$DB_PASSWORD
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE
    
    if [ $? -eq 0 ]; then
        echo "✅ Migration completed successfully!"
        echo "   sam@gymleadhub.co.uk has been set as platform owner"
    else
        echo "❌ Migration failed. Please check the errors above."
    fi
else
    echo "psql not found. Attempting to run via Supabase Dashboard..."
    echo ""
    echo "Please run the following migration manually in the Supabase SQL Editor:"
    echo "1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new"
    echo "2. Copy and paste the contents of: $MIGRATION_FILE"
    echo "3. Click 'Run' to execute the migration"
    echo ""
    echo "The migration will:"
    echo "  - Create admin tables and RLS policies"
    echo "  - Set up sam@gymleadhub.co.uk as platform owner"
    echo "  - Create audit logging infrastructure"
fi