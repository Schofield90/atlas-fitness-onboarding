import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

console.log('Querying information_schema...\n');

// Query the information_schema to see column definitions
const { data, error } = await supabase
  .rpc('exec_sql', {
    sql: `
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'booking_links'
      ORDER BY ordinal_position;
    `
  });

if (error) {
  console.log('RPC method not available, trying direct query approach...\n');

  // Alternative: Try to insert a test record and see what fails
  const testLink = {
    organization_id: 'c762845b-34fc-41ea-9e01-f70b81c44ff7',
    slug: 'test-' + Date.now(),
    name: 'Test Link',
    type: 'individual',
    appointment_type_ids: [],
    is_active: true,
    is_public: true,
    requires_auth: false,
    timezone: 'Europe/London',
    settings: {},
    max_days_in_advance: 30,
    meeting_title_template: 'Test',
    meeting_location: { type: 'in_person' },
    availability_rules: {},
    form_configuration: { fields: [], consent_text: '' },
    confirmation_settings: { auto_confirm: true },
    notification_settings: { email_enabled: true },
    style_settings: {},
    payment_settings: {},
    cancellation_policy: {},
    booking_limits: {},
    buffer_settings: {}
  };

  console.log('Attempting to insert test record...');
  const { data: insertData, error: insertError } = await supabase
    .from('booking_links')
    .insert(testLink)
    .select();

  if (insertError) {
    console.log('\n❌ Insert failed with error:');
    console.log(insertError.message);

    // Parse the error to find missing column
    if (insertError.message.includes('column')) {
      const match = insertError.message.match(/'([^']+)'/);
      if (match) {
        console.log(`\n⚠️  Missing column detected: ${match[1]}`);
      }
    }

    console.log('\n⚠️  The migration has NOT been applied successfully.');
    console.log('\nPlease verify the SQL ran without errors in Supabase.');
    console.log('You might need to refresh the schema cache in Supabase.');
  } else {
    console.log('\n✅ Insert successful! All columns exist.');
    console.log('Cleaning up test record...');

    // Delete the test record
    await supabase
      .from('booking_links')
      .delete()
      .eq('id', insertData[0].id);

    console.log('✅ Test record removed.');
  }
} else {
  console.log('Schema query result:', data);
}
