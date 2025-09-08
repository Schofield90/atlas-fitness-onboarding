#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function syncClientsToLeads() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('🔄 Syncing clients to leads table...\n');
  
  try {
    // 1. Get all clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('org_id', organizationId);
    
    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return;
    }
    
    console.log(`Found ${clients?.length || 0} clients to sync`);
    
    if (!clients || clients.length === 0) {
      console.log('No clients to sync');
      return;
    }
    
    // 2. For each client, create or update in leads table
    for (const client of clients) {
      console.log(`\nProcessing: ${client.first_name} ${client.last_name} (${client.email})`);
      
      // Check if lead already exists
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', client.email)
        .eq('organization_id', organizationId)
        .single();
      
      if (existingLead) {
        console.log('  → Lead already exists, skipping');
        continue;
      }
      
      // Create lead from client data
      const leadData = {
        organization_id: organizationId,
        name: `${client.first_name} ${client.last_name}`.trim(),
        email: client.email,
        phone: client.phone,
        status: client.membership_status === 'active' ? 'member' : 'lead',
        created_at: client.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Map additional fields if they exist
        date_of_birth: client.date_of_birth || null,
        gender: client.gender || null,
        address_line_1: client.address_line_1 || null,
        address_line_2: client.address_line_2 || null,
        city: client.city || null,
        postal_code: client.postal_code || null,
        country: client.country || null,
        occupation: client.occupation || null,
        company: client.company || null,
        referral_source: client.referral_source || null,
        referral_name: client.referral_name || null,
        joined_date: client.joined_date || null,
        last_visit_date: client.last_visit || null,
        total_visits: client.total_visits || 0,
        lifetime_value: client.lifetime_value || 0,
        is_vip: client.is_vip || false,
        tags: client.tags || []
      };
      
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single();
      
      if (leadError) {
        console.error(`  ❌ Error creating lead:`, leadError.message);
      } else {
        console.log(`  ✅ Created lead with ID: ${newLead.id}`);
        
        // If client has a membership, create it in customer_memberships
        if (client.membership_plan_id) {
          console.log('  → Creating membership...');
          
          const membershipData = {
            customer_id: newLead.id,
            organization_id: organizationId,
            membership_plan_id: client.membership_plan_id,
            status: client.membership_status || 'active',
            start_date: client.membership_start_date || new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const { error: memError } = await supabase
            .from('customer_memberships')
            .insert(membershipData);
          
          if (memError) {
            console.error('    ❌ Error creating membership:', memError.message);
          } else {
            console.log('    ✅ Membership created');
          }
        }
      }
    }
    
    console.log('\n✅ Sync complete!');
    console.log('Clients are now available in the leads table for booking');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

syncClientsToLeads().catch(console.error);