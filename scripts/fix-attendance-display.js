const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAttendanceDisplay() {
  const davidId = 'd067bd15-0d73-4b3c-8d74-98cd9e049d13';

  console.log('🔍 Finding David\'s bookings...\n');

  // Check all bookings regardless of status
  const { data: allBookings } = await supabase
    .from('class_bookings')
    .select('id, client_id, customer_id, booking_status, attended_at, notes')
    .or(`client_id.eq.${davidId},customer_id.eq.${davidId}`);

  console.log('Total bookings for David:', allBookings?.length || 0);
  if (allBookings && allBookings.length > 0) {
    console.log('\nCurrent bookings:');
    allBookings.forEach(b => {
      console.log(`  - Status: "${b.booking_status}" - ${b.notes || 'No notes'}`);
    });
  }

  // The UI is looking for specific statuses
  console.log('\n🎯 UI expects these statuses: confirmed, attended, completed');

  // Update our test bookings to have 'attended' status (which the UI expects)
  console.log('\n🔧 Updating bookings to \'attended\' status...');
  const { data: updated, error: updateError } = await supabase
    .from('class_bookings')
    .update({ booking_status: 'attended' })
    .eq('client_id', davidId)
    .eq('booking_status', 'completed')
    .select();

  if (!updateError && updated) {
    console.log(`✅ Updated ${updated.length} bookings to 'attended' status`);
  } else if (updateError) {
    console.log('Update error:', updateError.message);
  }

  // Also check if we need to use customer_id instead
  console.log('\n🔄 Checking if UI uses customer_id field...');

  // Try updating customer_id to match client_id
  const { error: customerError } = await supabase
    .from('class_bookings')
    .update({ customer_id: davidId })
    .eq('client_id', davidId)
    .is('customer_id', null);

  if (!customerError) {
    console.log('✅ Added customer_id to bookings');
  }

  // Final check
  const { data: finalCheck } = await supabase
    .from('class_bookings')
    .select('*')
    .or(`client_id.eq.${davidId},customer_id.eq.${davidId}`)
    .in('booking_status', ['confirmed', 'attended', 'completed']);

  console.log('\n✅ Final result:');
  console.log(`   ${finalCheck?.length || 0} bookings should now show in the Class Bookings tab`);

  if (finalCheck && finalCheck.length > 0) {
    console.log('\nBookings that will show:');
    finalCheck.forEach(b => {
      console.log(`  - ${b.booking_date || 'Today'} - ${b.booking_status} - ${b.notes || 'Class'}`);
    });
  }

  console.log('\n📍 Next steps:');
  console.log('1. Refresh David\'s profile page');
  console.log('2. Click on the "Class Bookings" tab');
  console.log('3. You should see the attendance records');
}

fixAttendanceDisplay();