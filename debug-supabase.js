#!/usr/bin/env node

/**
 * Debug Supabase Connection Script
 * Tests Supabase connectivity and auth functionality
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Debugging Supabase Connection');
console.log('=================================\n');

// Validate environment variables
console.log('1️⃣ Environment Variables:');
console.log(`   URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`   Anon Key: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
console.log(`   Service Key: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('\n❌ Missing required environment variables');
  process.exit(1);
}

async function testSupabaseConnection() {
  console.log('\n2️⃣ Testing Basic Connection:');

  try {
    // Create client with anon key
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Test basic connectivity
    const { data, error } = await supabase
      .from('super_admin_users')
      .select('count(*)')
      .limit(1);

    if (error) {
      console.log('   ❌ Connection failed:', error.message);
      return false;
    } else {
      console.log('   ✅ Basic connection successful');
      return true;
    }
  } catch (err) {
    console.log('   ❌ Connection error:', err.message);
    return false;
  }
}

async function testAuthService() {
  console.log('\n3️⃣ Testing Auth Service:');

  try {
    // Create client with service key for admin functions
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Test auth service by listing users
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.log('   ❌ Auth service error:', error.message);
      console.log('   Details:', JSON.stringify(error, null, 2));
      return false;
    } else {
      console.log(`   ✅ Auth service working - Found ${users.users.length} users`);

      // Look for your admin user
      const adminUser = users.users.find(u => u.email === 'sam@gymleadhub.co.uk');
      if (adminUser) {
        console.log(`   ✅ Found admin user: ${adminUser.email}`);
        console.log(`   📧 Email confirmed: ${adminUser.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   🕒 Last sign in: ${adminUser.last_sign_in_at || 'Never'}`);
      } else {
        console.log('   ⚠️  Admin user sam@gymleadhub.co.uk not found in auth.users');
      }

      return true;
    }
  } catch (err) {
    console.log('   ❌ Auth service error:', err.message);
    return false;
  }
}

async function testAdminTable() {
  console.log('\n4️⃣ Testing Admin Table:');

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: adminUsers, error } = await supabase
      .from('super_admin_users')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.log('   ❌ Admin table error:', error.message);
      return false;
    } else {
      console.log(`   ✅ Found ${adminUsers.length} active admin users`);

      adminUsers.forEach(admin => {
        console.log(`   👤 ${admin.email || admin.user_id} - Role: ${admin.role}`);
      });

      return true;
    }
  } catch (err) {
    console.log('   ❌ Admin table error:', err.message);
    return false;
  }
}

async function testSignIn() {
  console.log('\n5️⃣ Testing Sign In:');

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Attempt sign in with the credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'sam@gymleadhub.co.uk',
      password: '@Aa80236661'
    });

    if (error) {
      console.log('   ❌ Sign in failed:', error.message);
      console.log('   Error details:', JSON.stringify(error, null, 2));
      return false;
    } else {
      console.log('   ✅ Sign in successful');
      console.log(`   🆔 User ID: ${data.user?.id}`);
      console.log(`   📧 Email: ${data.user?.email}`);
      return true;
    }
  } catch (err) {
    console.log('   ❌ Sign in error:', err.message);
    return false;
  }
}

async function runDiagnostics() {
  const connectionOk = await testSupabaseConnection();
  const authOk = await testAuthService();
  const adminTableOk = await testAdminTable();
  const signInOk = await testSignIn();

  console.log('\n📊 Diagnostic Summary:');
  console.log('====================');
  console.log(`Basic Connection: ${connectionOk ? '✅' : '❌'}`);
  console.log(`Auth Service: ${authOk ? '✅' : '❌'}`);
  console.log(`Admin Table: ${adminTableOk ? '✅' : '❌'}`);
  console.log(`Sign In Test: ${signInOk ? '✅' : '❌'}`);

  if (connectionOk && authOk && adminTableOk && signInOk) {
    console.log('\n🎉 All tests passed! Supabase is working correctly.');
    console.log('The issue might be in your application code or browser.');
  } else {
    console.log('\n🔍 Issues found. Check the errors above for debugging.');
  }
}

// Run diagnostics
runDiagnostics().catch(console.error);