const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBookingTables() {
  console.log('🔍 Checking booking-related tables...\n');

  try {
    // Check various booking tables
    const bookingTables = [
      'bookings',
      'class_bookings',
      'session_bookings',
      'customer_bookings'
    ];

    for (const table of bookingTables) {
      try {
        const { data, count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(2);

        if (!error) {
          console.log(`\n✅ ${table}: ${count || 0} records`);
          if (data && data.length > 0) {
            console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);

            // Show first record details
            console.log('\n   Sample record:');
            const record = data[0];
            Object.entries(record).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                const displayValue = typeof value === 'object' ?
                  JSON.stringify(value).substring(0, 50) :
                  String(value).substring(0, 50);
                console.log(`     ${key}: ${displayValue}`);
              }
            });
          }
        } else {
          console.log(`❌ ${table}: ${error.message}`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    // Check class_types table in detail
    console.log('\n\n🔍 Checking class_types table in detail...');
    const { data: classTypesData, error: classTypesError } = await supabase
      .from('class_types')
      .select('*')
      .limit(5);

    if (!classTypesError) {
      console.log(`Found ${classTypesData?.length || 0} class types`);
      if (classTypesData && classTypesData.length > 0) {
        console.log('Sample class type:', classTypesData[0]);
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

checkBookingTables();