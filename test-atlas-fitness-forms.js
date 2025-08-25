#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAtlasFitnessForms() {
  console.log('🔍 Testing Atlas Fitness Lead Forms Specifically\n');
  console.log('=' + '='.repeat(60) + '\n');
  
  try {
    const orgId = '63589490-8f55-4157-bd3a-e141594b748e';
    const atlasFitnessPageId = '1119327074753793';
    
    // Get the Facebook integration
    const { data: integration, error: intError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .single();
    
    if (intError || !integration) {
      console.log('❌ No active Facebook integration found');
      console.log('Error:', intError?.message);
      
      // Try to continue anyway with a manual check
      console.log('\nAttempting to query facebook_integrations table directly...');
      const { data: allIntegrations } = await supabase
        .from('facebook_integrations')
        .select('*')
        .eq('organization_id', orgId);
      
      if (allIntegrations && allIntegrations.length > 0) {
        console.log(`Found ${allIntegrations.length} integration(s), using first one`);
        integration = allIntegrations[0];
      } else {
        console.log('No integrations found at all');
        return;
      }
    }
    
    console.log(`✅ Integration found for: ${integration.facebook_user_name}\n`);
    
    // Get Atlas Fitness page from database
    console.log('📌 Step 1: Getting Atlas Fitness Page from Database\n');
    const { data: atlasPage } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('facebook_page_id', atlasFitnessPageId)
      .eq('organization_id', orgId)
      .single();
    
    if (!atlasPage) {
      console.log('❌ Atlas Fitness page not found in database');
      return;
    }
    
    console.log('✅ Atlas Fitness page found in database:');
    console.log(`   Page ID: ${atlasPage.facebook_page_id}`);
    console.log(`   Page Name: ${atlasPage.page_name}`);
    console.log(`   Has Page Token: ${!!atlasPage.access_token}`);
    console.log(`   Is Active: ${atlasPage.is_active}`);
    
    // Test different access tokens
    console.log('\n📌 Step 2: Testing Different Access Tokens\n');
    
    const tokens = [
      { name: 'Page Access Token', token: atlasPage.access_token },
      { name: 'User Access Token', token: integration.access_token }
    ];
    
    for (const { name, token } of tokens) {
      if (!token) {
        console.log(`⚠️  ${name}: Not available`);
        continue;
      }
      
      console.log(`\n🔑 Testing with ${name}:`);
      
      // Test 1: Basic page info
      console.log('   1️⃣ Testing basic page access...');
      const pageUrl = `https://graph.facebook.com/v18.0/${atlasFitnessPageId}?fields=id,name,category&access_token=${token}`;
      
      try {
        const pageResponse = await fetch(pageUrl);
        const pageData = await pageResponse.json();
        
        if (pageData.error) {
          console.log(`      ❌ Error: ${pageData.error.message}`);
          continue;
        }
        
        console.log(`      ✅ Can access page: ${pageData.name}`);
        
        // Test 2: Lead forms with different API versions and parameters
        console.log('   2️⃣ Testing lead forms access...');
        
        // Try different API calls
        const apiVariations = [
          {
            desc: 'Simple (v18.0)',
            url: `https://graph.facebook.com/v18.0/${atlasFitnessPageId}/leadgen_forms?access_token=${token}`
          },
          {
            desc: 'With fields (v18.0)',
            url: `https://graph.facebook.com/v18.0/${atlasFitnessPageId}/leadgen_forms?fields=id,name,status&access_token=${token}`
          },
          {
            desc: 'With limit (v18.0)',
            url: `https://graph.facebook.com/v18.0/${atlasFitnessPageId}/leadgen_forms?limit=100&access_token=${token}`
          },
          {
            desc: 'Archived forms included',
            url: `https://graph.facebook.com/v18.0/${atlasFitnessPageId}/leadgen_forms?fields=id,name,status&filtering=[{"field":"status","operator":"IN","value":["ACTIVE","ARCHIVED","DELETED"]}]&access_token=${token}`
          }
        ];
        
        for (const { desc, url } of apiVariations) {
          console.log(`\n      Testing: ${desc}`);
          
          try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) {
              console.log(`      ❌ Error: ${data.error.message}`);
              if (data.error.code === 200) {
                console.log('         Missing permission: leads_retrieval');
              } else if (data.error.code === 100) {
                console.log('         Invalid parameter or access issue');
              }
            } else if (data.data) {
              console.log(`      ✅ Found ${data.data.length} lead forms`);
              
              if (data.data.length > 0) {
                console.log('\n      📝 Lead Forms Found:');
                data.data.forEach((form, index) => {
                  console.log(`         ${index + 1}. ${form.name || 'Unnamed'} (ID: ${form.id})`);
                  if (form.status) {
                    console.log(`            Status: ${form.status}`);
                  }
                });
              }
            } else {
              console.log('      ⚠️  Unexpected response format');
            }
          } catch (error) {
            console.log(`      ❌ Fetch error: ${error.message}`);
          }
        }
        
        // Test 3: Check permissions
        console.log('\n   3️⃣ Checking page permissions...');
        const permsUrl = `https://graph.facebook.com/v18.0/${atlasFitnessPageId}/roles?access_token=${token}`;
        
        try {
          const permsResponse = await fetch(permsUrl);
          const permsData = await permsResponse.json();
          
          if (permsData.error) {
            console.log(`      ⚠️  Cannot check roles: ${permsData.error.message}`);
          } else if (permsData.data) {
            console.log(`      ✅ Can access page roles`);
          }
        } catch (error) {
          console.log(`      ❌ Error: ${error.message}`);
        }
        
        // Test 4: Check token permissions
        console.log('\n   4️⃣ Checking token permissions...');
        const debugUrl = `https://graph.facebook.com/v18.0/debug_token?input_token=${token}&access_token=${token}`;
        
        try {
          const debugResponse = await fetch(debugUrl);
          const debugData = await debugResponse.json();
          
          if (debugData.data) {
            console.log('      Token Information:');
            console.log(`         Type: ${debugData.data.type || 'Unknown'}`);
            console.log(`         App ID: ${debugData.data.app_id || 'Unknown'}`);
            console.log(`         Valid: ${debugData.data.is_valid || false}`);
            
            if (debugData.data.scopes) {
              console.log(`         Scopes: ${debugData.data.scopes.join(', ')}`);
              
              // Check for required permissions
              const requiredPerms = ['leads_retrieval', 'pages_show_list', 'pages_manage_metadata'];
              const hasLeadsRetrieval = debugData.data.scopes.includes('leads_retrieval');
              
              console.log(`\n      📋 Permission Check:`);
              requiredPerms.forEach(perm => {
                const hasPerm = debugData.data.scopes.includes(perm);
                console.log(`         ${hasPerm ? '✅' : '❌'} ${perm}`);
              });
            }
          }
        } catch (error) {
          console.log(`      ❌ Error checking token: ${error.message}`);
        }
        
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(62));
    console.log('📊 DIAGNOSIS SUMMARY');
    console.log('='.repeat(62) + '\n');
    
    console.log('Possible reasons Atlas Fitness shows 0 forms:');
    console.log('1. Forms might be ARCHIVED or DELETED (not ACTIVE)');
    console.log('2. Missing leads_retrieval permission for this specific page');
    console.log('3. Page access token might not have proper permissions');
    console.log('4. Forms might be created under a different ad account');
    console.log('5. User might not have admin access to this page\'s forms');
    
    console.log('\n🔧 Recommended Actions:');
    console.log('1. Check in Facebook Business Manager if forms exist');
    console.log('2. Verify user has admin access to Atlas Fitness page');
    console.log('3. Re-authenticate with leads_retrieval permission');
    console.log('4. Check if forms are under a different page variation');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAtlasFitnessForms();