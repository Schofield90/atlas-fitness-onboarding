#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncFacebookPages() {
  console.log('🔄 Syncing Facebook Pages to Database...\n');
  
  try {
    // Get the active integration
    const { data: integration, error: intError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (intError || !integration) {
      console.log('❌ No active Facebook integration found');
      return;
    }
    
    console.log(`✅ Found integration for: ${integration.facebook_user_name}`);
    console.log(`📍 Organization ID: ${integration.organization_id}`);
    
    // Fetch pages from Facebook
    console.log('\n📡 Fetching pages from Facebook...');
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,username,category,tasks&access_token=${integration.access_token}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.log(`❌ Facebook API error: ${error.error?.message || 'Unknown error'}`);
      return;
    }
    
    const data = await response.json();
    const pages = data.data || [];
    
    console.log(`✅ Found ${pages.length} pages from Facebook\n`);
    
    // Sync each page to database
    console.log('💾 Syncing pages to database...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const page of pages) {
      try {
        const { error: upsertError } = await supabase
          .from('facebook_pages')
          .upsert({
            organization_id: integration.organization_id,
            integration_id: integration.id,
            facebook_page_id: page.id,
            page_name: page.name,
            access_token: page.access_token,
            page_username: page.username || null,
            page_category: page.category || null,
            page_info: {
              tasks: page.tasks || []
            },
            permissions: page.tasks || [],
            is_active: true,
            is_primary: false
          }, {
            onConflict: 'organization_id,facebook_page_id'
          });
        
        if (upsertError) {
          console.log(`   ❌ Error syncing ${page.name}: ${upsertError.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Synced: ${page.name}`);
          successCount++;
        }
      } catch (error) {
        console.log(`   ❌ Error syncing ${page.name}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Sync Results:`);
    console.log(`   ✅ Successfully synced: ${successCount} pages`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed to sync: ${errorCount} pages`);
    }
    
    // Update integration last sync time
    await supabase
      .from('facebook_integrations')
      .update({ 
        last_sync_at: new Date().toISOString()
      })
      .eq('id', integration.id);
    
    console.log('\n🎉 Sync complete!');
    console.log('Go to https://atlas-fitness-onboarding.vercel.app/integrations/facebook to see your pages');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

syncFacebookPages();