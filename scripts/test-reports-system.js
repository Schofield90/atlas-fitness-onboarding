#!/usr/bin/env node

/**
 * Test script to verify the reports system is working
 */

const https = require('https');

const BASE_URL = 'https://atlas-fitness-onboarding.vercel.app';

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

// List of endpoints to test
const endpoints = [
  { path: '/api/reports/meta', name: 'Reports Meta API' },
  { path: '/reports', name: 'Reports Hub Page' },
  { path: '/reports/attendances', name: 'Attendances Report' },
  { path: '/reports/invoices', name: 'Invoices Report' },
  { path: '/reports/invoice-items', name: 'Invoice Items Report' },
  { path: '/reports/upcoming-billing', name: 'Upcoming Billing' },
  { path: '/reports/pending', name: 'Pending Payments' },
  { path: '/reports/discount-codes', name: 'Discount Codes' },
  { path: '/reports/payouts', name: 'Payouts Report' }
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = BASE_URL + endpoint.path;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const status = res.statusCode;
        const isSuccess = status >= 200 && status < 400;
        
        resolve({
          name: endpoint.name,
          path: endpoint.path,
          status: status,
          success: isSuccess,
          contentLength: data.length
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

async function runTests() {
  console.log('🧪 Testing Reports System on Vercel\n');
  console.log('URL:', BASE_URL);
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const endpoint of endpoints) {
    process.stdout.write(`Testing ${endpoint.name}...`);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.success) {
      console.log(` ${colors.green}✓${colors.reset} (${result.status})`);
    } else {
      console.log(` ${colors.red}✗${colors.reset} (${result.status || 'Failed'})`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Results Summary\n');
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`${colors.green}✓ Passed:${colors.reset} ${successCount}/${results.length}`);
  console.log(`${colors.red}✗ Failed:${colors.reset} ${failCount}/${results.length}`);
  
  if (failCount > 0) {
    console.log('\n⚠️  Failed endpoints:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name} (${r.path})`);
    });
  }
  
  // Check if API is returning data
  const metaResult = results.find(r => r.path === '/api/reports/meta');
  if (metaResult && metaResult.success && metaResult.contentLength > 100) {
    console.log(`\n${colors.green}✓${colors.reset} API is returning data (${metaResult.contentLength} bytes)`);
  }
  
  console.log('\n' + '=' .repeat(60));
  
  if (successCount === results.length) {
    console.log(`${colors.green}🎉 All tests passed! The reports system is operational.${colors.reset}`);
  } else if (successCount > results.length / 2) {
    console.log(`${colors.yellow}⚠️  Partial success. Some endpoints need attention.${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Most tests failed. Check deployment and authentication.${colors.reset}`);
  }
}

// Run the tests
runTests().catch(console.error);