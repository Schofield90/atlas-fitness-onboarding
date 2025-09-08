#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSamMembership() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('🔍 Checking Sam\'s membership status...\n');
  
  try {
    // 1. Find Sam in leads table (booking system uses this)
    const { data: samInLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('email', 'samschofield90@hotmail.co.uk')
      .eq('organization_id', organizationId);
    
    if (leadsError) {
      console.error('Error finding Sam in leads:', leadsError);
      return;
    }
    
    console.log('Sam in leads table:');
    if (samInLeads && samInLeads.length > 0) {
      samInLeads.forEach(sam => {
        console.log(`  - ID: ${sam.id}`);
        console.log(`    Name: ${sam.name}`);
        console.log(`    Email: ${sam.email}`);
      });
    } else {
      console.log('  ❌ Not found');
    }
    
    // 2. Find Sam in clients table (members page uses this)
    const { data: samInClients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('email', 'samschofield90@hotmail.co.uk')
      .eq('org_id', organizationId);
    
    console.log('\nSam in clients table:');
    if (samInClients && samInClients.length > 0) {
      samInClients.forEach(sam => {
        console.log(`  - ID: ${sam.id}`);
        console.log(`    Name: ${sam.first_name} ${sam.last_name}`);
        console.log(`    Email: ${sam.email}`);
        console.log(`    Membership Status: ${sam.membership_status || 'None'}`);
        console.log(`    Membership Plan ID: ${sam.membership_plan_id || 'None'}`);
      });
    } else {
      console.log('  ❌ Not found');
    }
    
    // 3. Check customer_memberships table
    console.log('\n📋 Checking customer_memberships table...');
    
    // Check by lead ID
    if (samInLeads && samInLeads.length > 0) {
      for (const sam of samInLeads) {
        const { data: memberships, error: memError } = await supabase
          .from('customer_memberships')
          .select('*, membership_plans(*)')
          .eq('customer_id', sam.id);
        
        if (memError) {
          console.error(`Error checking memberships for lead ${sam.id}:`, memError);
        } else {
          console.log(`\nMemberships for lead ${sam.id}:`);
          if (memberships && memberships.length > 0) {
            memberships.forEach(mem => {
              console.log(`  - Membership ID: ${mem.id}`);
              console.log(`    Status: ${mem.status}`);
              console.log(`    Plan: ${mem.membership_plans?.name || mem.membership_plan_id}`);
              console.log(`    Start Date: ${mem.start_date}`);
            });
          } else {
            console.log('  ❌ No memberships found');
          }
        }
      }
    }
    
    // Check by client ID
    if (samInClients && samInClients.length > 0) {
      for (const sam of samInClients) {
        const { data: memberships, error: memError } = await supabase
          .from('customer_memberships')
          .select('*, membership_plans(*)')
          .eq('customer_id', sam.id);
        
        if (memError) {
          console.error(`Error checking memberships for client ${sam.id}:`, memError);
        } else {
          console.log(`\nMemberships for client ${sam.id}:`);
          if (memberships && memberships.length > 0) {
            memberships.forEach(mem => {
              console.log(`  - Membership ID: ${mem.id}`);
              console.log(`    Status: ${mem.status}`);
              console.log(`    Plan: ${mem.membership_plans?.name || mem.membership_plan_id}`);
              console.log(`    Start Date: ${mem.start_date}`);
            });
          } else {
            console.log('  ❌ No memberships found');
          }
        }
      }
    }
    
    // 4. Check if membership plans exist
    console.log('\n📋 Available membership plans:');
    const { data: plans } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (plans && plans.length > 0) {
      plans.forEach(plan => {
        console.log(`  - ${plan.name} (${plan.id})`);
      });
    } else {
      console.log('  ❌ No membership plans found');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkSamMembership().catch(console.error);