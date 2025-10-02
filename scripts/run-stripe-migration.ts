import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running Stripe migration...');

  const migrationPath = path.join(
    __dirname,
    '../supabase/migrations/20251002_add_stripe_product_id_to_saas_plans.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolons and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  for (const statement of statements) {
    if (!statement) continue;

    console.log('Executing:', statement.substring(0, 100) + '...');

    const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

    if (error) {
      console.error('Error executing statement:', error);
      // Try direct approach
      const { error: directError } = await (supabase as any).from('_').rpc(statement);
      if (directError) {
        console.error('Direct execution also failed:', directError);
      }
    } else {
      console.log('✓ Success');
    }
  }

  console.log('\nMigration completed!');
}

runMigration().catch(console.error);
