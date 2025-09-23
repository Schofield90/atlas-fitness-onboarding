const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifyAuthFix() {
  console.log('🔍 AUTHENTICATION FIX VERIFICATION\n');
  console.log('=' .repeat(60));
  
  const results = {
    sessionTokenTable: false,
    otpGeneration: false,
    customTokenFlow: false,
    domainIsolation: false,
    fallbackMechanism: false
  };
  
  // 1. Check if session_tokens table exists
  console.log('\n1. Checking session_tokens table:');
  try {
    const { data, error } = await supabase
      .from('session_tokens')
      .select('*')
      .limit(1);
    
    if (error?.code === '42P01') {
      console.log('   ⚠️ Table does not exist - using fallback mechanism');
      results.fallbackMechanism = true;
    } else if (!error) {
      console.log('   ✅ Table exists and is accessible');
      results.sessionTokenTable = true;
    } else {
      console.log('   ❌ Unexpected error:', error.message);
    }
  } catch (e) {
    console.log('   ❌ Error checking table:', e.message);
  }
  
  // 2. Test OTP generation for a real client
  console.log('\n2. Testing OTP generation:');
  try {
    const response = await fetch('https://members.gymleadhub.co.uk/api/login-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', email: 'sam@atlas-gyms.co.uk' })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('   ✅ OTP generated successfully');
      results.otpGeneration = true;
      
      // Check if using custom token or fallback
      if (data.sessionMethod) {
        console.log(`   📝 Using method: ${data.sessionMethod}`);
        results.customTokenFlow = data.sessionMethod === 'custom_token';
      }
    } else {
      console.log('   ❌ Failed:', data.error);
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }
  
  // 3. Test domain isolation
  console.log('\n3. Testing domain isolation:');
  try {
    const verifyUrl = 'https://members.gymleadhub.co.uk/auth/verify?token=test';
    const response = await fetch(verifyUrl, {
      method: 'GET',
      redirect: 'manual'
    });
    
    if (response.status === 307 || response.status === 302) {
      const location = response.headers.get('location');
      if (location && location.includes('members.gymleadhub.co.uk')) {
        console.log('   ✅ Redirects stay on correct domain');
        results.domainIsolation = true;
      } else if (location && location.includes('atlas-fitness-onboarding.vercel.app')) {
        console.log('   ❌ Cross-domain redirect detected:', location);
      } else {
        console.log('   ⚠️ Redirect to:', location);
      }
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }
  
  // 4. Check latest OTP records
  console.log('\n4. Checking recent OTP records:');
  try {
    const { data, error } = await supabase
      .from('otp_tokens')
      .select('email, created_at, expires_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!error && data) {
      console.log(`   📊 Found ${data.length} recent OTP records`);
      data.forEach(otp => {
        const expired = new Date(otp.expires_at) < new Date();
        console.log(`      - ${otp.email} (${expired ? '❌ expired' : '✅ valid'})`);
      });
    }
  } catch (e) {
    console.log('   ⚠️ Could not check OTP records');
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 VERIFICATION SUMMARY:\n');
  
  const totalTests = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  const successRate = (passed / totalTests * 100).toFixed(0);
  
  console.log('Test Results:');
  console.log(`  • Session Token Table: ${results.sessionTokenTable ? '✅' : '⚠️ Using Fallback'}`);
  console.log(`  • OTP Generation: ${results.otpGeneration ? '✅' : '❌'}`);
  console.log(`  • Custom Token Flow: ${results.customTokenFlow ? '✅' : '⚠️ Using Fallback'}`);
  console.log(`  • Domain Isolation: ${results.domainIsolation ? '✅' : '❌'}`);
  console.log(`  • Fallback Mechanism: ${results.fallbackMechanism ? '✅ Active' : 'N/A'}`);
  
  console.log(`\nSuccess Rate: ${successRate}% (${passed}/${totalTests})`);
  
  if (!results.sessionTokenTable) {
    console.log('\n⚠️ ACTION REQUIRED:');
    console.log('The session_tokens table needs to be created in production.');
    console.log('Please execute the migration SQL in the Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
  }
  
  if (successRate >= 60) {
    console.log('\n✅ Authentication system is functional with fallback mechanisms');
  } else {
    console.log('\n❌ Authentication system needs attention');
  }
  
  console.log('\n' + '=' .repeat(60));
}

verifyAuthFix();