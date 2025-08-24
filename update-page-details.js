#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePageDetails() {
  console.log('📊 Updating Facebook Page Details...\n');
  
  try {
    // Get the active integration
    const { data: integration, error: intError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .eq('is_active', true)
      .single();
    
    if (intError || !integration) {
      console.log('❌ No active Facebook integration found');
      return;
    }
    
    console.log(`✅ Found integration for: ${integration.facebook_user_name}`);
    
    // Fetch detailed page info from Facebook
    console.log('\n📡 Fetching detailed page info from Facebook...');
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,username,category,tasks,followers_count,fan_count,website,cover&access_token=${integration.access_token}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.log(`❌ Facebook API error: ${error.error?.message || 'Unknown error'}`);
      return;
    }
    
    const data = await response.json();
    const pages = data.data || [];
    
    console.log(`✅ Found ${pages.length} pages from Facebook\n`);
    
    // Update each page with additional details
    console.log('💾 Updating page details in database...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const page of pages) {
      try {
        const pageInfo = {
          followers_count: page.followers_count || page.fan_count || 0,
          website: page.website || null,
          cover: page.cover ? {
            source: page.cover.source,
            cover_id: page.cover.cover_id,
            offset_x: page.cover.offset_x,
            offset_y: page.cover.offset_y
          } : null,
          tasks: page.tasks || []
        };
        
        const { error: updateError } = await supabase
          .from('facebook_pages')
          .update({
            page_category: page.category || 'Business',
            page_username: page.username || null,
            page_info: pageInfo,
            permissions: page.tasks || [],
            updated_at: new Date().toISOString()
          })
          .eq('organization_id', integration.organization_id)
          .eq('facebook_page_id', page.id);
        
        if (updateError) {
          console.log(`   ❌ Error updating ${page.name}: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Updated: ${page.name} (${pageInfo.followers_count || 0} followers)`);
          successCount++;
        }
      } catch (error) {
        console.log(`   ❌ Error updating ${page.name}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Update Results:`);
    console.log(`   ✅ Successfully updated: ${successCount} pages`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed to update: ${errorCount} pages`);
    }
    
    console.log('\n🎉 Page details update complete!');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
  }
}

updatePageDetails();