/**
 * Script to check bookings for a specific customer
 * Run with: node check-bookings.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const customerId = '126059c3-3970-4db0-bccb-b66e5d948632';

async function checkBookings() {
  console.log('\n=== Checking bookings for customer:', customerId, '===\n');

  // Check customer exists
  const { data: customer, error: customerError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', customerId)
    .single();

  if (customerError) {
    console.error('Customer lookup error:', customerError);
  } else {
    console.log('✅ Customer found:', customer.first_name, customer.last_name, customer.email);
    console.log('   Organization:', customer.org_id);
  }

  console.log('\n--- Checking bookings table ---');
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      client_id,
      class_session_id,
      status,
      booking_date,
      created_at,
      class_sessions (
        id,
        name,
        start_time
      )
    `)
    .eq('client_id', customerId);

  if (bookingsError) {
    console.error('❌ Bookings table error:', bookingsError);
  } else {
    console.log(`Found ${bookings.length} bookings in 'bookings' table:`);
    bookings.forEach((b, i) => {
      console.log(`  ${i + 1}. ID: ${b.id}`);
      console.log(`     Status: ${b.status}`);
      console.log(`     Session: ${b.class_sessions?.name || 'N/A'}`);
      console.log(`     Start: ${b.class_sessions?.start_time || 'N/A'}`);
      console.log(`     Created: ${b.created_at}`);
    });
  }

  console.log('\n--- Checking class_bookings table ---');
  const { data: classBookings, error: classBookingsError } = await supabase
    .from('class_bookings')
    .select(`
      id,
      client_id,
      customer_id,
      class_session_id,
      booking_status,
      created_at,
      class_sessions (
        id,
        name,
        start_time
      )
    `)
    .or(`client_id.eq.${customerId},customer_id.eq.${customerId}`);

  if (classBookingsError) {
    console.error('❌ Class bookings table error:', classBookingsError);
  } else {
    console.log(`Found ${classBookings.length} bookings in 'class_bookings' table:`);
    classBookings.forEach((b, i) => {
      console.log(`  ${i + 1}. ID: ${b.id}`);
      console.log(`     Status: ${b.booking_status}`);
      console.log(`     Client ID: ${b.client_id || 'N/A'}`);
      console.log(`     Customer ID: ${b.customer_id || 'N/A'}`);
      console.log(`     Session: ${b.class_sessions?.name || 'N/A'}`);
      console.log(`     Start: ${b.class_sessions?.start_time || 'N/A'}`);
      console.log(`     Created: ${b.created_at}`);
    });
  }

  console.log('\n--- Checking ALL bookings (any client_id) in bookings table ---');
  const { data: allBookings, error: allError } = await supabase
    .from('bookings')
    .select('id, client_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!allError && allBookings.length > 0) {
    console.log(`Recent bookings (last 10):`);
    allBookings.forEach((b, i) => {
      console.log(`  ${i + 1}. Client: ${b.client_id} | Status: ${b.status} | Created: ${b.created_at}`);
    });
  }

  console.log('\n=== Done ===\n');
}

checkBookings().catch(console.error);
