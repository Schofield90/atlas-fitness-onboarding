#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createSamMembership() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('📝 Creating membership for Sam Schofield...\n');
  
  try {
    // 1. Find Sam in the leads table
    const { data: sam, error: samError } = await supabase
      .from('leads')
      .select('*')
      .eq('email', 'samschofield90@hotmail.co.uk')
      .eq('organization_id', organizationId)
      .single();
    
    if (samError || !sam) {
      console.error('Sam not found in leads table:', samError);
      return;
    }
    
    console.log(`Found Sam: ${sam.name} (${sam.id})`);
    
    // 2. Check if membership plans exist
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (plansError || !plans || plans.length === 0) {
      console.log('\n❌ No membership plans found. Creating a default plan...');
      
      // Create a default membership plan
      const { data: newPlan, error: createPlanError } = await supabase
        .from('membership_plans')
        .insert({
          organization_id: organizationId,
          name: 'Unlimited Monthly',
          description: 'Unlimited access to all classes',
          price: 9900, // £99.00 in pennies
          billing_period: 'monthly',
          features: ['Unlimited Classes', 'All Locations', 'Guest Passes'],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createPlanError) {
        console.error('Error creating membership plan:', createPlanError);
        return;
      }
      
      console.log(`✅ Created membership plan: ${newPlan.name}`);
      plans = [newPlan];
    } else {
      console.log(`\nFound ${plans.length} membership plan(s):`);
      plans.forEach(plan => {
        console.log(`  - ${plan.name} (${plan.id})`);
      });
    }
    
    // Use the first active plan or just the first plan
    const plan = plans.find(p => p.is_active) || plans[0];
    console.log(`\nUsing plan: ${plan.name}`);
    
    // 3. Check if Sam already has a membership
    const { data: existingMembership } = await supabase
      .from('customer_memberships')
      .select('*')
      .eq('customer_id', sam.id)
      .eq('status', 'active')
      .single();
    
    if (existingMembership) {
      console.log('\n✅ Sam already has an active membership');
      return;
    }
    
    // 4. Create membership for Sam
    const membershipData = {
      customer_id: sam.id,
      organization_id: organizationId,
      membership_plan_id: plan.id,
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
    
    console.log('\n✅ Membership created successfully!');
    console.log(`   Customer: ${sam.name}`);
    console.log(`   Plan: ${plan.name}`);
    console.log(`   Status: Active`);
    console.log(`   Start Date: ${membershipData.start_date}`);
    
    // 5. Also update Sam's record in clients table if it exists
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        membership_status: 'active',
        membership_plan_id: plan.id
      })
      .eq('email', sam.email)
      .eq('org_id', organizationId);
    
    if (updateError) {
      console.log('\nNote: Could not update clients table:', updateError.message);
    } else {
      console.log('\n✅ Also updated membership status in clients table');
    }
    
    console.log('\n🎉 Sam now has an active membership and can be booked into classes!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createSamMembership().catch(console.error);