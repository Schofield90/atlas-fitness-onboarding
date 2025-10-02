const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStructure() {
  const memberId = '126059c3-3970-4db0-bccb-b66e5d948632';

  // Test the exact API query
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      class_sessions (
        id,
        name,
        start_time,
        end_time,
        max_capacity,
        current_bookings,
        location,
        instructor_name,
        program_id,
        programs (
          name,
          description
        )
      )
    `)
    .eq("client_id", memberId)
    .order("created_at", { ascending: false });

  console.log('Query result:');
  console.log('Count:', data?.length || 0);
  console.log('Error:', error);
  
  if (data && data.length > 0) {
    console.log('\nFirst booking sample:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

checkStructure();
