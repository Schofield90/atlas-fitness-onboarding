#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAttendance() {
  const names = [
    { first: 'Elijah', last: 'Moore' },
    { first: 'Victoria', last: 'Nguyen' },
    { first: 'Noah', last: 'Scott' },
    { first: 'Matthew', last: 'Sanchez' },
    { first: 'Mia', last: 'Rodriguez' }
  ];

  console.log('Checking attendance for 5 clients...\n');

  for (const name of names) {
    // Find client
    const { data: client } = await supabase
      .from('clients')
      .select('id, first_name, last_name, org_id')
      .eq('first_name', name.first)
      .eq('last_name', name.last)
      .single();

    if (!client) {
      console.log(`❌ ${name.first} ${name.last}: NOT FOUND IN DATABASE`);
      continue;
    }

    // Check bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        created_at,
        class_sessions(id, start_time, name)
      `)
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.log(`❌ ${name.first} ${name.last}: Query Error - ${error.message}`);
      continue;
    }

    const attended = bookings ? bookings.filter(b => b.status === 'attended') : [];
    const lastAttendance = attended.length > 0 ? attended[0] : null;

    console.log(`✅ ${name.first} ${name.last}:`);
    console.log(`   Client ID: ${client.id}`);
    console.log(`   Org ID: ${client.org_id}`);
    console.log(`   Total Bookings: ${bookings ? bookings.length : 0}`);
    console.log(`   Attended: ${attended.length}`);
    if (lastAttendance) {
      const startTime = lastAttendance.class_sessions ? lastAttendance.class_sessions.start_time : 'N/A';
      const className = lastAttendance.class_sessions ? lastAttendance.class_sessions.name : 'N/A';
      console.log(`   Last Attended: ${startTime}`);
      console.log(`   Class Name: ${className}`);
    } else {
      console.log(`   Last Attended: NO ATTENDANCE RECORDS`);
    }
    console.log('');
  }
}

checkAttendance().catch(console.error);
