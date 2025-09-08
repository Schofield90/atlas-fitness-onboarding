#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function clearAllCustomerData() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('⚠️  WARNING: This will clear all customer data for organization:', organizationId);
  console.log('Starting in 3 seconds... Press Ctrl+C to cancel');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // 1. First, clear class bookings
    console.log('\n📝 Step 1: Clearing class bookings...');
    const { data: bookings, error: bookingsError } = await supabase
      .from('class_bookings')
      .delete()
      .eq('organization_id', organizationId)
      .select();
    
    if (bookingsError) {
      console.error('Error clearing class bookings:', bookingsError);
    } else {
      console.log(`✅ Deleted ${bookings?.length || 0} class bookings`);
    }

    // 2. Clear customer memberships
    console.log('\n📝 Step 2: Clearing customer memberships...');
    const { data: memberships, error: membershipsError } = await supabase
      .from('customer_memberships')
      .delete()
      .eq('organization_id', organizationId)
      .select();
    
    if (membershipsError) {
      console.error('Error clearing customer memberships:', membershipsError);
    } else {
      console.log(`✅ Deleted ${memberships?.length || 0} customer memberships`);
    }

    // 3. Clear customer notes
    console.log('\n📝 Step 3: Clearing customer notes...');
    const { data: notes, error: notesError } = await supabase
      .from('customer_notes')
      .delete()
      .eq('organization_id', organizationId)
      .select();
    
    if (notesError) {
      console.error('Error clearing customer notes:', notesError);
    } else {
      console.log(`✅ Deleted ${notes?.length || 0} customer notes`);
    }

    // 4. Clear customer waivers
    console.log('\n📝 Step 4: Clearing customer waivers...');
    const { data: waivers, error: waiversError } = await supabase
      .from('customer_waivers')
      .delete()
      .eq('organization_id', organizationId)
      .select();
    
    if (waiversError) {
      console.error('Error clearing customer waivers:', waiversError);
    } else {
      console.log(`✅ Deleted ${waivers?.length || 0} customer waivers`);
    }

    // 5. Clear lead tags
    console.log('\n📝 Step 5: Clearing lead tags...');
    // First get all leads for this org
    const { data: leadsForTags } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', organizationId);
    
    if (leadsForTags && leadsForTags.length > 0) {
      const leadIds = leadsForTags.map(l => l.id);
      const { data: leadTags, error: leadTagsError } = await supabase
        .from('lead_tags')
        .delete()
        .in('lead_id', leadIds)
        .select();
      
      if (leadTagsError) {
        console.error('Error clearing lead tags:', leadTagsError);
      } else {
        console.log(`✅ Deleted ${leadTags?.length || 0} lead tags`);
      }
    }

    // 6. Clear all leads/customers
    console.log('\n📝 Step 6: Clearing all leads/customers...');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .delete()
      .eq('organization_id', organizationId)
      .select();
    
    if (leadsError) {
      console.error('Error clearing leads:', leadsError);
    } else {
      console.log(`✅ Deleted ${leads?.length || 0} leads/customers`);
    }

    // 7. Reset booking counts for all class sessions
    console.log('\n📝 Step 7: Resetting class session booking counts...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('class_sessions')
      .update({ current_bookings: 0 })
      .eq('organization_id', organizationId)
      .select();
    
    if (sessionsError) {
      console.error('Error resetting booking counts:', sessionsError);
    } else {
      console.log(`✅ Reset booking counts for ${sessions?.length || 0} class sessions`);
    }

    // 8. Clear any old bookings table entries (legacy)
    console.log('\n📝 Step 8: Clearing legacy bookings table...');
    const { data: oldBookings, error: oldBookingsError } = await supabase
      .from('bookings')
      .delete()
      .eq('organization_id', organizationId)
      .select();
    
    if (oldBookingsError) {
      console.error('Error clearing old bookings:', oldBookingsError);
    } else {
      console.log(`✅ Deleted ${oldBookings?.length || 0} legacy bookings`);
    }

    console.log('\n✅ Database cleanup complete!');
    console.log('All customer data has been cleared for organization:', organizationId);
    console.log('\nYou can now add test clients again with a clean slate.');
    
  } catch (error) {
    console.error('Unexpected error during cleanup:', error);
  }
}

// Run the cleanup
clearAllCustomerData().catch(console.error);