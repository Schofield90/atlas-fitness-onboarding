import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('📝 Reading SOPs migration file...');
  const sql = readFileSync('supabase/migrations/20251014_create_sops_system.sql', 'utf8');

  console.log('🚀 Applying SOPs migration to database...');

  // Execute the entire SQL file using Supabase admin API
  try {
    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments
      if (statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      // Use a direct SQL execution via a custom function or REST API
      // For now, we'll try to execute each statement directly
      const { error } = await client.rpc('exec_sql', { sql: statement }).catch(() => ({
        error: 'RPC not available, trying direct execution'
      }));

      if (error) {
        console.log(`⚠️  Statement ${i + 1} skipped (will try via SQL editor):`, statement.substring(0, 50) + '...');
      } else {
        console.log(`✅ Statement ${i + 1} executed`);
      }
    }

    console.log('\n✨ Migration script completed!');
    console.log('\nℹ️  If statements were skipped, please run the migration manually:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy contents of supabase/migrations/20251014_create_sops_system.sql');
    console.log('   3. Execute the SQL');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n⚠️  Please apply migration manually via Supabase SQL Editor');
  }
}

applyMigration().catch(console.error);
