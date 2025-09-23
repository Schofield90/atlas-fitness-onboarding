const fetch = require('node-fetch');

async function testDomainIsolation() {
  console.log('Testing domain isolation in authentication flow...\n');
  
  const domains = [
    'https://members.gymleadhub.co.uk',
    'https://atlas-fitness-onboarding.vercel.app'
  ];
  
  for (const domain of domains) {
    console.log(`\nTesting ${domain}:`);
    console.log('=' .repeat(50));
    
    try {
      // Test if login endpoint is accessible
      const response = await fetch(`${domain}/api/login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email: 'test@invalid.com' }),
        redirect: 'manual' // Don't follow redirects
      });
      
      console.log(`Status: ${response.status}`);
      console.log(`Headers:`, {
        location: response.headers.get('location'),
        'set-cookie': response.headers.get('set-cookie') ? 'Present' : 'None'
      });
      
      if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
        console.log(`⚠️ Redirect detected to: ${response.headers.get('location')}`);
      }
      
      const data = await response.json();
      console.log('Response:', data);
      
      // Check if verify endpoint would redirect
      console.log('\nTesting verify endpoint:');
      const verifyUrl = `${domain}/auth/verify?token=test-token`;
      const verifyResponse = await fetch(verifyUrl, {
        method: 'GET',
        redirect: 'manual'
      });
      
      console.log(`Verify endpoint status: ${verifyResponse.status}`);
      if (verifyResponse.status === 301 || verifyResponse.status === 302 || verifyResponse.status === 307 || verifyResponse.status === 308) {
        const redirectTo = verifyResponse.headers.get('location');
        console.log(`Redirect to: ${redirectTo}`);
        
        // Check if redirect stays on same domain
        if (redirectTo) {
          const redirectUrl = new URL(redirectTo, domain);
          const originalDomain = new URL(domain).hostname;
          const redirectDomain = redirectUrl.hostname;
          
          if (originalDomain === redirectDomain) {
            console.log(`✅ Redirect stays on same domain: ${redirectDomain}`);
          } else {
            console.log(`❌ Cross-domain redirect detected: ${originalDomain} -> ${redirectDomain}`);
          }
        }
      }
      
    } catch (error) {
      console.error(`Error testing ${domain}:`, error.message);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('Domain Isolation Test Complete');
  console.log('\nSummary:');
  console.log('- The authentication flow should keep users on their original domain');
  console.log('- members.gymleadhub.co.uk should NOT redirect to atlas-fitness-onboarding.vercel.app');
  console.log('- Custom session tokens are used to maintain domain isolation');
}

testDomainIsolation();