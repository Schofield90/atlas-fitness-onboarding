#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFacebookSync() {
  console.log('🔍 Testing Facebook Integration Setup...\n');
  
  try {
    // 1. Check if tables exist
    console.log('1️⃣ Checking if required tables exist...');
    
    const tables = ['facebook_integrations', 'facebook_pages', 'facebook_lead_forms', 'facebook_ad_accounts'];
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('does not exist')) {
        console.log(`   ❌ Table ${table} does not exist`);
      } else {
        console.log(`   ✅ Table ${table} exists`);
      }
    }
    
    // 2. Check if there's an active integration
    console.log('\n2️⃣ Checking for active Facebook integration...');
    const { data: integration, error: intError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (intError || !integration) {
      console.log('   ❌ No active Facebook integration found');
      return;
    }
    
    console.log(`   ✅ Found integration for user: ${integration.facebook_user_name}`);
    console.log(`   📅 Token expires: ${integration.token_expires_at}`);
    
    // 3. Check for existing pages
    console.log('\n3️⃣ Checking for synced pages...');
    const { data: pages, error: pagesError } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('organization_id', integration.organization_id);
    
    if (pagesError) {
      console.log(`   ❌ Error fetching pages: ${pagesError.message}`);
    } else if (!pages || pages.length === 0) {
      console.log('   ⚠️  No pages synced yet');
    } else {
      console.log(`   ✅ Found ${pages.length} synced pages:`);
      pages.forEach(page => {
        console.log(`      - ${page.page_name} (${page.facebook_page_id})`);
      });
    }
    
    // 4. Test Facebook API directly
    if (integration.access_token) {
      console.log('\n4️⃣ Testing Facebook Graph API...');
      
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${integration.access_token}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Facebook API working - Found ${data.data?.length || 0} pages`);
        if (data.data && data.data.length > 0) {
          console.log('   📄 Available pages from Facebook:');
          data.data.forEach(page => {
            console.log(`      - ${page.name} (${page.id})`);
          });
        }
      } else {
        const error = await response.json();
        console.log(`   ❌ Facebook API error: ${error.error?.message || 'Unknown error'}`);
      }
    }
    
    // 5. Check view and function
    console.log('\n5️⃣ Checking helper function and view...');
    
    // Test the function
    const { data: funcTest, error: funcError } = await supabase
      .rpc('get_user_organization_id');
    
    if (funcError) {
      console.log(`   ❌ Function get_user_organization_id error: ${funcError.message}`);
    } else {
      console.log(`   ✅ Function get_user_organization_id exists`);
    }
    
    // Test the view
    const { data: viewTest, error: viewError } = await supabase
      .from('user_accessible_organizations')
      .select('*')
      .limit(1);
    
    if (viewError) {
      console.log(`   ❌ View user_accessible_organizations error: ${viewError.message}`);
    } else {
      console.log(`   ✅ View user_accessible_organizations exists`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFacebookSync();