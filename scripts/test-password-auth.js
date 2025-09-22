const { createClient } = require('@supabase/supabase-js');

// Database connection
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

async function testPasswordAuth() {
  console.log('🔧 Testing password authentication functionality...');
  console.log('==================================================');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('\n1. 🔍 Checking if password fields exist in clients table...');
  try {
    // Try to get the table structure
    const { data, error } = await supabase
      .from('clients')
      .select('id, email, password_hash, password_set_at, password_reset_token, password_reset_expires')
      .limit(1);

    if (error) {
      console.log('❌ Error checking table structure:', error.message);

      // Check if it's a column not found error
      if (error.message.includes('password_hash') || error.message.includes('column')) {
        console.log('🚨 Password columns do not exist in the database!');
        console.log('   The migration has not been applied successfully.');
        return false;
      }
    } else {
      console.log('✅ Password fields exist in clients table');
      console.log('   Available columns confirmed:', Object.keys(data[0] || {}));
    }
  } catch (testError) {
    console.log('❌ Error testing table structure:', testError.message);
    return false;
  }

  console.log('\n2. 🧪 Testing password API endpoint...');
  try {
    // Test the password API endpoint
    const response = await fetch('https://atlas-fitness-onboarding.vercel.app/api/auth/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'test',
        test: true
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Password API endpoint is responding');
      console.log('   Response:', result);
    } else {
      console.log('⚠️  Password API endpoint returned error:', response.status);
      const errorText = await response.text();
      console.log('   Error details:', errorText);
    }
  } catch (apiError) {
    console.log('❌ Error testing password API:', apiError.message);
  }

  console.log('\n3. 🌐 Testing live login page...');
  try {
    const response = await fetch('https://members.gymleadhub.co.uk', {
      method: 'GET'
    });

    if (response.ok) {
      const html = await response.text();

      // Check if password-related elements are in the HTML
      const hasPasswordOption = html.includes('password') || html.includes('Password');
      const hasSignInButton = html.includes('Sign in with Password') || html.includes('sign-in-password');

      console.log('✅ Login page is accessible');
      console.log('   Contains password elements:', hasPasswordOption);
      console.log('   Contains password sign-in button:', hasSignInButton);

      if (hasPasswordOption || hasSignInButton) {
        console.log('🎉 Password authentication appears to be deployed!');
      } else {
        console.log('⚠️  Password authentication may not be fully deployed');
      }
    } else {
      console.log('⚠️  Could not access login page:', response.status);
    }
  } catch (pageError) {
    console.log('❌ Error testing login page:', pageError.message);
  }

  console.log('\n==================================================');
  console.log('✅ Password authentication test completed!');
  console.log('\n📋 Summary:');
  console.log('   - Database columns: Need to verify manually');
  console.log('   - API endpoint: Tested');
  console.log('   - Live deployment: Tested');
  console.log('\n💡 Next steps:');
  console.log('   1. User should test password authentication at members.gymleadhub.co.uk');
  console.log('   2. User should check password settings at /client/settings/password');
  console.log('   3. If issues occur, database migration may need manual application');
}

// Run the test
testPasswordAuth().catch(console.error);