#!/bin/bash

echo "🔧 Fixing GoTeamUp Migration - Adding source_row_number column"
echo "================================================"

# Database connection details
DB_HOST="db.lzlrojoaxrqvmhempnkn.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres.lzlrojoaxrqvmhempnkn"

echo ""
echo "📋 Migration to apply:"
echo "- Add source_row_number column to migration_records table"
echo "- Create index for better query performance"
echo ""

# Check if column already exists
echo "🔍 Checking if source_row_number column already exists..."
COLUMN_EXISTS=$(PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'migration_records' 
  AND column_name = 'source_row_number';
" 2>/dev/null | xargs)

if [ "$COLUMN_EXISTS" = "1" ]; then
  echo "✅ Column source_row_number already exists"
else
  echo "⚠️  Column source_row_number does not exist"
  echo ""
  echo "📝 Please run the following SQL in Supabase Dashboard SQL Editor:"
  echo ""
  cat << 'EOF'
-- Add missing columns to migration tables
-- This fixes the 500 error on /api/migration/jobs/[id]/conflicts

-- Add source_row_number column to migration_records table if it doesn't exist
ALTER TABLE public.migration_records 
ADD COLUMN IF NOT EXISTS source_row_number INTEGER;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_migration_records_source_row 
ON public.migration_records(migration_job_id, source_row_number);

-- Add comment for documentation
COMMENT ON COLUMN public.migration_records.source_row_number IS 'Row number from the source CSV file for tracking';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'migration_records' 
AND column_name = 'source_row_number';
EOF
  echo ""
  echo "🔗 Supabase Dashboard URL:"
  echo "https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new"
fi

echo ""
echo "📊 Current migration_records table structure:"
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'migration_records' 
  ORDER BY ordinal_position;
" 2>/dev/null || echo "⚠️  Could not connect to database. Please check SUPABASE_DB_PASSWORD environment variable."

echo ""
echo "✅ Code Status:"
echo "- migration-service.ts: Already deployed (uses source_row_number)"
echo "- conflicts API route: Already deployed (simplified auth)"
echo "- All other fixes: Already in production"
echo ""
echo "⚠️  IMPORTANT: The migration feature will continue to show 500 errors"
echo "    until the SQL above is applied to the production database."
echo ""
echo "After applying the SQL, the GoTeamUp migration should work correctly."