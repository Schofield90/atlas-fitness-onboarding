import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

const sql = readFileSync('/Users/Sam/atlas-fitness-onboarding/supabase/migrations/20251018_add_max_days_in_advance.sql', 'utf8');

console.log('Applying migration...');
const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

if (error) {
  console.error('Error applying migration:', error);

  // Try direct approach
  console.log('Trying direct column addition...');
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql_string: 'ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS max_days_in_advance INTEGER DEFAULT 30;'
  });

  if (alterError) {
    console.error('Direct approach also failed:', alterError);
    process.exit(1);
  }
}

console.log('✅ Migration applied successfully!');
console.log('Verifying column exists...');

const { data: columns, error: verifyError } = await supabase
  .from('booking_links')
  .select('*')
  .limit(1);

if (verifyError) {
  console.error('Error verifying:', verifyError);
} else {
  console.log('✅ Column verification successful');
}
