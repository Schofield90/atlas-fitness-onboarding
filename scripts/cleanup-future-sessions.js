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

  try {
    // First, check what we're about to delete
    const { data: sessionsToDelete, error: sessionsError } = await supabase
      .from('class_sessions')
      .select('id, start_time, instructor_name, location')
      .eq('organization_id', organizationId)
      .gte('start_time', cutoffDate);

    if (sessionsError) {
      console.error('Error fetching sessions to delete:', sessionsError);
      return;
    }

    console.log(`Found ${sessionsToDelete?.length || 0} class sessions to delete from September 19th onwards`);

    if (!sessionsToDelete || sessionsToDelete.length === 0) {
      console.log('No future sessions to delete');
      return;
    }

    // Get session IDs
    const sessionIds = sessionsToDelete.map(s => s.id);

    // Check bookings that will be deleted
    const { data: bookingsToDelete, error: bookingsError } = await supabase
      .from('class_bookings')
      .select('id')
      .in('session_id', sessionIds);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
    } else {
      console.log(`Found ${bookingsToDelete?.length || 0} bookings to delete`);
    }

    // Delete bookings first (due to foreign key constraints)
    const { error: deleteBookingsError, count: bookingsDeleted } = await supabase
      .from('class_bookings')
      .delete()
      .in('session_id', sessionIds);

    if (deleteBookingsError) {
      console.error('Error deleting bookings:', deleteBookingsError);
      return;
    }

    console.log(`Deleted ${bookingsDeleted || 0} bookings`);

    // Now delete the class sessions
    const { error: deleteSessionsError, count: sessionsDeleted } = await supabase
      .from('class_sessions')
      .delete()
      .eq('organization_id', organizationId)
      .gte('start_time', cutoffDate);

    if (deleteSessionsError) {
      console.error('Error deleting sessions:', deleteSessionsError);
      return;
    }

    console.log(`Deleted ${sessionsDeleted || sessionsToDelete.length} class sessions`);

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
      remainingSessions?.forEach(s => {
        console.log(`  - ${new Date(s.start_time).toLocaleString()}`);
      });
    }

    // Verify programs are intact
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('id, name')
      .eq('organization_id', organizationId);

    if (programsError) {
      console.error('Error checking programs:', programsError);
    } else {
      console.log(`\n${programs?.length || 0} programs (class types) remain intact`);
    }

    console.log('\n✅ Cleanup complete! All class sessions from September 19th onwards have been deleted.');
    console.log('Historical data (September 18th and earlier) has been preserved.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

cleanupFutureSessions();