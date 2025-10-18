import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

console.log('Checking booking_links table schema...\n');

// Try to fetch one record to see what columns exist
const { data, error } = await supabase
  .from('booking_links')
  .select('*')
  .limit(1);

if (error) {
  console.error('❌ Error querying table:', error.message);
} else {
  console.log('Current booking_links columns:');
  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    columns.forEach(col => console.log(`  - ${col}`));

    console.log('\n✅ Columns found:', columns.length);

    // Check for missing columns
    const requiredColumns = [
      'max_days_in_advance',
      'meeting_title_template',
      'assigned_staff_ids',
      'meeting_location',
      'availability_rules',
      'form_configuration',
      'confirmation_settings',
      'notification_settings',
      'style_settings',
      'payment_settings',
      'cancellation_policy',
      'booking_limits',
      'buffer_settings'
    ];

    const missingColumns = requiredColumns.filter(col => !columns.includes(col));

    if (missingColumns.length > 0) {
      console.log('\n❌ Missing columns:');
      missingColumns.forEach(col => console.log(`  - ${col}`));
      console.log('\n⚠️  Migration has NOT been applied yet!');
      console.log('\nPlease run the SQL in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
    } else {
      console.log('\n✅ All required columns exist! Migration was successful.');
    }
  } else {
    console.log('⚠️  Table is empty, cannot check columns');
  }
}
