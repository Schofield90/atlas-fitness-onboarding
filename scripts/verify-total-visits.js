const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTotalVisits() {
  const davidId = 'd067bd15-0d73-4b3c-8d74-98cd9e049d13';

  console.log('🔍 Verifying Total Visits calculation for David Wrightson...\n');

  // Count bookings with attended_at
  const { data: attendedBookings } = await supabase
    .from('class_bookings')
    .select('id, booking_date, attended_at, notes')
    .or(`client_id.eq.${davidId},customer_id.eq.${davidId}`)
    .not('attended_at', 'is', null);

  const totalVisits = attendedBookings?.length || 0;

  console.log(`✅ Total Visits calculated: ${totalVisits}`);

  if (attendedBookings && attendedBookings.length > 0) {
    console.log('\nAttended sessions:');
    attendedBookings.forEach(b => {
      const date = b.booking_date || b.attended_at?.split('T')[0] || 'Unknown date';
      console.log(`  - ${date}: ${b.notes || 'Class Session'}`);
    });

    // Get most recent visit
    const sorted = attendedBookings.sort((a, b) => {
      const dateA = new Date(a.booking_date || a.attended_at);
      const dateB = new Date(b.booking_date || b.attended_at);
      return dateB.getTime() - dateA.getTime();
    });

    const lastVisit = sorted[0].booking_date || sorted[0].attended_at;
    console.log(`\n📅 Last Visit: ${lastVisit}`);
  }

  console.log('\n✅ The UI should now show:');
  console.log(`   Total Visits: ${totalVisits}`);
  console.log('\n📍 Check David\'s profile at:');
  console.log('   http://localhost:3001/members/d067bd15-0d73-4b3c-8d74-98cd9e049d13');
}

verifyTotalVisits();