import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogin() {
  console.log('Testing login for test2@test.co.uk...\n');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test2@test.co.uk',
    password: 'Test123'
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Status:', error.status);
  } else {
    console.log('✅ Login successful!');
    console.log('User:', data.user.email);
    console.log('Session expires:', new Date(data.session.expires_at * 1000).toLocaleString());
  }
}

testLogin();
