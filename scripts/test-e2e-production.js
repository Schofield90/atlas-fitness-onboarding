#!/usr/bin/env node

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Production configuration
const PRODUCTION_URL = 'https://members.gymleadhub.co.uk';
const TEST_EMAIL = 'samschofield90@hotmail.co.uk';
const OWNER_EMAIL = 'sam@atlas-gyms.co.uk';
const INVALID_EMAIL = 'nonexistent@example.com';

// Supabase client
const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;

// Helper function to log test results
function logTest(testName, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  if (message) console.log(`   ${message}`);
  if (passed) testsPassed++;
  else testsFailed++;
}

// Helper to make API calls
async function callAPI(action, email, otp = null) {
  const body = { action, email };
  if (otp) body.otp = otp;
  
  const response = await fetch(`${PRODUCTION_URL}/api/login-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  return {
    status: response.status,
    data: await response.json()
  };
}

// Get OTP from database
async function getOTPFromDatabase(email) {
  const { data } = await supabase
    .from('otp_tokens')
    .select('token')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1);
  
  return data?.[0]?.token;
}

// Main test suite
async function runTests() {
  console.log('🔍 E2E Production Tests for members.gymleadhub.co.uk');
  console.log('=====================================================\n');
  
  try {
    // Test 1: Send OTP to valid member email
    console.log('Test 1: Send OTP to valid member');
    console.log('---------------------------------');
    const sendResult = await callAPI('send', TEST_EMAIL);
    logTest(
      'OTP send to samschofield90@hotmail.co.uk',
      sendResult.status === 200 && sendResult.data.success === true,
      sendResult.data.message || sendResult.data.error
    );
    
    // Wait a moment for database write
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Verify OTP exists in database
    console.log('\nTest 2: Verify OTP in database');
    console.log('-------------------------------');
    const otpCode = await getOTPFromDatabase(TEST_EMAIL);
    logTest(
      'OTP stored in database',
      !!otpCode,
      otpCode ? `OTP: ${otpCode}` : 'No OTP found'
    );
    
    // Test 3: Verify OTP with correct code
    console.log('\nTest 3: Verify with correct OTP');
    console.log('--------------------------------');
    if (otpCode) {
      const verifyResult = await callAPI('verify', TEST_EMAIL, otpCode);
      logTest(
        'OTP verification with correct code',
        verifyResult.status === 200 && verifyResult.data.success === true,
        verifyResult.data.error || 'Verification successful'
      );
      
      // Check session tokens
      logTest(
        'Session tokens received',
        !!verifyResult.data.session?.access_token && !!verifyResult.data.session?.refresh_token,
        verifyResult.data.session ? 'Tokens present' : 'No session data'
      );
      
      // Check redirect
      logTest(
        'Correct redirect path',
        verifyResult.data.redirectTo === '/client/dashboard',
        `Redirect to: ${verifyResult.data.redirectTo}`
      );
      
      // Check user role
      logTest(
        'Correct user role',
        verifyResult.data.userRole === 'member',
        `Role: ${verifyResult.data.userRole}`
      );
    }
    
    // Test 4: Verify OTP with wrong code
    console.log('\nTest 4: Security - Wrong OTP');
    console.log('-----------------------------');
    const wrongOTPResult = await callAPI('verify', TEST_EMAIL, '000000');
    logTest(
      'Wrong OTP rejected',
      wrongOTPResult.status === 400 && wrongOTPResult.data.success === false,
      wrongOTPResult.data.error || 'Incorrectly accepted'
    );
    
    // Test 5: Test invalid email
    console.log('\nTest 5: Security - Invalid email');
    console.log('---------------------------------');
    const invalidResult = await callAPI('send', INVALID_EMAIL);
    logTest(
      'Invalid email rejected',
      invalidResult.status === 404 && invalidResult.data.success === false,
      invalidResult.data.error || 'Incorrectly accepted'
    );
    
    // Test 6: Test gym owner blocking
    console.log('\nTest 6: Portal Separation - Gym owner');
    console.log('--------------------------------------');
    const ownerResult = await callAPI('send', OWNER_EMAIL);
    logTest(
      'Gym owner blocked from members portal',
      ownerResult.status === 403 && 
      (ownerResult.data.error?.includes('gym owner') || ownerResult.data.error?.includes('login.gymleadhub.co.uk')),
      ownerResult.data.error || 'Owner not properly blocked'
    );
    
    // Test 7: Test expired OTP
    console.log('\nTest 7: Security - Expired OTP');
    console.log('-------------------------------');
    // Create an expired OTP
    await supabase
      .from('otp_tokens')
      .delete()
      .eq('email', TEST_EMAIL);
    
    const expiredOTP = '123456';
    await supabase
      .from('otp_tokens')
      .insert({
        email: TEST_EMAIL,
        token: expiredOTP,
        expires_at: new Date(Date.now() - 60000).toISOString() // Expired 1 minute ago
      });
    
    const expiredResult = await callAPI('verify', TEST_EMAIL, expiredOTP);
    logTest(
      'Expired OTP rejected',
      expiredResult.status === 400 && expiredResult.data.success === false,
      expiredResult.data.error || 'Expired OTP incorrectly accepted'
    );
    
    // Clean up
    await supabase
      .from('otp_tokens')
      .delete()
      .eq('email', TEST_EMAIL);
    
    // Test 8: Test rate limiting
    console.log('\nTest 8: Security - Rate limiting');
    console.log('---------------------------------');
    console.log('Note: Rate limiting may be pre-triggered from earlier tests');
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${testsPassed + testsFailed}`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
    
    if (testsFailed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Production login is working correctly.');
    } else {
      console.log(`\n⚠️  ${testsFailed} test(s) failed. Review the issues above.`);
    }
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();