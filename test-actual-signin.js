#!/usr/bin/env node

/**
 * Test Actual Sign-In Flow
 * Simulate exactly what your app does
 */

const { createBrowserClient } = require('@supabase/ssr');
require('dotenv').config({ path: '.env.local' });

async function testActualSignIn() {
  console.log('🔧 Testing Actual Sign-In Flow');
  console.log('===============================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  console.log('1️⃣ Environment check:');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key starts with: ${supabaseAnonKey?.substring(0, 20)}...`);

  // Mock localStorage for Node.js
  const mockStorage = {
    data: new Map(),
    getItem: (key) => mockStorage.data.get(key) || null,
    setItem: (key, value) => mockStorage.data.set(key, value),
    removeItem: (key) => mockStorage.data.delete(key),
  };

  // Mock window for Node.js
  global.window = {
    localStorage: mockStorage
  };

  console.log('\n2️⃣ Creating browser client (simulated):');
  try {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false, // Disable for testing
        persistSession: false,   // Disable for testing
        detectSessionInUrl: false, // Disable for testing
        flowType: 'implicit', // Use simpler flow for testing
        storage: mockStorage,
      },
    });

    console.log('   ✅ Client created successfully');

    console.log('\n3️⃣ Testing sign in with password:');
    const { data, error } = await client.auth.signInWithPassword({
      email: 'sam@gymleadhub.co.uk',
      password: '@Aa80236661'
    });

    if (error) {
      console.log(`   ❌ Sign in failed: ${error.message}`);
      console.log(`   Error code: ${error.status || 'unknown'}`);
      console.log(`   Full error:`, JSON.stringify(error, null, 2));
    } else {
      console.log('   ✅ Sign in successful!');
      console.log(`   User ID: ${data.user?.id}`);
      console.log(`   Email: ${data.user?.email}`);
      console.log(`   Email confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}`);

      // Test admin check
      console.log('\n4️⃣ Testing admin access check:');
      const { data: adminData, error: adminError } = await client
        .from('super_admin_users')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .single();

      if (adminError) {
        console.log(`   ❌ Admin check failed: ${adminError.message}`);
      } else {
        console.log('   ✅ Admin access confirmed');
        console.log(`   Role: ${adminData.role}`);
        console.log(`   Permissions: ${JSON.stringify(adminData.permissions)}`);
      }
    }

  } catch (err) {
    console.log(`   ❌ Client creation failed: ${err.message}`);
  }

  // Test 2: Try with regular supabase-js client
  console.log('\n5️⃣ Testing with regular supabase-js client:');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const regularClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    const { data, error } = await regularClient.auth.signInWithPassword({
      email: 'sam@gymleadhub.co.uk',
      password: '@Aa80236661'
    });

    if (error) {
      console.log(`   ❌ Regular client sign in failed: ${error.message}`);
      console.log(`   Status: ${error.status}`);
    } else {
      console.log('   ✅ Regular client sign in successful!');
    }

  } catch (err) {
    console.log(`   ❌ Regular client error: ${err.message}`);
  }

  // Clean up mock
  delete global.window;
}

testActualSignIn().catch(console.error);