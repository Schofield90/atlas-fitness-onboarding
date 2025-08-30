// Script to run SQL migrations via Supabase API
const fs = require('fs');
const path = require('path');

// Supabase connection details
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = 'postgresql://postgres.lzlrojoaxrqvmhempnkn:OGFYlxSChyYLgQxn@aws-0-eu-west-2.pooler.supabase.com:6543/postgres';

// Migration to run
const migrationSQL = `
-- Add name and hourly_rate columns to organization_staff table
ALTER TABLE organization_staff 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) DEFAULT 0.00;

-- Update the name column with email prefix for existing records
UPDATE organization_staff 
SET name = split_part(email, '@', 1)
WHERE name IS NULL;
`;

console.log('Migration SQL to run:');
console.log(migrationSQL);
console.log('\n---\n');
console.log('Database migration needs to be run manually via Supabase Dashboard:');
console.log('1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
console.log('2. Copy and paste the SQL above');
console.log('3. Click "Run" to execute the migration');
console.log('\nAlternatively, you can use the Supabase CLI with proper authentication.');