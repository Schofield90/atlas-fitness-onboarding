#!/bin/bash

echo "Applying recurring classes schema fixes..."

# Database connection details
DB_HOST="db.lzlrojoaxrqvmhempnkn.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
DB_PASSWORD="OGFYlxSChyYLgQxn"

# Apply the SQL migration
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f /Users/samschofield/atlas-fitness-onboarding/scripts/fix-recurring-classes-schema.sql

echo "Schema fixes applied successfully!"