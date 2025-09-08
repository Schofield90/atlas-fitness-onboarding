#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function findAndFixSamBookings() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  // 1. Find Sam in the leads table
  console.log('🔍 Finding Sam in the leads table...');
  
  const { data: samRecords, error: samError } = await supabase
    .from('leads')
    .select('*')
    .ilike('name', '%Sam%')
    .eq('organization_id', organizationId);

  if (samError) {
    console.error('Error finding Sam:', samError);
    return;
  }

  if (!samRecords || samRecords.length === 0) {
    console.log('❌ No Sam found in leads table');
    return;
  }

  console.log(`Found ${samRecords.length} Sam record(s):`);
  samRecords.forEach(sam => {
    console.log(`- ${sam.name} (${sam.id}) - ${sam.email}`);
  });

  // Use the first Sam record
  const sam = samRecords[0];
  const customerId = sam.id;
  
  console.log(`\n✅ Using Sam with ID: ${customerId}`);
  
  // 2. Check current bookings
  console.log('\n🔍 Checking current bookings for Sam...');
  
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
    .eq('customer_id', customerId);

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
  } else {
    console.log(`Sam has ${currentBookings?.length || 0} total bookings`);
  }

  // 3. Find future classes
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
    // 4. Create bookings for future classes
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
          console.error(`Error creating booking:`, createError);
        } else {
          console.log(`✅ Created booking for: ${session.name || 'Class'} at ${new Date(session.start_time).toLocaleString()}`);
          
          // Update the session's current_bookings count
          const newCount = (session.current_bookings || 0) + 1;
          const { error: updateError } = await supabase
            .from('class_sessions')
            .update({ current_bookings: newCount })
            .eq('id', session.id);
          
          if (updateError) {
            console.error(`Error updating booking count:`, updateError);
          } else {
            console.log(`   Updated booking count to ${newCount}/${session.max_capacity}`);
          }
        }
      } else {
        console.log(`Booking already exists for ${session.name || 'Class'}`);
      }
    }
  }
  
  // 5. Verify the bookings
  console.log('\n✅ Verifying Sam\'s upcoming bookings...');
  
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
    .gte('class_sessions.start_time', now);

  if (finalError) {
    console.error('Error fetching final bookings:', finalError);
  } else {
    console.log(`\nSam now has ${finalBookings?.length || 0} upcoming bookings:`);
    finalBookings?.forEach(booking => {
      const sessionTime = new Date(booking.class_sessions.start_time);
      console.log(`- ${booking.class_sessions.name || 'Class'} at ${sessionTime.toLocaleString()} (${booking.booking_status})`);
    });
  }
  
  // 6. Check if Sam has a membership
  console.log('\n🔍 Checking Sam\'s membership status...');
  
  const { data: membership, error: membershipError } = await supabase
    .from('customer_memberships')
    .select(`
      id,
      status,
      membership_plans(name)
    `)
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .single();

  if (membershipError || !membership) {
    console.log('❌ Sam does not have an active membership');
    
    // Check if membership plans exist
    const { data: plans } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(1);
    
    if (plans && plans.length > 0) {
      console.log('\n📝 Creating membership for Sam...');
      
      const { data: newMembership, error: createMemError } = await supabase
        .from('customer_memberships')
        .insert({
          customer_id: customerId,
          organization_id: organizationId,
          membership_plan_id: plans[0].id,
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createMemError) {
        console.error('Error creating membership:', createMemError);
      } else {
        console.log(`✅ Created ${plans[0].name} membership for Sam`);
      }
    } else {
      console.log('No membership plans exist for this organization');
    }
  } else {
    console.log(`✅ Sam has active membership: ${membership.membership_plans?.name || 'Unknown Plan'}`);
  }
}

findAndFixSamBookings().catch(console.error);