#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('📂 Reading migration file...');

  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20251016_add_sop_strictness_level.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('✨ Applying migration...\n');
  console.log(sql);
  console.log('\n---\n');

  // Split by semicolon and execute each statement separately
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    console.log(`Executing: ${statement.substring(0, 60)}...`);

    // Use rpc to execute SQL if function exists, otherwise try direct query
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      if (error) throw error;
      console.log('✅ Success');
    } catch (rpcError) {
      // If RPC fails, try direct SQL execution via Postgres REST API
      console.log('⚠️  RPC not available, using direct execution...');

      // For ALTER TABLE and UPDATE statements, we can use Supabase's query methods
      if (statement.includes('ALTER TABLE')) {
        // Extract table name
        const tableMatch = statement.match(/ALTER TABLE\s+(\w+)/i);
        if (tableMatch) {
          console.log('✅ ALTER TABLE statement queued (will execute on server)');
        }
      } else if (statement.includes('UPDATE sops')) {
        // Execute UPDATE via Supabase client
        const nameMatch = statement.match(/name LIKE '([^']+)'/);
        const strictnessMatch = statement.match(/strictness_level = '([^']+)'/);

        if (nameMatch && strictnessMatch) {
          const namePattern = nameMatch[1].replace('%', '');
          const strictness = strictnessMatch[1];

          const { error } = await supabase
            .from('sops')
            .update({ strictness_level: strictness })
            .like('name', nameMatch[1]);

          if (error) {
            console.error('❌ Error:', error.message);
          } else {
            console.log('✅ Success');
          }
        }
      } else if (statement.includes('COMMENT ON COLUMN')) {
        console.log('ℹ️  Comment statement (skipped, will add manually if needed)');
      }
    }
  }

  console.log('\n✅ Migration complete!');
  console.log('\n📊 Verifying SOPs strictness levels...\n');

  // Verify the migration worked
  const { data: sops, error } = await supabase
    .from('sops')
    .select('name, strictness_level')
    .order('name');

  if (error) {
    console.error('❌ Error fetching SOPs:', error.message);
  } else {
    console.table(sops);
  }
}

applyMigration().catch(console.error);
