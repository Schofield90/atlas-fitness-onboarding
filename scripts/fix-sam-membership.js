#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixSamMembership() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  const samLeadId = '2b4bc52b-9144-4027-832a-4ae5b300a941'; // The ID used by booking system
  const monthlyPlanId = '3c3cc6a1-5433-4794-be8f-bd9f43dda462'; // Monthly plan
  
  console.log('🔧 Creating membership for Sam in the leads system...\n');
  
  try {
    // Check if membership already exists
    const { data: existing } = await supabase
      .from('customer_memberships')
      .select('*')
      .eq('customer_id', samLeadId)
      .eq('status', 'active')
      .single();
    
    if (existing) {
      console.log('✅ Sam already has an active membership');
      return;
    }
    
    // Create membership
    const membershipData = {
      customer_id: samLeadId,
      organization_id: organizationId,
      membership_plan_id: monthlyPlanId,
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: newMembership, error: memError } = await supabase
      .from('customer_memberships')
      .insert(membershipData)
      .select()
      .single();
    
    if (memError) {
      console.error('Error creating membership:', memError);
      return;
    }
    
    console.log('✅ Membership created successfully!');
    console.log(`   Customer ID (lead): ${samLeadId}`);
    console.log(`   Plan: Monthly`);
    console.log(`   Status: Active`);
    console.log(`   Start Date: ${membershipData.start_date}`);
    
    // Also update the client record to show active membership
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        membership_status: 'active',
        membership_plan_id: monthlyPlanId
      })
      .eq('email', 'samschofield90@hotmail.co.uk')
      .eq('org_id', organizationId);
    
    if (updateError) {
      console.log('\nNote: Could not update clients table:', updateError.message);
    } else {
      console.log('\n✅ Also updated membership status in clients table');
    }
    
    console.log('\n🎉 Sam now has an active membership!');
    console.log('He should now appear with "Monthly" membership when booking.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixSamMembership().catch(console.error);