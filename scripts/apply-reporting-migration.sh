#!/bin/bash

# Apply agent reporting migration to Supabase production database
# Run this manually in Supabase SQL Editor: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql

echo "========================================="
echo "AGENT REPORTING MIGRATION"
echo "========================================="
echo ""
echo "1. Open: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql"
echo "2. Copy the contents of: supabase/migrations/20251016_create_agent_reporting.sql"
echo "3. Paste into SQL Editor"
echo "4. Click RUN"
echo ""
echo "OR use the Supabase CLI:"
echo ""
echo "npx supabase db push --db-url 'postgresql://postgres:[PASSWORD]@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres'"
echo ""
echo "========================================="
