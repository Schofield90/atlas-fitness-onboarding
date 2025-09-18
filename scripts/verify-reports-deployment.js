#!/usr/bin/env node

/**
 * Verify reports system deployment
 */

const https = require('https');

// Test configuration
const BASE_URL = 'https://atlas-fitness-onboarding.vercel.app';
const AUTH_COOKIE = process.env.AUTH_COOKIE || '';

const endpoints = [
  { path: '/reports', name: 'Reports Hub', requiresAuth: true },
  { path: '/api/reports/meta', name: 'Reports Meta API', requiresAuth: true },
  { path: '/reports/attendances', name: 'Attendances Report', requiresAuth: true },
  { path: '/reports/invoices', name: 'Invoices Report', requiresAuth: true },
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      headers: {}
    };
    
    if (AUTH_COOKIE && endpoint.requiresAuth) {
      options.headers['Cookie'] = AUTH_COOKIE;
    }
    
    const url = BASE_URL + endpoint.path;
    
    https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const status = res.statusCode;
        const isSuccess = status >= 200 && status < 400;
        const isRedirect = status >= 300 && status < 400;
        
        resolve({
          name: endpoint.name,
          path: endpoint.path,
          status: status,
          success: isSuccess,
          isRedirect: isRedirect,
          requiresAuth: endpoint.requiresAuth,
          location: res.headers.location
        });
      });
    }).on('error', (err) => {
      resolve({
        name: endpoint.name,
        path: endpoint.path,
        status: 0,
        success: false,
        error: err.message
      });
    });
  });
}

async function main() {
  console.log('🔍 Verifying Reports System Deployment\n');
  console.log('Base URL:', BASE_URL);
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const endpoint of endpoints) {
    process.stdout.write(`Testing ${endpoint.name}...`);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.success && !result.isRedirect) {
      console.log(` ✅ Success (${result.status})`);
    } else if (result.isRedirect) {
      console.log(` 🔀 Redirect (${result.status} → ${result.location || 'unknown'})`);
      if (result.requiresAuth && result.location?.includes('/signin')) {
        console.log('     ℹ️  Requires authentication');
      }
    } else {
      console.log(` ❌ Failed (${result.status || 'Error'})`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Deployment Status\n');
  
  const authRedirects = results.filter(r => 
    r.isRedirect && r.location?.includes('/signin')
  ).length;
  
  const errors = results.filter(r => !r.success && !r.isRedirect).length;
  
  if (errors > 0) {
    console.log('❌ Deployment has errors');
    console.log('   Failed endpoints:', errors);
  } else if (authRedirects === results.length) {
    console.log('✅ Deployment successful');
    console.log('   All endpoints require authentication (as expected)');
    console.log('\n📝 Next Steps:');
    console.log('   1. Sign in at', BASE_URL + '/signin');
    console.log('   2. Navigate to', BASE_URL + '/reports');
    console.log('   3. Test each report manually');
  } else {
    console.log('⚠️  Mixed results');
    console.log('   Some endpoints may have issues');
  }
  
  console.log('\n🔗 Direct Links (sign in first):');
  console.log('   Reports Hub:', BASE_URL + '/reports');
  console.log('   Attendances:', BASE_URL + '/reports/attendances');
  console.log('   Invoices:', BASE_URL + '/reports/invoices');
  console.log('   Invoice Items:', BASE_URL + '/reports/invoice-items');
  console.log('   Upcoming Billing:', BASE_URL + '/reports/upcoming-billing');
  console.log('   Pending Payments:', BASE_URL + '/reports/pending');
  console.log('   Discount Codes:', BASE_URL + '/reports/discount-codes');
  console.log('   Payouts:', BASE_URL + '/reports/payouts');
}

main().catch(console.error);