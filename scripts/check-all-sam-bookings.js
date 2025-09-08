#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAllSamBookings() {
  const clientId = 'f1137aa2-9b18-4acc-a62b-76b604a6f465';
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('🔍 Checking all of Sam\'s bookings...\n');
  
  try {
    // 1. Get all bookings for Sam
    const { data: bookings, error } = await supabase
      .from('class_bookings')
      .select(`
        id,
        customer_id,
        organization_id,
        booking_status,
        booking_type,
        created_at,
        class_sessions!inner(
          id,
          name,
          start_time,
          end_time
        )
      `)
      .eq('customer_id', clientId)
      .order('class_sessions(start_time)');
    
    if (error) {
      console.error('Error fetching bookings:', error);
      return;
    }
    
    console.log(`Found ${bookings?.length || 0} total bookings for Sam:\n`);
    
    const now = new Date();
    bookings?.forEach(booking => {
      const startTime = new Date(booking.class_sessions.start_time);
      const isUpcoming = startTime > now;
      
      console.log(`Booking ID: ${booking.id}`);
      console.log(`  Session: ${booking.class_sessions.name || 'Group Pt'}`);
      console.log(`  Time: ${startTime.toLocaleString()}`);
      console.log(`  Status: ${booking.booking_status}`);
      console.log(`  Type: ${booking.booking_type}`);
      console.log(`  Organization: ${booking.organization_id === organizationId ? '✅ Correct' : '❌ Wrong'}`);
      console.log(`  Is Upcoming: ${isUpcoming ? '✅ Yes' : '❌ No'}`);
      console.log('');
    });
    
    // 2. Check Sam's membership
    console.log('📋 Checking Sam\'s membership:');
    const { data: membership } = await supabase
      .from('customer_memberships')
      .select(`
        id,
        status,
        membership_plans(
          id,
          name
        )
      `)
      .eq('customer_id', clientId)
      .eq('status', 'active')
      .single();
    
    if (membership) {
      console.log(`✅ Active membership: ${membership.membership_plans?.name || 'Unknown'}`);
      console.log(`   Membership ID: ${membership.id}`);
      console.log(`   Plan ID: ${membership.membership_plans?.id}`);
    } else {
      console.log('❌ No active membership found');
    }
    
    // 3. Check how the attendees API would see it
    console.log('\n📊 How attendees API sees the bookings:');
    
    // This mimics what the attendees API does
    const { data: attendees } = await supabase
      .from('class_bookings')
      .select(`
        id,
        customer_id,
        booking_status,
        booking_type,
        payment_status,
        leads!inner(
          id,
          name,
          email
        )
      `)
      .eq('class_session_id', 'eee4508e-0c96-44dd-9d7e-16f0250b22d5') // Tuesday 6am
      .in('booking_status', ['confirmed', 'attended']);
    
    console.log(`Tuesday 6am class has ${attendees?.length || 0} attendees`);
    attendees?.forEach(att => {
      console.log(`  - ${att.leads?.name} (${att.booking_type})`);
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkAllSamBookings().catch(console.error);