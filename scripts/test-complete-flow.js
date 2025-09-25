#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function testCompleteFlow() {
  console.log('🧪 TESTING COMPLETE AUTHENTICATION FLOW');
  console.log('=======================================\n');

  // Test 1: Check database state
  console.log('1️⃣ CHECKING DATABASE STATE');
  console.log('---------------------------');

  try {
    const { data: orgs, error: orgError } = await supabaseService
      .from('organizations')
      .select('count');

    const { data: clients, error: clientError } = await supabaseService
      .from('clients')
      .select('count');

    const { data: admins, error: adminError } = await supabaseService
      .from('super_admin_users')
      .select('*')
      .eq('is_active', true);

    console.log(`   Organizations: ${orgs?.[0]?.count || 0}`);
    console.log(`   Clients: ${clients?.[0]?.count || 0}`);
    console.log(`   Active Admins: ${admins?.length || 0}`);

    if (admins && admins.length > 0) {
      console.log('   Admin emails:');
      for (const admin of admins) {
        const { data: user } = await supabaseService.auth.admin.getUserById(admin.user_id);
        console.log(`   - ${user?.user?.email || 'Unknown'}`);
      }
    }
    console.log('   ✅ Database state checked\n');
  } catch (error) {
    console.error('   ❌ Failed to check database:', error.message);
  }

  // Test 2: Test Admin Login
  console.log('2️⃣ TESTING ADMIN LOGIN');
  console.log('---------------------');
  console.log('   Note: Admin should log in at /admin');
  console.log('   Expected: Should access admin dashboard\n');

  // Test 3: Organization Creation
  console.log('3️⃣ TESTING ORGANIZATION CREATION');
  console.log('--------------------------------');
  console.log('   Steps to test manually:');
  console.log('   1. Go to signup page');
  console.log('   2. Create new organization');
  console.log('   3. Verify organization appears in database\n');

  // Test 4: Check API Endpoints
  console.log('4️⃣ TESTING API ENDPOINTS');
  console.log('------------------------');

  const endpoints = [
    '/api/health-check',
    '/api/debug-env',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`https://login.gymleadhub.co.uk${endpoint}`);
      console.log(`   ${endpoint}: ${response.status === 200 ? '✅' : '❌'} (${response.status})`);
    } catch (error) {
      console.log(`   ${endpoint}: ❌ Failed to connect`);
    }
  }

  console.log('\n');

  // Test 5: Check RLS Policies
  console.log('5️⃣ CHECKING RLS POLICIES');
  console.log('------------------------');

  try {
    // Test as anonymous user (should fail)
    const { data: anonTest, error: anonError } = await supabaseAnon
      .from('organizations')
      .select('*');

    if (anonError) {
      console.log('   ✅ Anonymous access blocked (expected)');
    } else {
      console.log('   ⚠️  Anonymous can read organizations');
    }

    // Test clients table
    const { data: clientTest, error: clientTestError } = await supabaseAnon
      .from('clients')
      .select('*');

    if (clientTestError) {
      console.log('   ✅ Client table protected');
    } else {
      console.log('   ⚠️  Client table accessible anonymously');
    }
  } catch (error) {
    console.log('   ❌ RLS check failed:', error.message);
  }

  console.log('\n=======================================');
  console.log('📋 SUMMARY');
  console.log('=======================================');
  console.log('\nNEXT STEPS:');
  console.log('1. Run the SQL reset script to clean the database');
  console.log('2. Set up admin user with setup-admin-user.js');
  console.log('3. Test admin login at /admin');
  console.log('4. Create a new organization through signup');
  console.log('5. Test organization owner login');
  console.log('6. Test client registration and login');
  console.log('\nURLs:');
  console.log('- Admin: https://login.gymleadhub.co.uk/admin');
  console.log('- Owner: https://login.gymleadhub.co.uk/owner-login');
  console.log('- Signup: https://login.gymleadhub.co.uk/signup');
}

testCompleteFlow().then(() => process.exit(0));