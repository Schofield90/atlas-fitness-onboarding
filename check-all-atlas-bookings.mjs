#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ATLAS_ORG_ID = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';

console.log('Checking ALL bookings for Atlas Fitness...\n');

// Check ALL bookings ever
const { data: allBookings } = await supabase
  .from('bookings')
  .select('id, class_session_id, status, created_at')
  .eq('organization_id', ATLAS_ORG_ID)
  .order('created_at', { ascending: false })
  .limit(10);

console.log(`Total bookings in 'bookings' table: ${allBookings?.length || 0}`);
if (allBookings && allBookings.length > 0) {
  console.log('\nMost recent bookings:');
  allBookings.slice(0, 5).forEach(b => {
    console.log(`  ${b.created_at} - Status: ${b.status}`);
  });
}

// Check class_bookings
const { data: allClassBookings } = await supabase
  .from('class_bookings')
  .select('id, class_session_id, booking_status, created_at')
  .eq('organization_id', ATLAS_ORG_ID)
  .order('created_at', { ascending: false })
  .limit(10);

console.log(`\nTotal bookings in 'class_bookings' table: ${allClassBookings?.length || 0}`);
if (allClassBookings && allClassBookings.length > 0) {
  console.log('\nMost recent class bookings:');
  allClassBookings.slice(0, 5).forEach(b => {
    console.log(`  ${b.created_at} - Status: ${b.booking_status}`);
  });
}

// Check if there are ANY class sessions at all
const { data: allSessions, count } = await supabase
  .from('class_sessions')
  .select('id, start_time, name', { count: 'exact' })
  .eq('organization_id', ATLAS_ORG_ID)
  .order('start_time', { ascending: false })
  .limit(5);

console.log(`\n📅 Total class sessions: ${count}`);
if (allSessions && allSessions.length > 0) {
  console.log('\nMost recent sessions:');
  allSessions.forEach(s => {
    console.log(`  ${s.start_time} - ${s.name}`);
  });
}
