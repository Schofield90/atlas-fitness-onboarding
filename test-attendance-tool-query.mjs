#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DEMO_ORG_ID = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';

// Simulate what the tool does
const startDate = '2025-10-04';
const endDate = '2025-10-10';

console.log('Simulating attendance tool query...\n');
console.log(`Organization: ${DEMO_ORG_ID}`);
console.log(`Date range: ${startDate} to ${endDate}\n`);

// Step 1: Get sessions (like the tool does)
const { data: sessions, error: sessionsError } = await supabase
  .from('class_sessions')
  .select('id, start_time, max_capacity, programs(name, program_type)')
  .eq('organization_id', DEMO_ORG_ID)
  .gte('start_time', startDate)
  .lte('start_time', endDate);

console.log(`Step 1: Found ${sessions?.length || 0} sessions`);

if (sessions && sessions.length > 0) {
  const sessionIds = sessions.map(s => s.id);
  console.log(`Session IDs: ${sessionIds.slice(0, 3).join(', ')}...`);

  // Step 2: Get bookings (like the fixed tool does)
  const [bookingsResult, classBookingsResult] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, class_session_id, status, attended_at')
      .in('class_session_id', sessionIds),
    supabase
      .from('class_bookings')
      .select('id, class_session_id, booking_status, attended_at')
      .in('class_session_id', sessionIds)
  ]);

  console.log(`\nStep 2: Bookings found:`);
  console.log(`  bookings table: ${bookingsResult.data?.length || 0}`);
  console.log(`  class_bookings table: ${classBookingsResult.data?.length || 0}`);

  if (classBookingsResult.data && classBookingsResult.data.length > 0) {
    console.log(`\n✅ SUCCESS - Found bookings in class_bookings table!`);
    console.log(`Sample booking:`);
    const sample = classBookingsResult.data[0];
    console.log(`  Session ID: ${sample.class_session_id}`);
    console.log(`  Status: ${sample.booking_status}`);
    console.log(`  Attended: ${sample.attended_at ? 'Yes' : 'No'}`);
  }
}
