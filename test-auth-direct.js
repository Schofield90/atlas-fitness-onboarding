const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAuth() {
  const email = 'sam@atlas-gyms.co.uk';
  const password = '@Aa80236661';

  console.log('🔍 Testing authentication with:');
  console.log('Email:', email);
  console.log('Password:', password.replace(/./g, '*'));
  console.log('');

  try {
    // Try to authenticate as the user would
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error('❌ Auth error:', error.message);
      console.error('Full error:', error);
      return;
    }

    if (data.user) {
      console.log('✅ Authentication successful!');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);
      console.log('Session exists:', !!data.session);
    } else {
      console.log('❌ No user returned');
    }

  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

testAuth();