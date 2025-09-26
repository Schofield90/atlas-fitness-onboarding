#!/usr/bin/env node

/**
 * Test Supabase Auth Configuration
 * Check if the issue is with auth setup or client configuration
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testDifferentConfigurations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('🔧 Testing Different Auth Configurations');
  console.log('=========================================\n');

  // Test 1: Basic client with minimal config
  console.log('1️⃣ Testing basic client configuration...');
  try {
    const client1 = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    const { data, error } = await client1.auth.getSession();
    console.log('   Basic client session check:', error ? `❌ ${error.message}` : '✅ Success');
  } catch (err) {
    console.log('   Basic client error:', err.message);
  }

  // Test 2: Service role client
  console.log('\n2️⃣ Testing service role client...');
  try {
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Try to get auth user count instead of listing users
    const { count, error } = await serviceClient
      .from('auth.users')
      .select('*', { count: 'exact', head: true });

    console.log('   Service client user count:', error ? `❌ ${error.message}` : `✅ ${count} users`);
  } catch (err) {
    console.log('   Service client error:', err.message);
  }

  // Test 3: Check project settings
  console.log('\n3️⃣ Testing project configuration...');
  try {
    const client3 = createClient(supabaseUrl, supabaseServiceKey);

    // Try to get project info
    const { data, error } = await client3
      .from('pg_database')
      .select('datname')
      .limit(1);

    console.log('   Database access:', error ? `❌ ${error.message}` : '✅ Can query database');

    // Check if auth is enabled
    const { data: authConfig, error: authError } = await client3
      .rpc('get_auth_config')
      .single();

    if (authError && authError.code === '42883') {
      console.log('   Auth status: ⚠️  Custom auth function not available (this is normal)');
    } else if (authError) {
      console.log('   Auth status:', authError.message);
    } else {
      console.log('   Auth status: ✅ Auth configuration accessible');
    }
  } catch (err) {
    console.log('   Project config error:', err.message);
  }

  // Test 4: Try password recovery instead of sign in
  console.log('\n4️⃣ Testing password recovery...');
  try {
    const client4 = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await client4.auth.resetPasswordForEmail(
      'sam@gymleadhub.co.uk',
      {
        redirectTo: 'https://admin.gymleadhub.co.uk/reset-password'
      }
    );

    console.log('   Password recovery:', error ? `❌ ${error.message}` : '✅ Recovery email sent');
  } catch (err) {
    console.log('   Password recovery error:', err.message);
  }

  // Test 5: Direct SQL query to auth.users
  console.log('\n5️⃣ Testing direct auth table access...');
  try {
    const client5 = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await client5
      .rpc('check_auth_user', { user_email: 'sam@gymleadhub.co.uk' });

    if (error && error.code === '42883') {
      console.log('   Direct auth access: Creating helper function needed...');

      // Try a simple select instead
      const { data: userData, error: userError } = await client5
        .from('auth.users')  // This might not work due to RLS
        .select('email, id')
        .eq('email', 'sam@gymleadhub.co.uk')
        .single();

      console.log('   Auth table query:', userError ? `❌ ${userError.message}` : `✅ Found user`);
    } else {
      console.log('   Direct auth access:', error ? `❌ ${error.message}` : '✅ Success');
    }
  } catch (err) {
    console.log('   Direct auth access error:', err.message);
  }

  console.log('\n📊 Auth Diagnosis Complete');
  console.log('===========================');
  console.log('If all tests show auth-related errors, the issue is likely:');
  console.log('1. Supabase Auth service is down for your project');
  console.log('2. Auth schema corruption in your database');
  console.log('3. Project-level auth configuration issue');
  console.log('4. Regional connectivity issues');
  console.log('\nNext steps:');
  console.log('- Check Supabase Dashboard > Authentication > Settings');
  console.log('- Verify your project is in a healthy state');
  console.log('- Contact Supabase support if auth service is completely broken');
}

testDifferentConfigurations().catch(console.error);