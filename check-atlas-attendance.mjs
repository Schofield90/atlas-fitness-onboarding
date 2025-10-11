#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ATLAS_ORG_ID = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';

// Last week: Oct 9-15, 2025
const lastWeekStart = '2025-10-09';
const lastWeekEnd = '2025-10-15';

console.log('Checking Atlas Fitness attendance data...\n');
console.log(`Organization: Atlas Fitness (${ATLAS_ORG_ID})`);
console.log(`Date range: ${lastWeekStart} to ${lastWeekEnd}\n`);

// Check class sessions
const { data: sessions, error: sessionsError } = await supabase
  .from('class_sessions')
  .select('id, start_time, name, max_capacity, session_status')
  .eq('organization_id', ATLAS_ORG_ID)
  .gte('start_time', lastWeekStart)
  .lte('start_time', lastWeekEnd);

if (sessionsError) {
  console.error('Error fetching sessions:', sessionsError);
} else {
  console.log(`✅ Class Sessions: ${sessions.length}`);
  if (sessions.length > 0) {
    console.log('\nSample sessions:');
    sessions.slice(0, 5).forEach(s => {
      console.log(`  ${s.start_time} - ${s.name} (capacity: ${s.max_capacity}, status: ${s.session_status})`);
    });
  }
}

// Check bookings
const { data: bookings, error: bookingsError } = await supabase
  .from('bookings')
  .select('id, class_session_id, status, client_id')
  .eq('organization_id', ATLAS_ORG_ID)
  .in('class_session_id', sessions?.map(s => s.id) || []);

if (bookingsError) {
  console.error('Error fetching bookings:', bookingsError);
} else {
  console.log(`\n✅ Bookings: ${bookings?.length || 0}`);
  if (bookings && bookings.length > 0) {
    const statuses = {};
    bookings.forEach(b => {
      statuses[b.status] = (statuses[b.status] || 0) + 1;
    });
    console.log('Booking statuses:', statuses);
  }
}

// Check class_bookings table too
const { data: classBookings, error: classBookingsError } = await supabase
  .from('class_bookings')
  .select('id, class_session_id, booking_status, client_id, customer_id')
  .eq('organization_id', ATLAS_ORG_ID)
  .in('class_session_id', sessions?.map(s => s.id) || []);

if (classBookingsError) {
  console.error('Error fetching class_bookings:', classBookingsError);
} else {
  console.log(`\n✅ Class Bookings: ${classBookings?.length || 0}`);
  if (classBookings && classBookings.length > 0) {
    const statuses = {};
    classBookings.forEach(b => {
      statuses[b.booking_status] = (statuses[b.booking_status] || 0) + 1;
    });
    console.log('Class booking statuses:', statuses);
  }
}

// Check what organization_id the tool context would use
const { data: agent } = await supabase
  .from('ai_agents')
  .select('id, name, organization_id')
  .eq('id', '3aae1783-68d7-420a-922b-b7fc195896c6')
  .single();

console.log('\n📊 Agent Configuration:');
console.log(`Agent: ${agent.name} (${agent.id})`);
console.log(`Org ID: ${agent.organization_id}`);
console.log(`Matches Atlas Fitness: ${agent.organization_id === ATLAS_ORG_ID}`);
