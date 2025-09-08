#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixFutureBookings() {
  const customerId = '1df0e47c-1892-4b1e-ad32-956ebdbf0bab';
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('🔍 Checking current bookings for customer...');
  
  // 1. Check current bookings
  const { data: currentBookings, error: bookingsError } = await supabase
    .from('class_bookings')
    .select(`
      id,
      booking_status,
      class_sessions!inner(
        id,
        name,
        start_time
      )
    `)
    .eq('customer_id', customerId)
    .order('class_sessions(start_time)', { ascending: false });

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    return;
  }

  console.log(`Found ${currentBookings?.length || 0} existing bookings`);
  
  // 2. Find future classes
  console.log('\n🔍 Finding future classes...');
  
  const now = new Date().toISOString();
  const { data: futureClasses, error: classesError } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('start_time', now)
    .order('start_time')
    .limit(3);

  if (classesError) {
    console.error('Error fetching future classes:', classesError);
    return;
  }

  console.log(`Found ${futureClasses?.length || 0} available future classes`);
  
  if (futureClasses && futureClasses.length > 0) {
    // 3. Create bookings for future classes
    console.log('\n📝 Creating bookings for future classes...');
    
    for (const session of futureClasses) {
      // Check if booking already exists
      const { data: existingBooking } = await supabase
        .from('class_bookings')
        .select('id')
        .eq('customer_id', customerId)
        .eq('class_session_id', session.id)
        .single();

      if (!existingBooking) {
        const newBooking = {
          organization_id: organizationId,
          class_session_id: session.id,
          customer_id: customerId,
          booking_status: 'confirmed',
          booking_type: 'drop_in',
          payment_status: 'succeeded',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: created, error: createError } = await supabase
          .from('class_bookings')
          .insert(newBooking)
          .select()
          .single();

        if (createError) {
          console.error(`Error creating booking for ${session.name}:`, createError);
        } else {
          console.log(`✅ Created booking for: ${session.name} at ${session.start_time}`);
          
          // Update the session's current_bookings count
          const { error: updateError } = await supabase
            .from('class_sessions')
            .update({ current_bookings: (session.current_bookings || 0) + 1 })
            .eq('id', session.id);
          
          if (updateError) {
            console.error(`Error updating booking count:`, updateError);
          }
        }
      } else {
        console.log(`Booking already exists for ${session.name}`);
      }
    }
  }
  
  // 4. Verify the bookings
  console.log('\n✅ Verifying customer bookings...');
  
  const { data: finalBookings, error: finalError } = await supabase
    .from('class_bookings')
    .select(`
      id,
      booking_status,
      class_sessions!inner(
        name,
        start_time
      )
    `)
    .eq('customer_id', customerId)
    .gte('class_sessions.start_time', now)
    .order('class_sessions(start_time)');

  if (finalError) {
    console.error('Error fetching final bookings:', finalError);
  } else {
    console.log(`\nCustomer now has ${finalBookings?.length || 0} upcoming bookings:`);
    finalBookings?.forEach(booking => {
      console.log(`- ${booking.class_sessions.name} at ${booking.class_sessions.start_time}`);
    });
  }
}

fixFutureBookings().catch(console.error);