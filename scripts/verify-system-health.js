#!/usr/bin/env node

const https = require('https');

async function checkEndpoint(url, expectedStatus = 200) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({
        url,
        status: res.statusCode,
        success: res.statusCode === expectedStatus
      });
    }).on('error', (err) => {
      resolve({
        url,
        status: 0,
        success: false,
        error: err.message
      });
    });
  });
}

async function verifySystemHealth() {
  console.log('🔍 VERIFYING SYSTEM HEALTH');
  console.log('==========================\n');

  const endpoints = [
    { url: 'https://login.gymleadhub.co.uk/api/health-check', name: 'Health Check' },
    { url: 'https://login.gymleadhub.co.uk/api/debug-env', name: 'Environment Check' },
    { url: 'https://login.gymleadhub.co.uk/owner-login', name: 'Owner Login Page', expectedStatus: 200 },
    { url: 'https://login.gymleadhub.co.uk/simple-login', name: 'Client Login Page', expectedStatus: 200 },
    { url: 'https://admin.gymleadhub.co.uk', name: 'Admin Portal', expectedStatus: 307 }, // Redirect expected
  ];

  console.log('Checking endpoints...\n');

  for (const endpoint of endpoints) {
    const result = await checkEndpoint(endpoint.url, endpoint.expectedStatus || 200);
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    console.log(`   Status: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  }

  console.log('==========================');
  console.log('📋 NEXT STEPS:\n');
  console.log('1. Run the database reset SQL in Supabase');
  console.log('2. Create an admin user account');
  console.log('3. Test login at https://login.gymleadhub.co.uk/owner-login');
  console.log('4. Check browser console for any errors');
  console.log('5. If you see 500 errors, run the emergency fix SQL');
}

verifySystemHealth();