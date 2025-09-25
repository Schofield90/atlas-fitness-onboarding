const fetch = require('node-fetch');

async function testOTPFlow() {
  const email = 'samschofield90@hotmail.co.uk';
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔍 Testing OTP flow for:', email);
  console.log('Using URL:', baseUrl);
  
  // Test sending OTP
  console.log('\n1️⃣ Sending OTP request...');
  
  try {
    const response = await fetch(`${baseUrl}/api/login-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send',
        email: email
      })
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error('❌ Failed to send OTP:', data.error);
      
      // Check what the actual error is
      if (response.status === 500) {
        console.log('\n⚠️  Server error detected. Possible causes:');
        console.log('  - Missing environment variables');
        console.log('  - Database connection issues');
        console.log('  - Import errors in the API route');
      }
    } else {
      console.log('✅ OTP sent successfully!');
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️  Cannot connect to localhost:3000');
      console.log('Make sure the dev server is running with: npm run dev');
    }
  }
}

testOTPFlow();