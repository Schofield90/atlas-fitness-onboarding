const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateTotalVisits() {
  const davidId = 'd067bd15-0d73-4b3c-8d74-98cd9e049d13';

  console.log('🔍 Checking and updating Total Visits for David...\n');

  // Check current values
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('name, total_visits, last_visit')
    .eq('id', davidId)
    .single();

  if (client) {
    console.log('Current values in clients table:');
    console.log('  Name:', client.name);
    console.log('  Total Visits:', client.total_visits || 'null');
    console.log('  Last Visit:', client.last_visit || 'null');
  } else {
    console.log('Error fetching client:', clientError?.message);
    return;
  }

  // Count actual attendance
  const { data: bookings } = await supabase
    .from('class_bookings')
    .select('*')
    .eq('client_id', davidId)
    .not('attended_at', 'is', null)
    .order('booking_date', { ascending: false });

  const attendanceCount = bookings?.length || 0;
  console.log('\nActual attended bookings:', attendanceCount);

  if (bookings && bookings.length > 0) {
    console.log('Attendance dates:');
    bookings.forEach(b => {
      const date = b.booking_date || b.created_at.split('T')[0];
      console.log('  -', date, '-', b.notes || 'Class');
    });
  }

  // Update the client record
  const lastVisit = bookings && bookings.length > 0
    ? bookings[0].booking_date || bookings[0].created_at.split('T')[0]
    : null;

  console.log('\nUpdating client record...');
  const { error } = await supabase
    .from('clients')
    .update({
      total_visits: attendanceCount,
      last_visit: lastVisit
    })
    .eq('id', davidId);

  if (!error) {
    console.log('✅ Updated Total Visits to:', attendanceCount);
    console.log('✅ Updated Last Visit to:', lastVisit);
  } else {
    console.log('Error:', error.message);
  }

  // Also check if the members page might be loading from a different source
  console.log('\n🔍 Checking if data might be cached or loaded differently...');

  // Check if there's a customers table
  const { data: customerCheck } = await supabase
    .from('customers')
    .select('id')
    .eq('id', davidId)
    .single();

  if (customerCheck) {
    console.log('⚠️ David also exists in customers table - might need to update there too');
  }

  console.log('\n✅ Done! The UI should now show:');
  console.log('  - Total Visits: ' + attendanceCount);
  console.log('  - Last Visit: ' + lastVisit);
  console.log('\nRefresh the page to see the updated values.');
}

updateTotalVisits();