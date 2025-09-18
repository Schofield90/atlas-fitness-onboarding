#!/bin/bash

# Apply the all_attendances view migration to the database

echo "Applying all_attendances view migration..."

PGPASSWORD=OGFYlxSChyYLgQxn psql -h db.lzlrojoaxrqvmhempnkn.supabase.co -U postgres -d postgres -f /Users/samschofield/atlas-fitness-onboarding/supabase/migrations/20250918_all_attendances_view.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

echo "Verifying view creation..."
PGPASSWORD=OGFYlxSChyYLgQxn psql -h db.lzlrojoaxrqvmhempnkn.supabase.co -U postgres -d postgres -c "\dv all_attendances"

echo "Testing view with sample query..."
PGPASSWORD=OGFYlxSChyYLgQxn psql -h db.lzlrojoaxrqvmhempnkn.supabase.co -U postgres -d postgres -c "SELECT COUNT(*) as total_records FROM all_attendances;"