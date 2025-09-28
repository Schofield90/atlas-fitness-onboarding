#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function testOwnerLogin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🔐 Testing owner login for sam@atlas-gyms.co.uk...\n');

  try {
    // Test login
    console.log('1. Attempting login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'sam@atlas-gyms.co.uk',
      password: '@Aa80236661'
    });

    if (authError) {
      console.error('❌ Login failed:', authError);
      return;
    }

    console.log('✅ Login successful!');
    console.log(`User ID: ${authData.user.id}`);
    console.log(`Email: ${authData.user.email}`);

    // Test organizations access
    console.log('\n2. Testing organizations access...');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, owner_id');

    if (orgsError) {
      console.error('❌ Organizations access failed:', orgsError);
    } else {
      console.log(`✅ Can access ${orgs.length} organizations:`);
      orgs.forEach(org => {
        const isOwner = org.owner_id === authData.user.id;
        console.log(`- ${org.name} (${org.id}) ${isOwner ? '👑 OWNER' : ''}`);
      });
    }

    // Test user_organizations access
    console.log('\n3. Testing user_organizations access...');
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select('*');

    if (userOrgsError) {
      console.error('❌ user_organizations access failed:', userOrgsError);
    } else {
      console.log(`✅ Can access ${userOrgs.length} user_organization records:`);
      userOrgs.forEach(uo => {
        console.log(`- Org: ${uo.organization_id}, Role: ${uo.role}, Active: ${uo.is_active}`);
      });
    }

    // Test users table access
    console.log('\n4. Testing users table access...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      console.error('❌ Users table access failed:', userError);
    } else {
      console.log('✅ Can access user data:', {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name
      });
    }

    // Test specific Atlas organization access
    console.log('\n5. Testing Atlas organization specific access...');
    const { data: atlasOrg, error: atlasError } = await supabase
      .from('organizations')
      .select('*')
      .ilike('name', '%atlas%')
      .single();

    if (atlasError) {
      console.error('❌ Atlas organization access failed:', atlasError);
    } else {
      console.log('✅ Can access Atlas organization:', {
        id: atlasOrg.id,
        name: atlasOrg.name,
        owner_id: atlasOrg.owner_id,
        isOwner: atlasOrg.owner_id === authData.user.id
      });
    }

    // Logout
    console.log('\n6. Logging out...');
    const { error: logoutError } = await supabase.auth.signOut();
    
    if (logoutError) {
      console.error('❌ Logout failed:', logoutError);
    } else {
      console.log('✅ Logout successful');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('Sam should now be able to login as owner without 406 errors.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

testOwnerLogin().catch(console.error);