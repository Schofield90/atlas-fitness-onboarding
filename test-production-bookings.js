// Test production Supabase directly
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use production URL from console logs
const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testProduction() {
  const memberId = '126059c3-3970-4db0-bccb-b66e5d948632';

  console.log('Testing production database...\n');

  // Test 1: Check member exists
  const { data: member, error: memberError } = await supabase
    .from('clients')
    .select('id, org_id, first_name, last_name')
    .eq('id', memberId)
    .single();

  console.log('Member:', member, memberError);

  if (!member) {
    console.log('\n❌ Member not found in production!');
    return;
  }

  console.log(`\n✅ Member found: ${member.first_name} ${member.last_name}`);
  console.log(`   Org ID: ${member.org_id}`);

  // Test 2: Check bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .eq('client_id', memberId);

  console.log('\nBookings query result:');
  console.log('  Count:', bookings?.length || 0);
  console.log('  Error:', bookingsError);

  // Test 3: Check class_bookings
  const { data: classBookings, error: classBookingsError } = await supabase
    .from('class_bookings')
    .select('*')
    .or(`client_id.eq.${memberId},customer_id.eq.${memberId}`);

  console.log('\nClass bookings query result:');
  console.log('  Count:', classBookings?.length || 0);
  console.log('  Error:', classBookingsError);

  console.log('\n📊 Total bookings:', (bookings?.length || 0) + (classBookings?.length || 0));
}

testProduction().catch(console.error);
