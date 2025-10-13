import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = readFileSync('/tmp/scheduled-payments-migration.sql', 'utf8');

console.log('📊 Applying scheduled payments migration...\n');

// Execute SQL (Supabase doesn't support direct SQL execution via JS client)
// We'll need to use the REST API directly
const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  },
  body: JSON.stringify({ query: sql })
});

if (!response.ok) {
  console.error('❌ Migration failed:', await response.text());
  process.exit(1);
}

console.log('✅ Migration applied successfully!');
