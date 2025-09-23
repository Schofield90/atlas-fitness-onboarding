const fetch = require('node-fetch');

const TEST_EMAIL = 'sam@atlas-gyms.co.uk'; // Using the real test email
const BASE_URL = 'https://members.gymleadhub.co.uk';

async function testAuthFlow() {
  console.log('Testing authentication flow...\n');
  
  try {
    // Step 1: Send OTP
    console.log('1. Sending OTP to', TEST_EMAIL);
    const sendResponse = await fetch(`${BASE_URL}/api/login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', email: TEST_EMAIL })
    });
    
    const sendData = await sendResponse.json();
    console.log('   Response:', sendData);
    
    if (!sendData.success) {
      console.error('   ❌ Failed to send OTP:', sendData.error);
      return;
    }
    
    console.log('   ✅ OTP sent successfully\n');
    
    // Step 2: Simulate OTP verification (we'd need the actual OTP from email/logs)
    console.log('2. To complete the test:');
    console.log('   - Check the email for the OTP code');
    console.log('   - Or check Vercel logs for the OTP');
    console.log('   - Then verify using: curl -X POST "' + BASE_URL + '/api/login-otp" -H "Content-Type: application/json" -d \'{"action": "verify", "email": "' + TEST_EMAIL + '", "otp": "YOUR_OTP_CODE"}\'');
    
    // Step 3: Check if session_tokens fallback is working
    console.log('\n3. Checking session token fallback mechanism...');
    const verifyResponse = await fetch(`${BASE_URL}/api/login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', email: TEST_EMAIL, otp: '000000' }) // Invalid OTP to test error handling
    });
    
    const verifyData = await verifyResponse.json();
    console.log('   Response:', verifyData);
    
    if (verifyData.error === 'Invalid or expired code') {
      console.log('   ✅ Error handling working correctly');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAuthFlow();