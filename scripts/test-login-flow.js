const fetch = require('node-fetch');

async function testLoginFlow() {
  console.log('🔧 Testing Complete Login Flow\n');
  console.log('=' .repeat(60));
  
  const email = 'sam@atlas-gyms.co.uk';
  const baseUrl = 'https://members.gymleadhub.co.uk';
  
  try {
    // Step 1: Send OTP
    console.log('1. Sending OTP to', email);
    const sendResponse = await fetch(`${baseUrl}/api/login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', email })
    });
    
    const sendData = await sendResponse.json();
    console.log('   Response:', sendData);
    
    if (!sendData.success) {
      console.error('   ❌ Failed to send OTP');
      return;
    }
    
    console.log('   ✅ OTP sent successfully\n');
    
    // Step 2: Check cookie handling
    console.log('2. Testing cookie domain:');
    const testResponse = await fetch(`${baseUrl}/auth/verify?token=test-invalid`, {
      method: 'GET',
      redirect: 'manual'
    });
    
    const cookies = testResponse.headers.get('set-cookie');
    if (cookies) {
      console.log('   Cookies present:', cookies.includes('sb-') ? '✅' : '❌');
      console.log('   Domain correct:', !cookies.includes('vercel.app') ? '✅' : '❌');
    } else {
      console.log('   No cookies set on invalid token (expected)');
    }
    
    // Step 3: Check redirect behavior
    console.log('\n3. Testing redirect behavior:');
    const redirectLocation = testResponse.headers.get('location');
    if (redirectLocation) {
      const redirectUrl = new URL(redirectLocation, baseUrl);
      console.log('   Redirect to:', redirectLocation);
      console.log('   Stays on domain:', redirectUrl.hostname === 'members.gymleadhub.co.uk' ? '✅' : '❌');
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📝 NEXT STEPS:');
    console.log('1. Check your email for the OTP code');
    console.log('2. Try logging in on mobile at: ' + baseUrl + '/simple-login');
    console.log('3. Verify you reach /client/dashboard after login');
    console.log('\n✅ Authentication system is ready for testing!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testLoginFlow();