#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSyncedLeads() {
  console.log('🔍 Checking for Synced Facebook Leads\n');
  console.log('=' + '='.repeat(60) + '\n');
  
  try {
    const orgId = '63589490-8f55-4157-bd3a-e141594b748e';
    
    // 1. Check all leads for this organization
    console.log('📌 Step 1: Checking all leads for organization\n');
    const { data: allLeads, error: allError } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (allError) {
      console.log('❌ Error fetching leads:', allError.message);
      return;
    }
    
    console.log(`Total leads found: ${allLeads?.length || 0}`);
    
    if (allLeads && allLeads.length > 0) {
      console.log('\n📋 Recent Leads:');
      allLeads.slice(0, 5).forEach((lead, index) => {
        console.log(`\n${index + 1}. ${lead.name || 'No name'}`);
        console.log(`   Email: ${lead.email || 'No email'}`);
        console.log(`   Phone: ${lead.phone || 'No phone'}`);
        console.log(`   Source: ${lead.source || 'Unknown'}`);
        console.log(`   Status: ${lead.status || 'Unknown'}`);
        console.log(`   Created: ${new Date(lead.created_at).toLocaleString()}`);
        if (lead.facebook_lead_id) {
          console.log(`   ✅ Facebook Lead ID: ${lead.facebook_lead_id}`);
        }
        if (lead.facebook_form_id) {
          console.log(`   📝 Facebook Form ID: ${lead.facebook_form_id}`);
        }
      });
    }
    
    // 2. Check specifically for Facebook leads
    console.log('\n\n📌 Step 2: Checking Facebook-sourced leads\n');
    const { data: fbLeads, error: fbError } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', orgId)
      .eq('source', 'facebook')
      .order('created_at', { ascending: false });
    
    if (fbError) {
      console.log('❌ Error fetching Facebook leads:', fbError.message);
    } else {
      console.log(`Facebook leads found: ${fbLeads?.length || 0}`);
      
      if (fbLeads && fbLeads.length > 0) {
        console.log('\n📘 Facebook Leads Summary:');
        
        // Group by form
        const formGroups = {};
        fbLeads.forEach(lead => {
          const formId = lead.facebook_form_id || 'Unknown Form';
          if (!formGroups[formId]) {
            formGroups[formId] = [];
          }
          formGroups[formId].push(lead);
        });
        
        Object.entries(formGroups).forEach(([formId, leads]) => {
          console.log(`\n   Form ${formId}: ${leads.length} leads`);
          leads.slice(0, 3).forEach(lead => {
            console.log(`      - ${lead.name} (${lead.email})`);
          });
        });
      }
    }
    
    // 3. Check for leads with facebook_lead_id
    console.log('\n\n📌 Step 3: Checking leads with Facebook metadata\n');
    const { data: metaLeads, error: metaError } = await supabase
      .from('leads')
      .select('id, name, email, facebook_lead_id, facebook_form_id, metadata')
      .eq('organization_id', orgId)
      .not('facebook_lead_id', 'is', null);
    
    if (metaError) {
      console.log('❌ Error:', metaError.message);
    } else {
      console.log(`Leads with Facebook metadata: ${metaLeads?.length || 0}`);
      
      if (metaLeads && metaLeads.length > 0) {
        console.log('\nSample metadata:');
        const sampleLead = metaLeads[0];
        console.log(`   Lead: ${sampleLead.name}`);
        console.log(`   Facebook Lead ID: ${sampleLead.facebook_lead_id}`);
        console.log(`   Facebook Form ID: ${sampleLead.facebook_form_id}`);
        if (sampleLead.metadata) {
          console.log(`   Metadata keys: ${Object.keys(sampleLead.metadata).join(', ')}`);
        }
      }
    }
    
    // 4. Check if there are any leads at all
    console.log('\n\n📌 Step 4: Database Summary\n');
    const { count: totalCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);
    
    console.log(`Total leads in database for organization: ${totalCount || 0}`);
    
    // Check different sources
    const sources = ['facebook', 'website', 'manual', 'api'];
    for (const source of sources) {
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('source', source);
      
      if (count > 0) {
        console.log(`   ${source}: ${count} leads`);
      }
    }
    
    // 5. Diagnosis
    console.log('\n' + '='.repeat(62));
    console.log('📊 DIAGNOSIS');
    console.log('='.repeat(62) + '\n');
    
    if (!allLeads || allLeads.length === 0) {
      console.log('❌ No leads found in the database at all');
      console.log('\nPossible issues:');
      console.log('1. Leads are not being saved correctly');
      console.log('2. Organization ID mismatch');
      console.log('3. Database connection issue');
      console.log('4. RLS policies blocking access');
    } else if (!fbLeads || fbLeads.length === 0) {
      console.log('⚠️  Leads exist but no Facebook leads found');
      console.log('\nPossible issues:');
      console.log('1. Facebook leads are being saved with wrong source');
      console.log('2. Sync process is not completing');
      console.log('3. Facebook API is not returning leads');
    } else {
      console.log('✅ Facebook leads are in the database!');
      console.log(`   Total: ${fbLeads.length} leads from Facebook`);
      console.log('\nIf not showing in UI:');
      console.log('1. Check if UI is filtering by user instead of organization');
      console.log('2. Check if there are permission issues');
      console.log('3. Try refreshing the page or clearing cache');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSyncedLeads();