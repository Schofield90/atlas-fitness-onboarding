const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixLastVisitDates() {
  console.log('🔧 Fixing last visit dates for all clients...\n');

  try {
    // Get all clients
    const { data: clients, error: fetchError } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .not('organization_id', 'is', null)
      .limit(500); // Process up to 500 clients

    if (fetchError) {
      console.error('Error fetching clients:', fetchError);
      return;
    }

    console.log(`Found ${clients.length} clients to process\n`);

    let updated = 0;
    let skipped = 0;

    for (const client of clients) {
      // Get last visit
      const { data: bookings } = await supabase
        .from('class_bookings')
        .select('booking_date')
        .or(`client_id.eq.${client.id},customer_id.eq.${client.id}`)
        .eq('booking_status', 'confirmed')
        .order('booking_date', { ascending: false });

      const lastBooking = bookings && bookings.length > 0 ? bookings[0] : null;

      // Get total visits
      const { count } = await supabase
        .from('class_bookings')
        .select('*', { count: 'exact', head: true })
        .or(`client_id.eq.${client.id},customer_id.eq.${client.id}`)
        .eq('booking_status', 'confirmed');

      if (lastBooking?.booking_date || count > 0) {
        // Update client
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            last_visit: lastBooking?.booking_date || null,
            total_visits: count || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', client.id);

        if (!updateError) {
          updated++;
          console.log(`✅ Updated ${client.first_name} ${client.last_name}: Last visit: ${lastBooking?.booking_date || 'N/A'}, Total visits: ${count}`);
        } else {
          console.error(`❌ Failed to update ${client.first_name} ${client.last_name}:`, updateError.message);
        }
      } else {
        skipped++;
      }

      // Add a small delay to avoid rate limiting
      if (updated % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ COMPLETED: Updated ${updated} clients`);
    console.log(`⏭️  Skipped ${skipped} clients (no bookings)`);
    console.log('='.repeat(60));

    // Show a summary of recent updates
    const { data: summary } = await supabase
      .from('clients')
      .select('first_name, last_name, last_visit, total_visits')
      .not('last_visit', 'is', null)
      .order('last_visit', { ascending: false })
      .limit(5);

    if (summary && summary.length > 0) {
      console.log('\n📊 Recent client visits:');
      summary.forEach(client => {
        console.log(`   ${client.first_name} ${client.last_name}: Last visit ${client.last_visit}, Total: ${client.total_visits} visits`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixLastVisitDates();