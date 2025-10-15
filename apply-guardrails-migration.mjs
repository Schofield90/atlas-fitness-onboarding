import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n🔧 Applying guardrails system migration...\n');

// Read the migration file
const migrationSQL = readFileSync(
  'supabase/migrations/20251015_create_guardrails_system.sql',
  'utf8'
);

// Execute the migration
const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

if (error) {
  console.log('❌ Migration failed:', error.message);
  console.log('\nTrying direct execution...\n');

  // If RPC doesn't exist, we'll need to execute via pg client
  // For now, show instructions
  console.log('💡 Manual migration required:');
  console.log('   1. Open Supabase SQL Editor');
  console.log('   2. Copy contents of: supabase/migrations/20251015_create_guardrails_system.sql');
  console.log('   3. Execute the SQL');
  console.log('\n   OR use psql:');
  console.log(`   psql "${process.env.DATABASE_URL}" -f supabase/migrations/20251015_create_guardrails_system.sql`);
} else {
  console.log('✅ Migration applied successfully!');
  console.log('\n📋 Created:');
  console.log('   - guardrails table');
  console.log('   - agent_guardrails junction table');
  console.log('   - Indexes for performance');
  console.log('   - RLS policies for security');
  console.log('   - Helper function: get_agent_guardrails()');
}

console.log('\n');
