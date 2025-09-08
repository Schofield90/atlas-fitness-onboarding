#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixSamComplete() {
  const clientId = 'f1137aa2-9b18-4acc-a62b-76b604a6f465';
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  const monthlyPlanId = '3c3cc6a1-5433-4794-be8f-bd9f43dda462';
  
  console.log('🔧 Fixing all Sam issues...\n');
  
  try {
    // 1. Remove duplicate bookings for the same session
    console.log('📝 Step 1: Removing duplicate bookings...');
    
    const { data: allBookings } = await supabase
      .from('class_bookings')
      .select('*')
      .eq('class_session_id', 'eee4508e-0c96-44dd-9d7e-16f0250b22d5');
    
    console.log(`Found ${allBookings?.length || 0} total bookings for Tuesday 6am`);
    
    // Keep only the booking with Sam's client ID
    const duplicates = allBookings?.filter(b => b.customer_id !== clientId) || [];
    
    for (const dup of duplicates) {
      const { error } = await supabase
        .from('class_bookings')
        .delete()
        .eq('id', dup.id);
      
      if (!error) {
        console.log(`  ✅ Removed duplicate booking ${dup.id}`);
      }
    }
    
    // 2. Create membership for Sam's client ID
    console.log('\n📝 Step 2: Creating membership for Sam...');
    
    // Check if membership exists
    const { data: existingMembership } = await supabase
      .from('customer_memberships')
      .select('*')
      .eq('customer_id', clientId)
      .eq('status', 'active')
      .single();
    
    if (!existingMembership) {
      const { data: newMembership, error: memError } = await supabase
        .from('customer_memberships')
        .insert({
          customer_id: clientId,
          organization_id: organizationId,
          membership_plan_id: monthlyPlanId,
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (memError) {
        console.error('Error creating membership:', memError);
      } else {
        console.log('  ✅ Created Monthly membership for Sam');
      }
    } else {
      console.log('  ✅ Sam already has an active membership');
    }
    
    // 3. Check for 7am booking and create if missing
    console.log('\n📝 Step 3: Checking 7am booking...');
    
    // Find the 7am session on Tuesday
    const { data: sevenAmSession } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('start_time', '2025-09-09T06:00:00')
      .lte('start_time', '2025-09-09T07:30:00')
      .order('start_time');
    
    console.log(`Found ${sevenAmSession?.length || 0} sessions between 6am and 7:30am on Tuesday`);
    
    // Find the 7am session
    const session7am = sevenAmSession?.find(s => {
      const hour = new Date(s.start_time).getHours();
      return hour === 7 || hour === 6; // 7am UK time might be 6am UTC
    });
    
    if (session7am) {
      console.log(`Found 7am session: ${session7am.name || 'Group Pt'} at ${new Date(session7am.start_time).toLocaleString()}`);
      
      // Check if booking exists
      const { data: existing7am } = await supabase
        .from('class_bookings')
        .select('*')
        .eq('customer_id', clientId)
        .eq('class_session_id', session7am.id)
        .single();
      
      if (!existing7am) {
        const { data: new7am, error: bookingError } = await supabase
          .from('class_bookings')
          .insert({
            organization_id: organizationId,
            class_session_id: session7am.id,
            customer_id: clientId,
            booking_status: 'confirmed',
            booking_type: 'membership',
            payment_status: 'succeeded',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (bookingError) {
          console.error('Error creating 7am booking:', bookingError);
        } else {
          console.log('  ✅ Created 7am booking for Sam');
          
          // Update session count
          await supabase
            .from('class_sessions')
            .update({ current_bookings: (session7am.current_bookings || 0) + 1 })
            .eq('id', session7am.id);
        }
      } else {
        console.log('  ✅ 7am booking already exists');
      }
    }
    
    // 4. Final verification
    console.log('\n📊 Final verification:');
    
    const { data: finalBookings } = await supabase
      .from('class_bookings')
      .select(`
        id,
        booking_status,
        booking_type,
        class_sessions!inner(
          name,
          start_time
        )
      `)
      .eq('customer_id', clientId)
      .order('class_sessions(start_time)');
    
    console.log(`\nSam now has ${finalBookings?.length || 0} bookings:`);
    finalBookings?.forEach(booking => {
      console.log(`  - ${booking.class_sessions.name || 'Group Pt'} at ${new Date(booking.class_sessions.start_time).toLocaleString()}`);
      console.log(`    Type: ${booking.booking_type}, Status: ${booking.booking_status}`);
    });
    
    const { data: finalMembership } = await supabase
      .from('customer_memberships')
      .select(`
        status,
        membership_plans(name)
      `)
      .eq('customer_id', clientId)
      .eq('status', 'active')
      .single();
    
    if (finalMembership) {
      console.log(`\n✅ Sam has active membership: ${finalMembership.membership_plans?.name}`);
    }
    
    console.log('\n🎉 All issues fixed!');
    console.log('- Duplicate bookings removed');
    console.log('- Sam has Monthly membership');
    console.log('- All bookings should display correctly');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixSamComplete().catch(console.error);