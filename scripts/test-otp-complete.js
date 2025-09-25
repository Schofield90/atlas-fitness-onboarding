const fetch = require('node-fetch');

async function testCompleteOTPFlow() {
  const email = 'samschofield90@hotmail.co.uk';
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔍 Testing complete OTP flow for:', email);
  console.log('===============================================\n');
  
  // Step 1: Send OTP
  console.log('1️⃣ Sending OTP...');
  
  try {
    const sendResponse = await fetch(`${baseUrl}/api/login-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send',
        email: email
      })
    });
    
    const sendData = await sendResponse.json();
    
    if (!sendResponse.ok) {
      console.error('❌ Failed to send OTP:', sendData.error);
      return;
    }
    
    console.log('✅ OTP sent successfully!');
    
    // Step 2: Get OTP from database (for testing)
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    
    const { data: otpData } = await supabase
      .from('otp_tokens')
      .select('token')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!otpData || !otpData[0]) {
      console.error('❌ Could not find OTP in database');
      return;
    }
    
    const otpCode = otpData[0].token;
    console.log(`\n📧 OTP Code: ${otpCode}`);
    
    // Step 3: Verify OTP
    console.log('\n2️⃣ Verifying OTP...');
    
    const verifyResponse = await fetch(`${baseUrl}/api/login-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'verify',
        email: email,
        otp: otpCode
      })
    });
    
    const verifyData = await verifyResponse.json();
    console.log('Verify response status:', verifyResponse.status);
    console.log('Verify response:', JSON.stringify(verifyData, null, 2));
    
    if (!verifyResponse.ok) {
      console.error('❌ Failed to verify OTP:', verifyData.error);
      return;
    }
    
    console.log('✅ OTP verified successfully!');
    
    // Check what we got back
    if (verifyData.session) {
      console.log('\n🎫 Session tokens received:');
      console.log('  - Access token:', verifyData.session.access_token ? '✅ Present' : '❌ Missing');
      console.log('  - Refresh token:', verifyData.session.refresh_token ? '✅ Present' : '❌ Missing');
    }
    
    if (verifyData.redirectTo) {
      console.log('\n🔀 Redirect to:', verifyData.redirectTo);
    }
    
    if (verifyData.userRole) {
      console.log('👤 User role:', verifyData.userRole);
    }
    
    // Step 4: Test wrong OTP
    console.log('\n3️⃣ Testing wrong OTP (should fail)...');
    
    const wrongResponse = await fetch(`${baseUrl}/api/login-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'verify',
        email: email,
        otp: '000000'
      })
    });
    
    const wrongData = await wrongResponse.json();
    
    if (wrongResponse.ok) {
      console.error('⚠️  SECURITY ISSUE: Wrong OTP was accepted!');
    } else {
      console.log('✅ Wrong OTP correctly rejected:', wrongData.error);
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run with environment variables
require('dotenv').config({ path: '.env.local' });
testCompleteOTPFlow();