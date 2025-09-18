const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkClassTables() {
  console.log('🔍 Checking class-related tables...\n');

  try {
    // Check various possible class tables
    const tablesToCheck = [
      'classes',
      'class_types',
      'class_schedules',
      'fitness_classes',
      'gym_classes'
    ];

    for (const table of tablesToCheck) {
      try {
        const { data, count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: false })
          .limit(1);

        if (!error) {
          console.log(`✅ ${table}: ${count || 0} records`);
          if (data && data.length > 0) {
            console.log(`   Sample columns: ${Object.keys(data[0]).join(', ')}`);
          }
        } else {
          console.log(`❌ ${table}: Not found or inaccessible`);
        }
      } catch (err) {
        console.log(`❌ ${table}: Error - ${err.message}`);
      }
    }

    // Check what class_sessions references
    console.log('\n🔍 Checking class_sessions structure...');
    const { data: sessionData } = await supabase
      .from('class_sessions')
      .select('*')
      .limit(1);

    if (sessionData && sessionData.length > 0) {
      const session = sessionData[0];
      console.log('Sample class_session record:');
      Object.keys(session).forEach(key => {
        if (key.includes('class') || key.includes('type')) {
          console.log(`   ${key}: ${session[key]}`);
        }
      });

      // Check if class_id references exist
      if (session.class_id) {
        console.log(`\n🔍 Checking if class_id ${session.class_id} exists in classes table...`);
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('*')
          .eq('id', session.class_id)
          .single();

        if (!classError && classData) {
          console.log('✅ Found matching class record');
        } else {
          console.log('❌ No matching class record found');
        }
      }
    }

    // Check bookings structure
    console.log('\n🔍 Checking bookings structure...');
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);

    if (bookingData && bookingData.length > 0) {
      console.log('Sample booking record foreign keys:');
      const booking = bookingData[0];
      console.log(`   session_id: ${booking.session_id}`);
      console.log(`   client_id: ${booking.client_id}`);
      console.log(`   org_id: ${booking.org_id}`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

checkClassTables();