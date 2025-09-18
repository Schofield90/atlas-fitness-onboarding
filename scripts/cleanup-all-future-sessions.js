const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupAllFutureSessions() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  // Keep everything up to and including Sept 18, 2025, delete everything from Sept 19, 2025 onwards
  const cutoffDate = '2025-09-19T00:00:00';
  const batchSize = 100; // Process in batches

  try {
    // First, check what we're keeping (should be Sept 18 and earlier)
    const { data: sessionsToKeep, error: keepError } = await supabase
      .from('class_sessions')
      .select('id, start_time')
      .eq('organization_id', organizationId)
      .lt('start_time', cutoffDate)
      .order('start_time', { ascending: false })
      .limit(10);

    if (!keepError && sessionsToKeep) {
      console.log('Sessions to KEEP (Sept 18, 2025 and earlier):');
      sessionsToKeep.forEach(s => {
        console.log(`  - ${new Date(s.start_time).toLocaleString()}`);
      });
    }

    // Now get all sessions to delete (Sept 19, 2025 and later, including 2026)
    const { data: allSessionsToDelete, error: countError } = await supabase
      .from('class_sessions')
      .select('id, start_time')
      .eq('organization_id', organizationId)
      .gte('start_time', cutoffDate);

    if (countError) {
      console.error('Error counting sessions to delete:', countError);
      return;
    }

    console.log(`\nFound ${allSessionsToDelete?.length || 0} sessions to DELETE (from Sept 19, 2025 onwards)`);

    if (!allSessionsToDelete || allSessionsToDelete.length === 0) {
      console.log('No future sessions to delete');
      return;
    }

    // Show date range of sessions to be deleted
    if (allSessionsToDelete.length > 0) {
      const dates = allSessionsToDelete.map(s => new Date(s.start_time));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      console.log(`Date range to delete: ${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`);
    }

    let totalSessionsDeleted = 0;

    // Process deletion in batches
    for (let i = 0; i < allSessionsToDelete.length; i += batchSize) {
      const batch = allSessionsToDelete.slice(i, i + batchSize);
      const sessionIds = batch.map(s => s.id);

      console.log(`\nDeleting batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(allSessionsToDelete.length/batchSize)} (${sessionIds.length} sessions)...`);

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
        console.log(`  ✓ Deleted ${sessionsCount} class sessions`);
      }

      // Add a small delay between batches
      if (i + batchSize < allSessionsToDelete.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`Total deleted: ${totalSessionsDeleted} sessions`);

    // Verify what's left
    const { data: remainingSessions, error: remainingError } = await supabase
      .from('class_sessions')
      .select('id, start_time')
      .eq('organization_id', organizationId)
      .order('start_time', { ascending: false })
      .limit(10);

    if (!remainingError && remainingSessions) {
      console.log('\n📅 Remaining sessions (should be Sept 18, 2025 or earlier):');
      if (remainingSessions.length > 0) {
        remainingSessions.forEach(s => {
          const date = new Date(s.start_time);
          const marker = date >= new Date('2025-09-19') ? '⚠️ ' : '✓ ';
          console.log(`  ${marker}${date.toLocaleString()}`);
        });
      } else {
        console.log('  No sessions found');
      }
    }

    // Verify programs are intact
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('id, name, max_capacity')
      .eq('organization_id', organizationId);

    if (!programsError && programs) {
      console.log(`\n✅ ${programs.length} programs (class types) remain intact:`);
      programs.forEach(p => console.log(`  - ${p.name} (capacity: ${p.max_capacity || 'not set'})`));
    }

    console.log('\n✨ Calendar is now clear from September 19, 2025 onwards!');
    console.log('Historical data (September 18, 2025 and earlier) has been preserved.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

cleanupAllFutureSessions();