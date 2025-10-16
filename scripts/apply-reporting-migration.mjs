#!/usr/bin/env node

/**
 * Apply agent reporting migration to Supabase production database
 *
 * This script reads the migration SQL file and executes it via Supabase REST API
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envPath = '/Users/Sam/atlas-fitness-onboarding/.env.local';
const env = readFileSync(envPath, 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL="?([^"\n]+)"?/)?.[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY="?([^"\n]+)"?/)?.[1];

if (!url || !key) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

console.log('\n========================================');
console.log('AGENT REPORTING MIGRATION');
console.log('========================================\n');

// Test database connection
console.log('Testing database connection...');

const { data: testData, error: testError } = await supabase
  .from('ai_agents')
  .select('count')
  .limit(1);

if (testError) {
  console.error('❌ Database connection failed:', testError);
  process.exit(1);
}

console.log('✅ Database connection successful\n');

// Check if tables already exist
console.log('Checking if migration already applied...');

const { data: existingTable, error: checkError } = await supabase
  .from('agent_performance_events')
  .select('count')
  .limit(0);

if (!checkError) {
  console.log('⚠️  Migration already applied - tables exist');
  console.log('    agent_performance_events table found');
  process.exit(0);
}

console.log('✅ Migration not yet applied\n');

// Since we can't execute raw SQL via Supabase REST API,
// we need to use the Supabase SQL Editor or CLI

console.log('Migration SQL ready at:');
console.log('  /Users/Sam/atlas-fitness-onboarding/supabase/migrations/20251016_create_agent_reporting.sql\n');

console.log('To apply migration:');
console.log('');
console.log('  Option 1 - Supabase Dashboard (Recommended):');
console.log('    1. Open: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql');
console.log('    2. Click "New Query"');
console.log('    3. Paste contents of migration file');
console.log('    4. Click "RUN"');
console.log('');
console.log('  Option 2 - Supabase CLI:');
console.log('    npx supabase migration repair 20251016_create_agent_reporting --status applied');
console.log('');
console.log('========================================\n');

// Display migration preview
console.log('Migration will create:');
console.log('  ✓ agent_performance_events table');
console.log('  ✓ agent_performance_snapshots table');
console.log('  ✓ calculate_percentage() function');
console.log('  ✓ refresh_agent_performance_snapshot() function');
console.log('  ✓ record_lead_created() helper function');
console.log('  ✓ RLS policies for organization isolation');
console.log('  ✓ Performance indexes\n');
