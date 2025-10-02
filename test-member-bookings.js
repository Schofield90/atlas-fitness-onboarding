const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMemberBookings() {
  const memberId = '126059c3-3970-4db0-bccb-b66e5d948632';

  console.log('\n=== Testing Member Bookings ===\n');
  console.log('Member ID:', memberId);

  // Check bookings table
  console.log('\n--- Checking bookings table ---');
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      *,
      class_sessions (
        id,
        name,
        start_time,
        end_time,
        location,
        instructor_name
      )
    `)
    .eq('client_id', memberId);

  console.log('Bookings found:', bookings?.length || 0);
  if (bookingsError) console.error('Error:', bookingsError);
  if (bookings) console.log(JSON.stringify(bookings, null, 2));

  // Check class_bookings table
  console.log('\n--- Checking class_bookings table ---');
  const { data: classBookings, error: classBookingsError } = await supabase
    .from('class_bookings')
    .select(`
      *,
      class_sessions (
        id,
        name,
        start_time,
        end_time,
        location,
        instructor_name
      )
    `)
    .or(`client_id.eq.${memberId},customer_id.eq.${memberId}`);

  console.log('Class bookings found:', classBookings?.length || 0);
  if (classBookingsError) console.error('Error:', classBookingsError);
  if (classBookings) console.log(JSON.stringify(classBookings, null, 2));

  // Check total
  const total = (bookings?.length || 0) + (classBookings?.length || 0);
  console.log('\n--- Total Bookings:', total, '---\n');
}

testMemberBookings().catch(console.error);
