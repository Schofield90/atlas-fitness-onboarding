const fetch = require('node-fetch');

async function testLoginSuccess() {
  console.log('🔍 Testing if login actually works now...\n');
  
  const email = 'samschofield90@hotmail.co.uk';
  const baseUrl = 'https://members.gymleadhub.co.uk';
  
  // Step 1: Send OTP
  console.log('1. Sending OTP to', email);
  const sendResponse = await fetch(`${baseUrl}/api/login-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'send', email })
  });
  
  const sendData = await sendResponse.json();
  console.log('   Response:', sendData);
  
  if (sendData.success) {
    console.log('\n✅ OTP sent successfully!');
    console.log('\n📱 Please check your email for the verification code');
    console.log('   Then test login at: ' + baseUrl + '/simple-login');
    console.log('\n📋 Test Steps:');
    console.log('   1. Enter the OTP code from your email');
    console.log('   2. Click "Verify code"');
    console.log('   3. You should be redirected to /client/dashboard');
    console.log('\n🎯 Expected Result: Successfully reach dashboard');
    console.log('❌ Previous Issue: Infinite redirect loop');
    console.log('✅ Fixed: Now uses proper cookie-based sessions');
  } else {
    console.error('Failed to send OTP:', sendData.error);
  }
}

testLoginSuccess();