#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkDates() {
  // Find Sam
  const { data: sams } = await supabase
    .from('leads')
    .select('*')
    .ilike('name', '%Sam Schofield%');
  
  const sam = sams?.[0];

  if (!sam) {
    console.log('Sam not found');
    return;
  }

  console.log('Found Sam:', sam.id);
  
  // Check his bookings with dates
  const { data: bookings, error } = await supabase
    .from('class_bookings')
    .select(`
      id,
      booking_status,
      created_at,
      class_sessions!inner(
        id,
        name,
        start_time
      )
    `)
    .eq('customer_id', sam.id)
    .order('class_sessions(start_time)');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📅 Sam\'s bookings with dates:');
  console.log('Current time:', new Date().toISOString());
  console.log('');
  
  bookings?.forEach(booking => {
    const startTime = new Date(booking.class_sessions.start_time);
    const now = new Date();
    const isUpcoming = startTime > now;
    
    console.log(`Booking ${booking.id}:`);
    console.log(`  Class: ${booking.class_sessions.name || 'Unknown'}`);
    console.log(`  Start time (ISO): ${booking.class_sessions.start_time}`);
    console.log(`  Start time (local): ${startTime.toLocaleString()}`);
    console.log(`  Status: ${booking.booking_status}`);
    console.log(`  Is upcoming? ${isUpcoming} (${isUpcoming ? 'FUTURE' : 'PAST'})`);
    console.log('');
  });

  // Check what future sessions exist
  console.log('\n🔮 Available future sessions:');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const { data: futureSessions } = await supabase
    .from('class_sessions')
    .select('id, name, start_time, current_bookings, max_capacity')
    .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
    .gte('start_time', tomorrow.toISOString())
    .order('start_time')
    .limit(5);

  futureSessions?.forEach(session => {
    console.log(`- ${session.name || 'Class'} at ${new Date(session.start_time).toLocaleString()} (${session.current_bookings}/${session.max_capacity})`);
  });
}

checkDates().catch(console.error);