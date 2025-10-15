import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Try to get one row to see what columns exist
const { data, error } = await supabase
  .from('ai_usage_billing')
  .select('*')
  .limit(1);

if (error) {
  console.log('❌ Error querying ai_usage_billing:', error.message);
} else if (data && data.length > 0) {
  console.log('\n✅ ai_usage_billing table columns:');
  console.log(Object.keys(data[0]).join(', '));
  console.log('\n📊 Sample row:');
  console.log(JSON.stringify(data[0], null, 2));
} else {
  console.log('\n⚠️  ai_usage_billing table is empty');
  // Try to get table structure from information_schema
  const { data: columns } = await supabase.rpc('execute_sql', {
    query: `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ai_usage_billing'
      ORDER BY ordinal_position
    `
  });
  
  if (columns) {
    console.log('\nTable structure:');
    console.log(columns);
  }
}

console.log('\n');
