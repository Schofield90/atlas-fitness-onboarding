#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function diagnoseSchemaIssues() {
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

  console.log('🔍 Diagnosing database schema issues...\n');

  try {
    // Check organizations table structure
    console.log('📋 Organizations table structure:');
    const { data: orgColumns, error: orgError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'organizations')
      .order('ordinal_position');

    if (orgError) {
      console.error('❌ Error getting organizations columns:', orgError);
    } else {
      console.table(orgColumns);
      
      // Check specifically for missing email column
      const hasEmail = orgColumns.some(col => col.column_name === 'email');
      const hasOwnerId = orgColumns.some(col => col.column_name === 'owner_id');
      
      console.log(`\n📧 Email column exists: ${hasEmail ? '✅' : '❌'}`);
      console.log(`👑 Owner_id column exists: ${hasOwnerId ? '✅' : '❌'}`);
    }

    // Check user_organizations table structure
    console.log('\n📋 User_organizations table structure:');
    const { data: userOrgColumns, error: userOrgError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'user_organizations')
      .order('ordinal_position');

    if (userOrgError) {
      console.error('❌ Error getting user_organizations columns:', userOrgError);
    } else if (userOrgColumns.length === 0) {
      console.log('❌ user_organizations table does not exist');
    } else {
      console.table(userOrgColumns);
      
      // Check specifically for missing updated_at column
      const hasUpdatedAt = userOrgColumns.some(col => col.column_name === 'updated_at');
      console.log(`\n🕐 Updated_at column exists: ${hasUpdatedAt ? '✅' : '❌'}`);
    }

    // Check if user_organizations table exists at all
    console.log('\n🔍 Checking if user_organizations table exists:');
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_organizations');

    if (tableError) {
      console.error('❌ Error checking table existence:', tableError);
    } else {
      console.log(`Table exists: ${tableExists.length > 0 ? '✅' : '❌'}`);
    }

    // Check for Sam's user record
    console.log('\n👤 Checking Sam\'s user records:');
    
    // Check auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error getting auth users:', authError);
    } else {
      const samAuthUser = authUser.users.find(u => u.email === 'sam@atlas-gyms.co.uk');
      console.log(`Sam in auth.users: ${samAuthUser ? '✅' : '❌'}`);
      if (samAuthUser) {
        console.log(`Sam's auth ID: ${samAuthUser.id}`);
      }
    }

    // Check users table
    const { data: samUser, error: samUserError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'sam@atlas-gyms.co.uk')
      .single();

    if (samUserError) {
      console.log(`❌ Sam not in users table: ${samUserError.message}`);
    } else {
      console.log('✅ Sam in users table:', samUser.id);
    }

    // Check organizations
    console.log('\n🏢 Checking organizations:');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(5);

    if (orgsError) {
      console.error('❌ Error getting organizations:', orgsError);
    } else {
      console.log(`Found ${orgs.length} organizations`);
      orgs.forEach(org => {
        console.log(`- ${org.name} (${org.id})`);
      });
    }

    // Try to query user_organizations if it exists
    if (tableExists.length > 0) {
      console.log('\n🔗 Checking user_organizations records:');
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('*')
        .limit(5);

      if (userOrgsError) {
        console.error('❌ Error getting user_organizations:', userOrgsError);
      } else {
        console.log(`Found ${userOrgs.length} user_organization records`);
        userOrgs.forEach(uo => {
          console.log(`- User: ${uo.user_id}, Org: ${uo.organization_id}, Role: ${uo.role}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

diagnoseSchemaIssues().catch(console.error);