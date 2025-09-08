#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function forceClearAllData() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('🔥 FORCE CLEARING ALL CUSTOMER DATA');
  console.log('Organization:', organizationId);
  console.log('Starting in 3 seconds... Press Ctrl+C to cancel');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Get all leads first
    console.log('\n📝 Getting all leads for organization...');
    const { data: allLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', organizationId);
    
    const leadIds = allLeads?.map(l => l.id) || [];
    console.log(`Found ${leadIds.length} leads to remove`);

    // Clear in dependency order
    
    // 1. Clear lead_tags first (depends on leads)
    if (leadIds.length > 0) {
      console.log('\n📝 Clearing lead tags...');
      const { error: tagError } = await supabase
        .from('lead_tags')
        .delete()
        .in('lead_id', leadIds);
      
      if (tagError) {
        console.error('Error clearing lead tags:', tagError);
      } else {
        console.log('✅ Lead tags cleared');
      }
    }

    // 2. Clear bookings that reference memberships
    console.log('\n📝 Clearing bookings with membership references...');
    const { error: bookingMemError } = await supabase
      .from('bookings')
      .update({ membership_id: null })
      .eq('organization_id', organizationId);
    
    if (bookingMemError) {
      console.error('Error clearing membership references:', bookingMemError);
    } else {
      console.log('✅ Membership references cleared from bookings');
    }

    // 3. Now clear customer memberships
    console.log('\n📝 Clearing customer memberships...');
    const { data: memberships, error: memError } = await supabase
      .from('customer_memberships')
      .delete()
      .eq('organization_id', organizationId)
      .select();
    
    if (memError) {
      console.error('Error clearing memberships:', memError);
    } else {
      console.log(`✅ Deleted ${memberships?.length || 0} memberships`);
    }

    // 4. Clear class_bookings
    console.log('\n📝 Clearing class bookings...');
    const { data: classBookings, error: cbError } = await supabase
      .from('class_bookings')
      .delete()
      .eq('organization_id', organizationId)
      .select();
    
    if (cbError) {
      console.error('Error clearing class bookings:', cbError);
    } else {
      console.log(`✅ Deleted ${classBookings?.length || 0} class bookings`);
    }

    // 5. Clear old bookings
    console.log('\n📝 Clearing legacy bookings...');
    const { data: oldBookings, error: obError } = await supabase
      .from('bookings')
      .delete()
      .eq('organization_id', organizationId)
      .select();
    
    if (obError) {
      console.error('Error clearing old bookings:', obError);
    } else {
      console.log(`✅ Deleted ${oldBookings?.length || 0} legacy bookings`);
    }

    // 6. Clear customer notes
    console.log('\n📝 Clearing customer notes...');
    const { error: notesError } = await supabase
      .from('customer_notes')
      .delete()
      .eq('organization_id', organizationId);
    
    if (notesError) {
      console.error('Error clearing notes:', notesError);
    } else {
      console.log('✅ Customer notes cleared');
    }

    // 7. Clear customer waivers
    console.log('\n📝 Clearing customer waivers...');
    const { error: waiversError } = await supabase
      .from('customer_waivers')
      .delete()
      .eq('organization_id', organizationId);
    
    if (waiversError) {
      console.error('Error clearing waivers:', waiversError);
    } else {
      console.log('✅ Customer waivers cleared');
    }

    // 8. Finally, clear all leads
    console.log('\n📝 Clearing all leads/customers...');
    const { data: deletedLeads, error: leadsError } = await supabase
      .from('leads')
      .delete()
      .eq('organization_id', organizationId)
      .select();
    
    if (leadsError) {
      console.error('Error clearing leads:', leadsError);
    } else {
      console.log(`✅ Deleted ${deletedLeads?.length || 0} leads/customers`);
    }

    // 9. Reset all class session counts
    console.log('\n📝 Resetting all class session booking counts...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('class_sessions')
      .update({ current_bookings: 0 })
      .eq('organization_id', organizationId)
      .select();
    
    if (sessionsError) {
      console.error('Error resetting counts:', sessionsError);
    } else {
      console.log(`✅ Reset ${sessions?.length || 0} class session counts`);
    }

    console.log('\n🎉 DATABASE FULLY CLEARED!');
    console.log('All customer data has been removed.');
    console.log('You now have a clean slate to add test clients.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the force clear
forceClearAllData().catch(console.error);