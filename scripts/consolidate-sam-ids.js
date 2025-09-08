#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function consolidateSamIds() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  const clientId = 'f1137aa2-9b18-4acc-a62b-76b604a6f465'; // Sam's client ID (from clients table)
  
  console.log('🔧 Consolidating Sam\'s IDs across tables...\n');
  
  try {
    // 1. Get Sam's data from clients table
    const { data: samClient, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    
    if (clientError || !samClient) {
      console.error('Sam not found in clients table');
      return;
    }
    
    console.log(`Found Sam in clients table: ${samClient.first_name} ${samClient.last_name}`);
    
    // 2. Check if this ID exists in leads
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', clientId)
      .single();
    
    if (existingLead) {
      console.log('✅ Sam already exists in leads table with client ID');
    } else {
      // 3. Create Sam in leads table with the client ID
      console.log('\n📝 Creating Sam in leads table with client ID...');
      
      const leadData = {
        id: clientId, // Use the same ID as in clients table
        organization_id: organizationId,
        name: `${samClient.first_name} ${samClient.last_name}`.trim(),
        email: samClient.email,
        phone: samClient.phone,
        status: 'member',
        created_at: samClient.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating lead:', createError);
        return;
      }
      
      console.log(`✅ Created Sam in leads table with ID: ${newLead.id}`);
    }
    
    // 4. Now create the booking for Tuesday's class
    console.log('\n📝 Creating booking for Tuesday\'s class...');
    
    const tuesdaySessionId = 'eee4508e-0c96-44dd-9d7e-16f0250b22d5';
    
    // Check if booking already exists
    const { data: existingBooking } = await supabase
      .from('class_bookings')
      .select('*')
      .eq('customer_id', clientId)
      .eq('class_session_id', tuesdaySessionId)
      .single();
    
    if (existingBooking) {
      console.log('✅ Booking already exists for Tuesday');
    } else {
      const bookingData = {
        organization_id: organizationId,
        class_session_id: tuesdaySessionId,
        customer_id: clientId,
        booking_status: 'confirmed',
        booking_type: 'membership',
        payment_status: 'succeeded',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: newBooking, error: bookingError } = await supabase
        .from('class_bookings')
        .insert(bookingData)
        .select()
        .single();
      
      if (bookingError) {
        console.error('Error creating booking:', bookingError);
      } else {
        console.log(`✅ Created booking for Tuesday's class`);
        
        // Update the session's booking count
        const { error: countError } = await supabase
          .from('class_sessions')
          .update({ current_bookings: 1 })
          .eq('id', tuesdaySessionId);
        
        if (!countError) {
          console.log('✅ Updated session booking count');
        }
      }
    }
    
    // 5. Verify the setup
    console.log('\n📊 Final verification:');
    
    const { data: finalBookings } = await supabase
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
    
    console.log(`Sam (${clientId}) has ${finalBookings?.length || 0} bookings:`);
    finalBookings?.forEach(booking => {
      console.log(`  - ${booking.class_sessions.name || 'Group Pt'} at ${new Date(booking.class_sessions.start_time).toLocaleString()}`);
    });
    
    console.log('\n🎉 Sam\'s IDs are now consolidated!');
    console.log('The upcoming sessions should now appear in his profile.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

consolidateSamIds().catch(console.error);