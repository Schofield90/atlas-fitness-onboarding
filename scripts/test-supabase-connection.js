const https = require('https');

console.log('Testing Supabase connectivity...\n');

// Test 1: Check if Supabase API is accessible
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';

https.get(`${supabaseUrl}/rest/v1/`, (res) => {
  console.log(`1. Supabase API Status: ${res.statusCode}`);
  if (res.statusCode === 200 || res.statusCode === 401) {
    console.log('   ✅ Supabase API is reachable');
  } else {
    console.log('   ❌ Unexpected status code');
  }
}).on('error', (err) => {
  console.log('   ❌ Cannot reach Supabase API:', err.message);
});

// Test 2: Check with fetch
fetch('https://lzlrojoaxrqvmhempnkn.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'
  }
})
.then(res => {
  console.log(`\n2. Direct API call status: ${res.status}`);
  if (res.status === 200) {
    console.log('   ✅ Can authenticate with Supabase');
  } else {
    console.log('   ⚠️  Authentication may have issues');
  }
  return res.text();
})
.then(text => {
  console.log(`   Response length: ${text.length} bytes`);
})
.catch(err => {
  console.log('   ❌ Direct API call failed:', err.message);
});

// Test 3: Check production site
setTimeout(() => {
  console.log('\n3. Testing production site...');
  https.get('https://atlas-fitness-onboarding.vercel.app', (res) => {
    console.log(`   Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log('   ✅ Production site is responding');
    } else if (res.statusCode === 500) {
      console.log('   ❌ Server error on production');
    } else if (res.statusCode === 503) {
      console.log('   ❌ Service unavailable');
    } else {
      console.log(`   ⚠️  Unexpected status: ${res.statusCode}`);
    }

    // Check headers
    console.log('   Headers:', {
      'content-type': res.headers['content-type'],
      'server': res.headers['server'],
      'x-vercel-id': res.headers['x-vercel-id']
    });
  }).on('error', (err) => {
    console.log('   ❌ Cannot reach production site:', err.message);
  });
}, 1000);

// Test 4: Check Vercel status page
setTimeout(() => {
  console.log('\n4. Checking Vercel status...');
  https.get('https://www.vercel-status.com/api/v2/status.json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const status = JSON.parse(data);
        console.log(`   Vercel Status: ${status.status.description}`);
        if (status.status.indicator === 'none') {
          console.log('   ✅ Vercel services operational');
        } else {
          console.log('   ⚠️  Vercel may have issues');
        }
      } catch (e) {
        console.log('   Could not parse status');
      }
    });
  }).on('error', (err) => {
    console.log('   Could not check Vercel status');
  });
}, 2000);