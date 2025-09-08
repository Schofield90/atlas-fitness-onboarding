#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function linkBookingToClientId() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  const leadId = '2b4bc52b-9144-4027-832a-4ae5b300a941'; // Sam's lead ID
  const clientId = 'f1137aa2-9b18-4acc-a62b-76b604a6f465'; // Sam's client ID
  
  console.log('🔧 Updating Sam\'s booking to use client ID...\n');
  
  try {
    // 1. Find the booking with lead ID
    const { data: bookings, error: fetchError } = await supabase
      .from('class_bookings')
      .select('*')
      .eq('customer_id', leadId);
    
    if (fetchError) {
      console.error('Error fetching bookings:', fetchError);
      return;
    }
    
    console.log(`Found ${bookings?.length || 0} bookings with lead ID`);
    
    if (bookings && bookings.length > 0) {
      // 2. Update the bookings to use client ID
      for (const booking of bookings) {
        const { error: updateError } = await supabase
          .from('class_bookings')
          .update({ customer_id: clientId })
          .eq('id', booking.id);
        
        if (updateError) {
          console.error(`Error updating booking ${booking.id}:`, updateError);
        } else {
          console.log(`✅ Updated booking ${booking.id} to use client ID`);
        }
      }
    }
    
    // 3. Verify the update
    const { data: updatedBookings } = await supabase
      .from('class_bookings')
      .select(`
        id,
        customer_id,
        booking_status,
        class_sessions!inner(
          name,
          start_time
        )
      `)
      .eq('customer_id', clientId);
    
    console.log(`\n✅ Sam now has ${updatedBookings?.length || 0} bookings with client ID:`);
    updatedBookings?.forEach(booking => {
      console.log(`  - ${booking.class_sessions.name || 'Group Pt'} at ${new Date(booking.class_sessions.start_time).toLocaleString()}`);
    });
    
    console.log('\n🎉 Bookings successfully linked to client ID!');
    console.log('The upcoming sessions should now appear in Sam\'s profile.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

linkBookingToClientId().catch(console.error);