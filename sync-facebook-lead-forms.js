#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncFacebookLeadForms() {
  console.log('🔄 Syncing Facebook Lead Forms to Database\n');
  console.log('=' + '='.repeat(60) + '\n');
  
  try {
    const orgId = '63589490-8f55-4157-bd3a-e141594b748e';
    
    // Get the Facebook integration
    const { data: integration, error: intError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .single();
    
    if (intError || !integration) {
      console.log('❌ No active Facebook integration found');
      return;
    }
    
    console.log(`✅ Found integration for: ${integration.facebook_user_name}\n`);
    
    // Get all pages
    const { data: pages } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true);
    
    if (!pages || pages.length === 0) {
      console.log('❌ No pages found');
      return;
    }
    
    console.log(`📄 Processing ${pages.length} pages...\n`);
    
    let totalFormsFound = 0;
    let totalFormsSynced = 0;
    let totalFormsUpdated = 0;
    
    for (const page of pages) {
      console.log(`\n🔍 Processing: ${page.page_name}`);
      console.log(`   Page ID: ${page.facebook_page_id}`);
      
      const token = page.access_token || integration.access_token;
      
      // Fetch lead forms from Facebook (removed deprecated leadgen_export_csv_url field)
      const formsUrl = `https://graph.facebook.com/v18.0/${page.facebook_page_id}/leadgen_forms?fields=id,name,status,created_time,questions,privacy_policy,thank_you_page&access_token=${token}`;
      
      try {
        const response = await fetch(formsUrl);
        const data = await response.json();
        
        if (data.error) {
          console.log(`   ⚠️  API Error: ${data.error.message}`);
          continue;
        }
        
        if (!data.data || data.data.length === 0) {
          console.log(`   ℹ️  No lead forms found`);
          continue;
        }
        
        console.log(`   ✅ Found ${data.data.length} lead forms`);
        totalFormsFound += data.data.length;
        
        // Process each form
        for (const form of data.data) {
          // Check if form exists in database
          const { data: existingForm } = await supabase
            .from('facebook_lead_forms')
            .select('id, updated_at')
            .eq('facebook_form_id', form.id)
            .eq('organization_id', orgId)
            .single();
          
          // Prepare form data
          const formData = {
            organization_id: orgId,
            page_id: page.id || null,
            facebook_page_id: page.facebook_page_id,
            page_name: page.page_name,
            facebook_form_id: form.id,
            form_name: form.name || 'Unnamed Form',
            form_status: form.status || 'ACTIVE',
            created_time: form.created_time,
            questions: form.questions || [],
            privacy_policy: form.privacy_policy || {},
            thank_you_page: form.thank_you_page || {},
            is_active: form.status === 'ACTIVE',
            raw_data: form,
            updated_at: new Date().toISOString()
          };
          
          if (existingForm) {
            // Update existing form
            const { error: updateError } = await supabase
              .from('facebook_lead_forms')
              .update(formData)
              .eq('id', existingForm.id);
            
            if (updateError) {
              console.log(`      ❌ Failed to update form ${form.name}: ${updateError.message}`);
            } else {
              console.log(`      ✅ Updated: ${form.name}`);
              totalFormsUpdated++;
            }
          } else {
            // Insert new form
            const { error: insertError } = await supabase
              .from('facebook_lead_forms')
              .insert(formData);
            
            if (insertError) {
              console.log(`      ❌ Failed to sync form ${form.name}: ${insertError.message}`);
            } else {
              console.log(`      ✅ Synced: ${form.name}`);
              totalFormsSynced++;
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ Fetch Error: ${error.message}`);
      }
    }
    
    // Clean up inactive forms
    console.log('\n📌 Cleaning up inactive forms...');
    
    const { data: allStoredForms } = await supabase
      .from('facebook_lead_forms')
      .select('id, facebook_form_id, form_name')
      .eq('organization_id', orgId);
    
    if (allStoredForms) {
      // Mark forms as inactive if they weren't found in this sync
      const syncedFormIds = [];
      for (const page of pages) {
        const token = page.access_token || integration.access_token;
        const formsUrl = `https://graph.facebook.com/v18.0/${page.facebook_page_id}/leadgen_forms?fields=id&access_token=${token}`;
        
        try {
          const response = await fetch(formsUrl);
          const data = await response.json();
          if (data.data) {
            data.data.forEach(form => syncedFormIds.push(form.id));
          }
        } catch (error) {
          // Silent fail for cleanup
        }
      }
      
      const formsToDeactivate = allStoredForms.filter(f => !syncedFormIds.includes(f.facebook_form_id));
      
      if (formsToDeactivate.length > 0) {
        const { error: deactivateError } = await supabase
          .from('facebook_lead_forms')
          .update({ is_active: false })
          .in('id', formsToDeactivate.map(f => f.id));
        
        if (!deactivateError) {
          console.log(`   ✅ Deactivated ${formsToDeactivate.length} inactive forms`);
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(62));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(62) + '\n');
    console.log(`Total Forms Found: ${totalFormsFound}`);
    console.log(`New Forms Synced: ${totalFormsSynced}`);
    console.log(`Forms Updated: ${totalFormsUpdated}`);
    
    // Verify sync
    const { data: finalCount } = await supabase
      .from('facebook_lead_forms')
      .select('id', { count: 'exact' })
      .eq('organization_id', orgId)
      .eq('is_active', true);
    
    console.log(`\nActive Forms in Database: ${finalCount?.length || 0}`);
    
    console.log('\n✅ Sync completed successfully!');
    console.log('   Lead forms should now appear in the UI when pages are selected.');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

// Run the sync
syncFacebookLeadForms();