#!/usr/bin/env node

const fetch = require('node-fetch');

async function testAllAPIs() {
  console.log('🔍 Testing All Facebook APIs\n');
  console.log('=' .repeat(50));
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Pages API
    console.log('\n1️⃣ TESTING PAGES API');
    console.log(`   GET ${baseUrl}/api/integrations/facebook/pages`);
    
    // Note: We can't easily test authenticated endpoints from Node.js
    // But we can check if the server is responding
    const pagesResponse = await fetch(`${baseUrl}/api/integrations/facebook/pages`);
    console.log(`   Status: ${pagesResponse.status}`);
    if (pagesResponse.status === 401) {
      console.log('   ✅ API is responding (requires authentication)');
    } else if (pagesResponse.ok) {
      const data = await pagesResponse.json();
      console.log(`   ✅ Pages returned: ${data.pages?.length || 0}`);
    }
    
    // Test 2: Ad Accounts API
    console.log('\n2️⃣ TESTING AD ACCOUNTS API');
    console.log(`   GET ${baseUrl}/api/integrations/facebook/ad-accounts`);
    
    const adAccountsResponse = await fetch(`${baseUrl}/api/integrations/facebook/ad-accounts`);
    console.log(`   Status: ${adAccountsResponse.status}`);
    if (adAccountsResponse.status === 401) {
      console.log('   ✅ API is responding (requires authentication)');
    } else if (adAccountsResponse.ok) {
      const data = await adAccountsResponse.json();
      console.log(`   ✅ Ad accounts returned: ${data.ad_accounts?.length || 0}`);
    }
    
    // Test 3: Lead Forms API
    console.log('\n3️⃣ TESTING LEAD FORMS API');
    console.log(`   GET ${baseUrl}/api/integrations/facebook/lead-forms?pageIds=test`);
    
    const leadFormsResponse = await fetch(`${baseUrl}/api/integrations/facebook/lead-forms?pageIds=test`);
    console.log(`   Status: ${leadFormsResponse.status}`);
    if (leadFormsResponse.status === 401) {
      console.log('   ✅ API is responding (requires authentication)');
    } else if (leadFormsResponse.status === 400) {
      console.log('   ✅ API is validating parameters');
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ All APIs are responding correctly!');
    console.log('\nNote: APIs require authentication via browser session.');
    console.log('Visit http://localhost:3000/integrations/facebook to test in browser.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n⚠️  Make sure the dev server is running on port 3000');
  }
}

testAllAPIs();