const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndAddColumn() {
  console.log('🔍 Checking if last_visit column exists...\n');
  
  try {
    // First, try to select the column to see if it exists
    const { data: testData, error: testError } = await supabase
      .from('clients')
      .select('id, last_visit')
      .limit(1);

    if (testError) {
      if (testError.message.includes('last_visit')) {
        console.log('❌ Column last_visit does not exist');
        console.log('✨ Column needs to be added via Supabase Dashboard SQL Editor');
        console.log('\n📋 Run this SQL in Supabase Dashboard:\n');
        console.log('```sql');
        console.log('-- Add last_visit column to clients table');
        console.log('ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_visit DATE;');
        console.log('');
        console.log('-- Add total_visits column if it does not exist');
        console.log('ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0;');
        console.log('');
        console.log('-- Update existing clients with their last visit from class_bookings');
        console.log('UPDATE clients c');
        console.log('SET ');
        console.log('  last_visit = (');
        console.log('    SELECT MAX(cb.booking_date)');
        console.log('    FROM class_bookings cb');
        console.log('    WHERE (cb.client_id = c.id OR cb.customer_id = c.id)');
        console.log('    AND cb.booking_status = \'confirmed\'');
        console.log('  ),');
        console.log('  total_visits = (');
        console.log('    SELECT COUNT(*)');
        console.log('    FROM class_bookings cb');
        console.log('    WHERE (cb.client_id = c.id OR cb.customer_id = c.id)');
        console.log('    AND cb.booking_status = \'confirmed\'');
        console.log('  )');
        console.log('WHERE c.organization_id IS NOT NULL;');
        console.log('```');
        console.log('\n🔗 Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
        console.log('\nAfter running the SQL, run: node scripts/fix-last-visit-now.js');
      } else {
        console.error('Error:', testError);
      }
    } else {
      console.log('✅ Column last_visit exists!');
      console.log('Sample data:', testData);
      console.log('\nYou can now run: node scripts/fix-last-visit-now.js');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkAndAddColumn();