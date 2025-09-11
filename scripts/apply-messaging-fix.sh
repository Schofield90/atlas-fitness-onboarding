#!/bin/bash

# Apply messaging schema fix to production database
echo "Applying messaging schema fix to production database..."

PGPASSWORD=OGFYlxSChyYLgQxn psql \
  -h db.lzlrojoaxrqvmhempnkn.supabase.co \
  -p 5432 \
  -U postgres.lzlrojoaxrqvmhempnkn \
  -d postgres \
  -f /Users/Sam/supabase/migrations/20250919_in_app_messaging_unify.sql

echo "Migration applied successfully!"

# Refresh schema cache
echo "Refreshing schema cache..."
curl -X POST https://atlas-fitness-onboarding.vercel.app/api/admin/refresh-schema-cache

echo "Schema cache refreshed!"