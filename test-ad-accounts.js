#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdAccounts() {
  console.log('🔍 Testing Facebook Ad Accounts Setup...\n');
  
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
    console.log(`   Has access token: ${!!integration.access_token}`);
    
    // Test Facebook API directly for ad accounts
    console.log('\n📡 Testing Facebook API for Ad Accounts...');
    
    const apiUrl = `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${integration.access_token}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Facebook API Response:`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Ad Accounts found: ${data.data?.length || 0}`);
      
      if (data.data && data.data.length > 0) {
        console.log('\n📊 Ad Accounts:');
        data.data.slice(0, 5).forEach(account => {
          console.log(`   • ${account.name || 'Unnamed'} (${account.id})`);
          console.log(`     Status: ${account.account_status === 1 ? 'Active' : 'Inactive'}`);
          console.log(`     Currency: ${account.currency}`);
        });
      } else {
        console.log('\n⚠️  No ad accounts found. This could mean:');
        console.log('   1. The user has no ad accounts');
        console.log('   2. Missing ads_management permission');
        console.log('   3. The token doesn\'t have access to ad accounts');
      }
      
      // Check permissions
      console.log('\n🔑 Checking token permissions...');
      const permUrl = `https://graph.facebook.com/v18.0/me/permissions?access_token=${integration.access_token}`;
      const permResponse = await fetch(permUrl);
      const permData = await permResponse.json();
      
      if (permData.data) {
        const grantedPerms = permData.data
          .filter(p => p.status === 'granted')
          .map(p => p.permission);
        
        console.log('✅ Granted permissions:', grantedPerms.join(', '));
        
        const requiredPerms = ['ads_management', 'ads_read'];
        const missingPerms = requiredPerms.filter(p => !grantedPerms.includes(p));
        
        if (missingPerms.length > 0) {
          console.log('⚠️  Missing required permissions:', missingPerms.join(', '));
          console.log('   User needs to re-authorize with these permissions');
        }
      }
    } else {
      console.log(`❌ Facebook API error: ${data.error?.message || 'Unknown error'}`);
      console.log('   Error code:', data.error?.code);
      console.log('   Error type:', data.error?.type);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAdAccounts();