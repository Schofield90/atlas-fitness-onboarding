#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFacebookLeads() {
  console.log('🔍 Checking Facebook leads in database...\n');
  
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  // 1. Check all leads in the organization
  const { data: allLeads, error: allError } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (allError) {
    console.log('❌ Error fetching leads:', allError);
    return;
  }
  
  console.log(`📊 Total leads found: ${allLeads?.length || 0}\n`);
  
  // 2. Check specifically for Facebook leads
  const { data: facebookLeads, error: fbError } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('source', 'facebook')
    .order('created_at', { ascending: false });
  
  if (fbError) {
    console.log('❌ Error fetching Facebook leads:', fbError);
    return;
  }
  
  console.log(`📘 Facebook leads found: ${facebookLeads?.length || 0}\n`);
  
  // 3. Display sample leads
  if (facebookLeads && facebookLeads.length > 0) {
    console.log('Sample Facebook leads:');
    facebookLeads.slice(0, 3).forEach((lead, index) => {
      console.log(`\n${index + 1}. ${lead.name}`);
      console.log(`   Email: ${lead.email}`);
      console.log(`   Phone: ${lead.phone}`);
      console.log(`   Status: ${lead.status}`);
      console.log(`   Created: ${new Date(lead.created_at).toLocaleString()}`);
      if (lead.metadata) {
        console.log(`   Form: ${lead.metadata.form_name || 'Unknown'}`);
        console.log(`   FB Lead ID: ${lead.metadata.facebook_lead_id || 'N/A'}`);
      }
    });
  }
  
  // 4. Check for leads with Facebook metadata
  const { data: leadsWithFBData, error: metaError } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId)
    .not('metadata->facebook_lead_id', 'is', null);
  
  console.log(`\n🔗 Leads with Facebook metadata: ${leadsWithFBData?.length || 0}`);
  
  // 5. Check for any recent leads (last 24 hours)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const { data: recentLeads, error: recentError } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false });
  
  console.log(`\n⏰ Leads created in last 24h: ${recentLeads?.length || 0}`);
  
  if (recentLeads && recentLeads.length > 0) {
    console.log('\nRecent leads:');
    recentLeads.slice(0, 3).forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.name} (${lead.source}) - ${new Date(lead.created_at).toLocaleString()}`);
    });
  }
}

testFacebookLeads();