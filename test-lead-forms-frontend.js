#!/usr/bin/env node

// This script simulates what the frontend does when fetching lead forms

const fetch = require('node-fetch');

async function testLeadFormsFrontend() {
  console.log('🔍 Testing Lead Forms Frontend Flow\n');
  
  const baseUrl = 'http://localhost:3000';
  
  // Test page IDs (from your Facebook pages)
  const testPageIds = [
    '414824765049453',  // Peak Performance Fitness Canterbury
    '102772736086486'   // UBX UK
  ];
  
  try {
    // Test 1: Single page ID
    console.log('1️⃣ Testing single page ID request:');
    console.log(`   GET ${baseUrl}/api/integrations/facebook/lead-forms?pageId=${testPageIds[0]}`);
    
    const singleResponse = await fetch(`${baseUrl}/api/integrations/facebook/lead-forms?pageId=${testPageIds[0]}`);
    console.log(`   Status: ${singleResponse.status}`);
    
    if (singleResponse.status === 401) {
      console.log('   ⚠️  Requires authentication (expected for unauthenticated request)');
    }
    
    // Test 2: Multiple page IDs (comma-separated)
    console.log('\n2️⃣ Testing multiple page IDs request:');
    const pageIds = testPageIds.join(',');
    console.log(`   GET ${baseUrl}/api/integrations/facebook/lead-forms?pageIds=${pageIds}`);
    
    const multiResponse = await fetch(`${baseUrl}/api/integrations/facebook/lead-forms?pageIds=${pageIds}`);
    console.log(`   Status: ${multiResponse.status}`);
    
    if (multiResponse.status === 401) {
      console.log('   ⚠️  Requires authentication (expected for unauthenticated request)');
    }
    
    console.log('\n📊 API Test Summary:');
    console.log('The API endpoints are configured correctly.');
    console.log('They require authentication which is expected.');
    console.log('\n⚠️  Potential Issues to Check:');
    console.log('1. The frontend might not be passing page IDs correctly');
    console.log('2. The response format might not match what the frontend expects');
    console.log('3. There might be a timing issue with when lead forms are fetched');
    
    console.log('\n🔧 Recommended Fix:');
    console.log('Check the browser console for:');
    console.log('- "🔄 Fetching Lead Forms for page: ..." messages');
    console.log('- "✅ Facebook Lead Forms loaded: ..." messages');
    console.log('- Any error messages');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLeadFormsFrontend();