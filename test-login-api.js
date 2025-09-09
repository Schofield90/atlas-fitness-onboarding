#!/usr/bin/env node

// Test script to verify the login-otp API handles existing users correctly

async function testLoginAPI() {
  const baseUrl = 'https://atlas-fitness-onboarding.vercel.app';
  const testEmail = 'sam@atlas-gyms.co.uk';
  
  console.log('Testing OTP login API...');
  console.log('Email:', testEmail);
  console.log('');
  
  try {
    // Step 1: Send OTP
    console.log('Step 1: Sending OTP...');
    const sendResponse = await fetch(`${baseUrl}/api/login-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send',
        email: testEmail,
      }),
    });
    
    const sendData = await sendResponse.json();
    
    if (!sendResponse.ok) {
      console.error('❌ Failed to send OTP:', sendResponse.status);
      console.error('Error:', sendData.error);
      if (sendData.details) {
        console.error('Details:', sendData.details);
      }
      process.exit(1);
    }
    
    console.log('✅ OTP sent successfully!');
    console.log('Response:', JSON.stringify(sendData, null, 2));
    
    // In test mode, the OTP might be returned
    if (sendData.testModeOTP) {
      console.log('');
      console.log('Test Mode OTP:', sendData.testModeOTP);
      console.log('');
      
      // Step 2: Verify OTP (optional in test)
      console.log('Step 2: Verifying OTP...');
      const verifyResponse = await fetch(`${baseUrl}/api/login-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify',
          email: testEmail,
          otp: sendData.testModeOTP,
        }),
      });
      
      const verifyData = await verifyResponse.json();
      
      if (!verifyResponse.ok) {
        console.error('❌ Failed to verify OTP:', verifyResponse.status);
        console.error('Error:', verifyData.error);
        process.exit(1);
      }
      
      console.log('✅ OTP verified successfully!');
      console.log('Response:', JSON.stringify(verifyData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testLoginAPI();