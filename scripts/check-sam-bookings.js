#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSamBookings() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('🔍 Checking Sam\'s bookings...\n');
  
  try {
    // 1. Find Sam in the leads table
    const { data: sam } = await supabase
      .from('leads')
      .select('*')
      .eq('email', 'samschofield90@hotmail.co.uk')
      .eq('organization_id', organizationId)
      .single();
    
    if (!sam) {
      console.log('❌ Sam not found in leads table');
      return;
    }
    
    console.log(`Found Sam: ${sam.name} (ID: ${sam.id})\n`);
    
    // 2. Check bookings using Sam's lead ID
    console.log('📅 Checking bookings with lead ID...');
    const { data: bookingsWithLeadId, error: error1 } = await supabase
      .from('class_bookings')
      .select(`
        id,
        booking_status,
        created_at,
        class_sessions!inner(
          id,
          name,
          start_time,
          organization_id
        )
      `)
      .eq('customer_id', sam.id);
    
    if (error1) {
      console.error('Error fetching bookings:', error1);
    } else {
      console.log(`Found ${bookingsWithLeadId?.length || 0} bookings for Sam's lead ID`);
      bookingsWithLeadId?.forEach(booking => {
        const startTime = new Date(booking.class_sessions.start_time);
        const isUpcoming = startTime > new Date();
        console.log(`  - ${booking.class_sessions.name || 'Group Pt'} at ${startTime.toLocaleString()}`);
        console.log(`    Status: ${booking.booking_status}, Upcoming: ${isUpcoming}`);
      });
    }
    
    // 3. Check if Sam exists in clients table
    console.log('\n📋 Checking clients table...');
    const { data: samInClients } = await supabase
      .from('clients')
      .select('*')
      .eq('email', 'samschofield90@hotmail.co.uk')
      .eq('org_id', organizationId);
    
    if (samInClients && samInClients.length > 0) {
      console.log(`Found Sam in clients table with ID: ${samInClients[0].id}`);
      
      // Check bookings with client ID
      const { data: bookingsWithClientId } = await supabase
        .from('class_bookings')
        .select(`
          id,
          booking_status,
          class_sessions!inner(
            name,
            start_time
          )
        `)
        .eq('customer_id', samInClients[0].id);
      
      console.log(`Found ${bookingsWithClientId?.length || 0} bookings for Sam's client ID`);
    }
    
    // 4. Check what the customer page would be looking for
    console.log('\n🔍 Simulating customer page query...');
    console.log(`Customer page URL would be: /customers/${sam.id}`);
    
    // This is similar to what ClassBookingsTab does
    const { data: customerPageBookings, error: pageError } = await supabase
      .from('class_bookings')
      .select(`
        *,
        class_sessions!inner(
          *,
          programs(name, description)
        )
      `)
      .eq('customer_id', sam.id)
      .eq('organization_id', organizationId);
    
    if (pageError) {
      console.error('Error in customer page query:', pageError);
    } else {
      console.log(`Customer page would see ${customerPageBookings?.length || 0} bookings`);
      
      const now = new Date();
      const upcomingBookings = customerPageBookings?.filter(booking => {
        if (!booking.class_sessions?.start_time) return false;
        const sessionTime = new Date(booking.class_sessions.start_time);
        const status = booking.booking_status;
        return sessionTime > now && (status === 'confirmed' || status === 'attended');
      });
      
      console.log(`Of which ${upcomingBookings?.length || 0} are upcoming`);
      upcomingBookings?.forEach(booking => {
        console.log(`  - ${booking.class_sessions.name || 'Group Pt'} at ${new Date(booking.class_sessions.start_time).toLocaleString()}`);
      });
    }
    
    // 5. Check the actual Tuesday booking
    console.log('\n📅 Checking Tuesday\'s specific booking...');
    const { data: tuesdayBooking } = await supabase
      .from('class_bookings')
      .select(`
        *,
        class_sessions!inner(*)
      `)
      .eq('customer_id', sam.id)
      .gte('class_sessions.start_time', '2025-09-09T00:00:00')
      .lte('class_sessions.start_time', '2025-09-09T23:59:59')
      .single();
    
    if (tuesdayBooking) {
      console.log('✅ Tuesday booking exists:');
      console.log(`  ID: ${tuesdayBooking.id}`);
      console.log(`  Customer ID: ${tuesdayBooking.customer_id}`);
      console.log(`  Session ID: ${tuesdayBooking.class_session_id}`);
      console.log(`  Status: ${tuesdayBooking.booking_status}`);
      console.log(`  Organization ID: ${tuesdayBooking.organization_id}`);
    } else {
      console.log('❌ No Tuesday booking found');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkSamBookings().catch(console.error);