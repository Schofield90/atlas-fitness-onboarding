#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DEMO_ORG_ID = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';

// Check for class sessions in last week
const lastWeekStart = '2025-10-04';
const lastWeekEnd = '2025-10-10';

const { data: sessions, error } = await supabase
  .from('class_sessions')
  .select('id, start_time, name, max_capacity')
  .eq('organization_id', DEMO_ORG_ID)
  .gte('start_time', lastWeekStart)
  .lte('start_time', lastWeekEnd);

if (error) {
  console.error('Error:', error);
} else {
  console.log(`Found ${sessions.length} sessions for Oct 4-10, 2025\n`);
  
  if (sessions.length > 0) {
    console.log('Sample sessions:');
    sessions.slice(0, 5).forEach(s => {
      console.log(`  ${s.start_time} - ${s.name} (capacity: ${s.max_capacity})`);
    });
    
    // Check bookings for these sessions
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, class_session_id, status')
      .in('class_session_id', sessions.map(s => s.id));
    
    console.log(`\nBookings: ${bookings?.length || 0}`);
    
    if (bookings && bookings.length > 0) {
      const statuses = {};
      bookings.forEach(b => {
        statuses[b.status] = (statuses[b.status] || 0) + 1;
      });
      console.log('Booking statuses:', statuses);
    }
  }
}
