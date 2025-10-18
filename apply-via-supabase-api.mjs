import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k',
  {
    db: {
      schema: 'public'
    }
  }
);

console.log('Checking current schema...');

// First, check if column already exists
const { data: existingCheck, error: checkError } = await supabase
  .from('booking_links')
  .select('*')
  .limit(1);

if (checkError) {
  console.error('Error checking table:', checkError);
} else {
  console.log('Current columns:', Object.keys(existingCheck[0] || {}));

  if (existingCheck[0] && 'max_days_in_advance' in existingCheck[0]) {
    console.log('✅ Column max_days_in_advance already exists!');
  } else {
    console.log('❌ Column max_days_in_advance does not exist');
    console.log('\nPlease apply this migration manually in the Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
    console.log('\nSQL to run:');
    console.log('----------------------------------------');
    console.log('ALTER TABLE booking_links');
    console.log('ADD COLUMN IF NOT EXISTS max_days_in_advance INTEGER DEFAULT 30;');
    console.log('----------------------------------------');
  }
}
