#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function checkCurrentSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔍 Checking current database schema...\n');

  try {
    // Test organizations table access
    console.log('📋 Testing organizations table:');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);

    if (orgsError) {
      console.error('❌ Organizations error:', orgsError);
    } else {
      console.log('✅ Organizations table accessible');
      if (orgs.length > 0) {
        console.log('Sample org columns:', Object.keys(orgs[0]));
        console.log(`Has email: ${orgs[0].hasOwnProperty('email') ? '✅' : '❌'}`);
        console.log(`Has owner_id: ${orgs[0].hasOwnProperty('owner_id') ? '✅' : '❌'}`);
      }
    }

    // Test user_organizations table access
    console.log('\n📋 Testing user_organizations table:');
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select('*')
      .limit(1);

    if (userOrgsError) {
      console.error('❌ User_organizations error:', userOrgsError);
    } else {
      console.log('✅ User_organizations table accessible');
      if (userOrgs.length > 0) {
        console.log('Sample user_org columns:', Object.keys(userOrgs[0]));
        console.log(`Has updated_at: ${userOrgs[0].hasOwnProperty('updated_at') ? '✅' : '❌'}`);
      } else {
        console.log('📝 Table exists but no records found');
      }
    }

    // Test Sam's login scenario specifically
    console.log('\n👤 Testing Sam\'s login scenario:');
    
    // Get Sam's auth user
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const samAuthUser = authUsers.users.find(u => u.email === 'sam@atlas-gyms.co.uk');
    
    if (!samAuthUser) {
      console.log('❌ Sam not found in auth.users');
      return;
    }
    
    console.log(`✅ Sam found in auth: ${samAuthUser.id}`);

    // Check Sam's organizations access
    const { data: samOrgs, error: samOrgsError } = await supabase
      .from('organizations')
      .select('*');

    if (samOrgsError) {
      console.error('❌ Error getting Sam\'s organizations:', samOrgsError);
    } else {
      console.log(`✅ Found ${samOrgs.length} organizations Sam can access`);
      samOrgs.forEach(org => {
        console.log(`- ${org.name} (${org.id})`);
      });
    }

    // Check Sam's user_organizations records
    const { data: samUserOrgs, error: samUserOrgsError } = await supabase
      .from('user_organizations')
      .select('*');

    if (samUserOrgsError) {
      console.error('❌ Error getting Sam\'s user_organizations:', samUserOrgsError);
    } else {
      console.log(`✅ Found ${samUserOrgs.length} user_organization records`);
      samUserOrgs.forEach(uo => {
        console.log(`- User: ${uo.user_id}, Org: ${uo.organization_id || uo.org_id}, Role: ${uo.role}`);
      });
    }

    // Try to reproduce the 406 error by simulating an authenticated request
    console.log('\n🔐 Simulating authenticated request as Sam:');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', samAuthUser.id)
      .single();

    if (userError) {
      console.error('❌ Error getting user data:', userError);
    } else {
      console.log('✅ User data accessible');
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

checkCurrentSchema().catch(console.error);