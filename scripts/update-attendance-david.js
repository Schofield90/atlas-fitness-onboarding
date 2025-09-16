const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateAttendance() {
  const davidId = 'd067bd15-0d73-4b3c-8d74-98cd9e049d13';
  const bookingId = 'e4d8467f-7bd5-4e72-bb1d-d5869fbc51a3';
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

  console.log('📊 Setting up David\'s attendance records...\n');

  // Update the booking with attendance info
  const { error } = await supabase
    .from('class_bookings')
    .update({
      attended_at: new Date().toISOString(),
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: '09:00',
      booking_type: 'class',
      notes: 'CrossFit Session - Test Attendance',
      payment_status: 'succeeded'
    })
    .eq('id', bookingId);

  if (!error) {
    console.log('✅ Updated booking with attendance details');
  } else {
    console.log('Error updating:', error.message);
  }

  // Create another historical attendance
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: newBooking, error: newError } = await supabase
    .from('class_bookings')
    .insert({
      organization_id: organizationId,
      client_id: davidId,
      booking_status: 'completed',
      booking_date: yesterday.toISOString().split('T')[0],
      booking_time: '18:00',
      attended_at: yesterday.toISOString(),
      booking_type: 'class',
      payment_status: 'succeeded',
      notes: 'Evening Yoga Class',
      created_at: yesterday.toISOString()
    })
    .select()
    .single();

  if (!newError) {
    console.log('✅ Created yesterday\'s yoga attendance');
  } else {
    console.log('Error creating yoga:', newError.message);
  }

  // Check total attendance
  const { data: allBookings } = await supabase
    .from('class_bookings')
    .select('*')
    .eq('client_id', davidId)
    .order('booking_date', { ascending: false });

  console.log('\nDavid\'s attendance history:');
  if (allBookings && allBookings.length > 0) {
    allBookings.forEach(b => {
      const date = b.booking_date || b.created_at.split('T')[0];
      const time = b.booking_time || 'N/A';
      const attended = b.attended_at ? '✅' : '❌';
      console.log(`  ${attended} ${date} at ${time} - ${b.notes || 'Class'}`);
    });

    console.log('\nTotal sessions: ' + allBookings.length);
    console.log('Attended: ' + allBookings.filter(b => b.attended_at).length);
  }

  // Now check if there's any imported attendance
  console.log('\n🔍 Checking for imported attendance records...');

  // Check if attendance was imported with customer_id instead of client_id
  const { data: customerBookings } = await supabase
    .from('class_bookings')
    .select('*')
    .eq('customer_id', davidId);

  if (customerBookings && customerBookings.length > 0) {
    console.log('Found ' + customerBookings.length + ' bookings with customer_id');
    console.log('These might be imported but not showing due to ID mismatch');
  }

  // Check for any bookings with booking_type = 'attendance_import'
  const { data: importedBookings } = await supabase
    .from('class_bookings')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('booking_type', 'attendance_import')
    .limit(5);

  if (importedBookings && importedBookings.length > 0) {
    console.log('\n📥 Found imported attendance records:');
    importedBookings.forEach(b => {
      console.log(`  - Client ID: ${b.client_id || b.customer_id}`);
      console.log(`    Date: ${b.booking_date}, Notes: ${b.notes}`);
    });
  }
}

updateAttendance();