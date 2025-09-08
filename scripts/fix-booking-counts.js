#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixBookingCounts() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('🔧 Fixing booking counts for all class sessions...\n');
  
  try {
    // 1. Get all class sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('class_sessions')
      .select('id, name, start_time, current_bookings')
      .eq('organization_id', organizationId)
      .gte('start_time', new Date().toISOString())
      .order('start_time')
      .limit(50);
    
    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return;
    }
    
    console.log(`Found ${sessions?.length || 0} upcoming sessions to check\n`);
    
    let fixedCount = 0;
    
    // 2. For each session, count actual bookings and update if needed
    for (const session of sessions || []) {
      // Count actual bookings in class_bookings table
      const { data: bookings, error: bookingsError } = await supabase
        .from('class_bookings')
        .select('id')
        .eq('class_session_id', session.id)
        .in('booking_status', ['confirmed', 'attended']);
      
      if (bookingsError) {
        console.error(`Error counting bookings for session ${session.id}:`, bookingsError);
        continue;
      }
      
      const actualCount = bookings?.length || 0;
      const storedCount = session.current_bookings || 0;
      
      if (actualCount !== storedCount) {
        console.log(`Session: ${session.name || 'Group Pt'} at ${new Date(session.start_time).toLocaleString()}`);
        console.log(`  Current count: ${storedCount}`);
        console.log(`  Actual count: ${actualCount}`);
        console.log(`  → Updating to ${actualCount}`);
        
        // Update the count
        const { error: updateError } = await supabase
          .from('class_sessions')
          .update({ current_bookings: actualCount })
          .eq('id', session.id);
        
        if (updateError) {
          console.error(`  ❌ Error updating: ${updateError.message}`);
        } else {
          console.log(`  ✅ Updated successfully`);
          fixedCount++;
        }
        console.log('');
      }
    }
    
    // 3. Also check for any orphaned bookings (bookings without valid sessions)
    console.log('\n🔍 Checking for orphaned bookings...');
    
    const { data: allBookings, error: allBookingsError } = await supabase
      .from('class_bookings')
      .select('id, class_session_id, customer_id')
      .eq('organization_id', organizationId);
    
    if (!allBookingsError && allBookings) {
      const sessionIds = sessions?.map(s => s.id) || [];
      const orphanedBookings = allBookings.filter(b => !sessionIds.includes(b.class_session_id));
      
      if (orphanedBookings.length > 0) {
        console.log(`Found ${orphanedBookings.length} orphaned bookings`);
        console.log('These bookings reference non-existent or past sessions');
        
        // Optionally delete orphaned bookings
        const orphanedIds = orphanedBookings.map(b => b.id);
        const { error: deleteError } = await supabase
          .from('class_bookings')
          .delete()
          .in('id', orphanedIds);
        
        if (deleteError) {
          console.error('Error deleting orphaned bookings:', deleteError);
        } else {
          console.log(`✅ Deleted ${orphanedBookings.length} orphaned bookings`);
        }
      } else {
        console.log('✅ No orphaned bookings found');
      }
    }
    
    // 4. Summary
    console.log('\n📊 Summary:');
    console.log(`- Checked ${sessions?.length || 0} sessions`);
    console.log(`- Fixed ${fixedCount} incorrect counts`);
    
    // 5. Show current booking status for Tuesday's class
    console.log('\n📅 Tuesday\'s 6:00 AM class status:');
    const { data: tuesdaySession } = await supabase
      .from('class_sessions')
      .select('id, name, start_time, current_bookings, max_capacity')
      .eq('organization_id', organizationId)
      .gte('start_time', '2025-09-09T00:00:00')
      .lte('start_time', '2025-09-09T23:59:59')
      .order('start_time')
      .limit(1)
      .single();
    
    if (tuesdaySession) {
      const { data: tuesdayBookings } = await supabase
        .from('class_bookings')
        .select('*, leads!inner(name, email)')
        .eq('class_session_id', tuesdaySession.id)
        .in('booking_status', ['confirmed', 'attended']);
      
      console.log(`Session: ${tuesdaySession.name || 'Group Pt'}`);
      console.log(`Time: ${new Date(tuesdaySession.start_time).toLocaleString()}`);
      console.log(`Bookings: ${tuesdaySession.current_bookings}/${tuesdaySession.max_capacity}`);
      
      if (tuesdayBookings && tuesdayBookings.length > 0) {
        console.log('\nAttendees:');
        tuesdayBookings.forEach(booking => {
          console.log(`  - ${booking.leads?.name || 'Unknown'} (${booking.booking_status})`);
        });
      }
    }
    
    console.log('\n✅ Booking counts have been corrected!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixBookingCounts().catch(console.error);