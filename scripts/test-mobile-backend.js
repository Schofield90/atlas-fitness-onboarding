#!/usr/bin/env node

// Test script for mobile backend API
const https = require('https');

// Configuration - Update these values
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
const TEST_ORG_SLUG = 'atlas-london';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Helper function to make requests
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/functions/v1/mobile-api${path}`);
    
    const reqOptions = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test functions
async function testOrgEndpoint() {
  console.log(`${colors.blue}Testing Organization Endpoint...${colors.reset}`);
  
  try {
    const result = await makeRequest(`/org/by-slug?slug=${TEST_ORG_SLUG}`);
    
    if (result.status === 200 && result.data.org_id) {
      console.log(`${colors.green}✓ Organization endpoint working${colors.reset}`);
      console.log(`  Organization: ${result.data.name}`);
      console.log(`  Theme: ${JSON.stringify(result.data.theme)}`);
      return result.data.org_id;
    } else {
      console.log(`${colors.red}✗ Organization endpoint failed${colors.reset}`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Response: ${JSON.stringify(result.data)}`);
      return null;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Organization endpoint error: ${error.message}${colors.reset}`);
    return null;
  }
}

async function testAuthenticatedEndpoint(orgId) {
  console.log(`\n${colors.blue}Testing Authenticated Endpoint...${colors.reset}`);
  console.log(`${colors.yellow}Note: This will fail without a valid user JWT token${colors.reset}`);
  
  try {
    const result = await makeRequest('/me', {
      headers: {
        'X-Organization-Id': orgId
      }
    });
    
    if (result.status === 401) {
      console.log(`${colors.green}✓ Authentication working correctly (401 for anonymous)${colors.reset}`);
    } else {
      console.log(`  Status: ${result.status}`);
      console.log(`  Response: ${JSON.stringify(result.data)}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Authenticated endpoint error: ${error.message}${colors.reset}`);
  }
}

async function testScheduleEndpoint(orgId) {
  console.log(`\n${colors.blue}Testing Schedule Endpoint...${colors.reset}`);
  
  const from = new Date().toISOString();
  const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  try {
    const result = await makeRequest(`/schedule?from=${from}&to=${to}`, {
      headers: {
        'X-Organization-Id': orgId
      }
    });
    
    if (result.status === 200) {
      console.log(`${colors.green}✓ Schedule endpoint working${colors.reset}`);
      console.log(`  Sessions found: ${Array.isArray(result.data) ? result.data.length : 0}`);
    } else {
      console.log(`${colors.red}✗ Schedule endpoint failed${colors.reset}`);
      console.log(`  Status: ${result.status}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Schedule endpoint error: ${error.message}${colors.reset}`);
  }
}

async function testEdgeFunctions() {
  console.log(`\n${colors.blue}Testing Edge Functions Deployment...${colors.reset}`);
  
  const functions = ['mobile-api', 'send-push-notification', 'qr-check-in', 'mobile-stripe-checkout'];
  
  for (const func of functions) {
    try {
      const url = new URL(`${SUPABASE_URL}/functions/v1/${func}`);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      };
      
      const result = await new Promise((resolve) => {
        const req = https.request(options, (res) => {
          resolve({ status: res.statusCode });
        });
        req.on('error', () => resolve({ status: 0 }));
        req.end();
      });
      
      if (result.status === 200) {
        console.log(`${colors.green}✓ ${func} deployed${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ ${func} not found${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ ${func} error: ${error.message}${colors.reset}`);
    }
  }
}

// Main test runner
async function runTests() {
  console.log(`${colors.blue}==================================${colors.reset}`);
  console.log(`${colors.blue}Mobile Backend API Test Suite${colors.reset}`);
  console.log(`${colors.blue}==================================${colors.reset}`);
  console.log(`\nSupabase URL: ${SUPABASE_URL}`);
  console.log(`Testing with org slug: ${TEST_ORG_SLUG}\n`);
  
  // Test 1: Organization endpoint
  const orgId = await testOrgEndpoint();
  
  if (!orgId) {
    console.log(`\n${colors.red}Cannot continue tests without valid organization${colors.reset}`);
    console.log(`\n${colors.yellow}Make sure to:${colors.reset}`);
    console.log('1. Update SUPABASE_URL and SUPABASE_ANON_KEY in this script');
    console.log('2. Run the database migrations');
    console.log('3. Deploy the edge functions');
    console.log('4. Create a test organization with slug "atlas-london"');
    return;
  }
  
  // Test 2: Authenticated endpoint
  await testAuthenticatedEndpoint(orgId);
  
  // Test 3: Schedule endpoint
  await testScheduleEndpoint(orgId);
  
  // Test 4: Edge functions
  await testEdgeFunctions();
  
  console.log(`\n${colors.blue}==================================${colors.reset}`);
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log(`${colors.blue}==================================${colors.reset}`);
  console.log(`\n${colors.green}Basic connectivity is working!${colors.reset}`);
  console.log(`\n${colors.yellow}Next steps:${colors.reset}`);
  console.log('1. Create a test user account');
  console.log('2. Get a valid JWT token');
  console.log('3. Test authenticated endpoints with the token');
  console.log('4. Configure push notifications');
  console.log('5. Set up Stripe for payments\n');
}

// Run tests
runTests().catch(console.error);