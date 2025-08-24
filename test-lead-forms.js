#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLeadForms() {
  console.log('🔍 Testing Facebook Lead Forms Setup...\n');
  
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
    
    console.log(`✅ Found integration for: ${integration.facebook_user_name}`);
    
    // Get a few pages to test lead forms
    const { data: pages } = await supabase
      .from('facebook_pages')
      .select('facebook_page_id, page_name, access_token')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .limit(3);
    
    if (!pages || pages.length === 0) {
      console.log('❌ No pages found');
      return;
    }
    
    console.log(`\n📄 Testing lead forms for ${pages.length} pages:\n`);
    
    for (const page of pages) {
      console.log(`\n--- Testing ${page.page_name} (${page.facebook_page_id}) ---`);
      
      // Use page token if available, otherwise user token
      const token = page.access_token || integration.access_token;
      
      // Test 1: Check if we can access the page
      console.log('1️⃣ Checking page access...');
      const pageUrl = `https://graph.facebook.com/v18.0/${page.facebook_page_id}?fields=id,name,access_token&access_token=${token}`;
      const pageResponse = await fetch(pageUrl);
      const pageData = await pageResponse.json();
      
      if (pageData.error) {
        console.log(`   ❌ Page access error: ${pageData.error.message}`);
        continue;
      }
      console.log(`   ✅ Page accessible`);
      
      // Test 2: Try to fetch lead forms
      console.log('2️⃣ Fetching lead forms...');
      const formsUrl = `https://graph.facebook.com/v18.0/${page.facebook_page_id}/leadgen_forms?access_token=${token}`;
      const formsResponse = await fetch(formsUrl);
      const formsData = await formsResponse.json();
      
      if (formsData.error) {
        console.log(`   ❌ Forms API error: ${formsData.error.message}`);
        
        // Check specific error codes
        if (formsData.error.code === 200) {
          console.log('   ℹ️  Permission issue - needs leads_retrieval permission');
        } else if (formsData.error.code === 100) {
          console.log('   ℹ️  Invalid parameter or missing access');
        }
      } else if (formsData.data) {
        console.log(`   ✅ Found ${formsData.data.length} lead forms`);
        
        if (formsData.data.length > 0) {
          // Show first form details
          const form = formsData.data[0];
          console.log(`      First form: ${form.name || 'Unnamed'} (${form.id})`);
        }
      } else {
        console.log('   ⚠️  No forms found (page may not have any lead forms)');
      }
      
      // Test 3: Check permissions on the token
      console.log('3️⃣ Checking token permissions...');
      const permsUrl = `https://graph.facebook.com/v18.0/${page.facebook_page_id}/roles?access_token=${token}`;
      const permsResponse = await fetch(permsUrl);
      const permsData = await permsResponse.json();
      
      if (permsData.error) {
        console.log(`   ⚠️  Cannot check page roles: ${permsData.error.message}`);
      } else if (permsData.data) {
        console.log(`   ✅ Page roles accessible`);
      }
    }
    
    // Check if lead_forms table exists
    console.log('\n\n4️⃣ Checking database tables...');
    const { error: tableError } = await supabase
      .from('facebook_lead_forms')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.message.includes('does not exist')) {
      console.log('   ❌ facebook_lead_forms table does not exist');
      console.log('   Need to create the table first');
    } else {
      console.log('   ✅ facebook_lead_forms table exists');
      
      // Check if there are any stored lead forms
      const { data: storedForms, error: formsError } = await supabase
        .from('facebook_lead_forms')
        .select('*')
        .eq('organization_id', orgId)
        .limit(5);
      
      if (storedForms && storedForms.length > 0) {
        console.log(`   ✅ Found ${storedForms.length} stored lead forms in database`);
      } else {
        console.log('   ⚠️  No lead forms stored in database yet');
      }
    }
    
    console.log('\n\n📊 Summary:');
    console.log('- Integration: Active ✅');
    console.log('- Pages: Accessible ✅');
    console.log('- Lead Forms API: Check results above');
    console.log('- Database: Check results above');
    console.log('\nIf lead forms aren\'t showing, it could be:');
    console.log('1. Pages don\'t have any lead forms created');
    console.log('2. Missing leads_retrieval permission');
    console.log('3. Frontend not calling the API correctly');
    console.log('4. API response format issue');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLeadForms();