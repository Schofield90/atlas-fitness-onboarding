#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncLeadForms() {
  console.log('🔄 Syncing Facebook Lead Forms (Simple)\n');
  
  try {
    const orgId = '63589490-8f55-4157-bd3a-e141594b748e';
    
    // Get integration
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .single();
    
    if (!integration) {
      console.log('❌ No active integration');
      return;
    }
    
    // Test with known pages that have forms
    const testPages = [
      { id: '414824765049453', name: 'Peak Performance Fitness Canterbury' },
      { id: '102772736086486', name: 'UBX UK' }
    ];
    
    for (const testPage of testPages) {
      console.log(`\n📄 Processing ${testPage.name}...`);
      
      // Get page from database
      const { data: page } = await supabase
        .from('facebook_pages')
        .select('*')
        .eq('facebook_page_id', testPage.id)
        .single();
      
      if (!page) {
        console.log('   Page not in database');
        continue;
      }
      
      const token = page.access_token || integration.access_token;
      
      // Fetch lead forms - minimal fields
      const url = `https://graph.facebook.com/v18.0/${testPage.id}/leadgen_forms?fields=id,name,status&access_token=${token}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        console.log(`   Error: ${data.error.message}`);
        continue;
      }
      
      if (!data.data || data.data.length === 0) {
        console.log('   No forms found');
        continue;
      }
      
      console.log(`   Found ${data.data.length} forms`);
      
      // Store each form
      for (const form of data.data) {
        // Check if exists
        const { data: existing } = await supabase
          .from('facebook_lead_forms')
          .select('id')
          .eq('facebook_form_id', form.id)
          .single();
        
        const formData = {
          organization_id: orgId,
          facebook_page_id: testPage.id,
          page_name: testPage.name,
          facebook_form_id: form.id,
          form_name: form.name || 'Unnamed',
          form_status: form.status || 'ACTIVE',
          is_active: form.status === 'ACTIVE'
        };
        
        if (existing) {
          // Update
          await supabase
            .from('facebook_lead_forms')
            .update(formData)
            .eq('id', existing.id);
          
          console.log(`   ✅ Updated: ${form.name}`);
        } else {
          // Insert
          const { error } = await supabase
            .from('facebook_lead_forms')
            .insert(formData);
          
          if (error) {
            console.log(`   ❌ Failed: ${error.message}`);
          } else {
            console.log(`   ✅ Added: ${form.name}`);
          }
        }
      }
    }
    
    // Check what's in the database now
    const { data: allForms, error } = await supabase
      .from('facebook_lead_forms')
      .select('*')
      .eq('organization_id', orgId);
    
    console.log(`\n📊 Total forms in database: ${allForms?.length || 0}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

syncLeadForms();