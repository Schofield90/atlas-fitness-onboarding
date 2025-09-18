const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupFutureSessions() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  const cutoffDate = '2025-09-19T00:00:00';
  const batchSize = 50; // Process in smaller batches

  try {
    // First, check total count
    const { data: allSessions, error: countError } = await supabase
      .from('class_sessions')
      .select('id')
      .eq('organization_id', organizationId)
      .gte('start_time', cutoffDate);

    if (countError) {
      console.error('Error counting sessions:', countError);
      return;
    }

    console.log(`Found ${allSessions?.length || 0} class sessions to delete from September 19th onwards`);

    if (!allSessions || allSessions.length === 0) {
      console.log('No future sessions to delete');
      return;
    }

    let totalBookingsDeleted = 0;
    let totalSessionsDeleted = 0;

    // Process in batches
    for (let i = 0; i < allSessions.length; i += batchSize) {
      const batch = allSessions.slice(i, i + batchSize);
      const sessionIds = batch.map(s => s.id);

      console.log(`\nProcessing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(allSessions.length/batchSize)} (${sessionIds.length} sessions)...`);

      // Delete bookings for this batch
      const { data: deletedBookings, error: deleteBookingsError } = await supabase
        .from('class_bookings')
        .delete()
        .in('session_id', sessionIds)
        .select();

      if (deleteBookingsError) {
        console.error('Error deleting bookings in batch:', deleteBookingsError);
      } else {
        const bookingsCount = deletedBookings?.length || 0;
        totalBookingsDeleted += bookingsCount;
        console.log(`  - Deleted ${bookingsCount} bookings`);
      }

      // Delete sessions in this batch
      const { data: deletedSessions, error: deleteSessionsError } = await supabase
        .from('class_sessions')
        .delete()
        .in('id', sessionIds)
        .select();

      if (deleteSessionsError) {
        console.error('Error deleting sessions in batch:', deleteSessionsError);
      } else {
        const sessionsCount = deletedSessions?.length || 0;
        totalSessionsDeleted += sessionsCount;
        console.log(`  - Deleted ${sessionsCount} class sessions`);
      }

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < allSessions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`Total deleted: ${totalSessionsDeleted} sessions and ${totalBookingsDeleted} bookings`);

    // Verify remaining sessions
    const { data: remainingSessions, error: remainingError } = await supabase
      .from('class_sessions')
      .select('id, start_time')
      .eq('organization_id', organizationId)
      .order('start_time', { ascending: false })
      .limit(5);

    if (remainingError) {
      console.error('Error checking remaining sessions:', remainingError);
    } else {
      console.log('\nRemaining sessions (most recent):');
      if (remainingSessions && remainingSessions.length > 0) {
        remainingSessions.forEach(s => {
          console.log(`  - ${new Date(s.start_time).toLocaleString()}`);
        });
      } else {
        console.log('  No sessions found');
      }
    }

    // Verify programs are intact
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('id, name')
      .eq('organization_id', organizationId);

    if (programsError) {
      console.error('Error checking programs:', programsError);
    } else {
      console.log(`\n${programs?.length || 0} programs (class types) remain intact:`);
      programs?.forEach(p => console.log(`  - ${p.name}`));
    }

    console.log('\nAll class sessions from September 19th 2025 onwards have been deleted.');
    console.log('Historical data (September 18th 2025 and earlier) has been preserved.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

cleanupFutureSessions();