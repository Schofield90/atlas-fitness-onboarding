#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DEMO_ORG_ID = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';

// The date range the user asked about
const startDate = '2025-10-15';
const endDate = '2025-10-22';

console.log('Checking Demo Fitness Studio sessions...');
console.log(`Date range: ${startDate} to ${endDate}\n`);

// Check class sessions
const { data: sessions, error } = await supabase
  .from('class_sessions')
  .select('id, start_time, name, max_capacity')
  .eq('organization_id', DEMO_ORG_ID)
  .gte('start_time', startDate)
  .lte('start_time', endDate + 'T23:59:59')
  .order('start_time', { ascending: true });

if (error) {
  console.error('Error:', error);
} else {
  console.log(`✅ Found ${sessions.length} sessions\n`);

  if (sessions.length > 0) {
    console.log('Sessions:');
    sessions.forEach(s => {
      console.log(`  ${s.start_time} - ${s.name} (ID: ${s.id})`);
    });

    // Check bookings for these sessions
    const sessionIds = sessions.map(s => s.id);

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, class_session_id, status')
      .in('class_session_id', sessionIds);

    const { data: classBookings } = await supabase
      .from('class_bookings')
      .select('id, class_session_id, booking_status')
      .in('class_session_id', sessionIds);

    console.log(`\nBookings table: ${bookings?.length || 0}`);
    console.log(`Class_bookings table: ${classBookings?.length || 0}`);
  } else {
    console.log('❌ No sessions found in this date range');

    // Check what date range DOES have sessions
    const { data: allSessions } = await supabase
      .from('class_sessions')
      .select('start_time')
      .eq('organization_id', DEMO_ORG_ID)
      .order('start_time', { ascending: true });

    if (allSessions && allSessions.length > 0) {
      const firstDate = allSessions[0].start_time;
      const lastDate = allSessions[allSessions.length - 1].start_time;
      console.log(`\n📅 Demo sessions exist from ${firstDate} to ${lastDate}`);
      console.log(`Total sessions: ${allSessions.length}`);
    }
  }
}
