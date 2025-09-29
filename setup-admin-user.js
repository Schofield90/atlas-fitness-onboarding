const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupAdminUser() {
  const orgId = 'eac9a158-d3c7-4140-9620-91a5554a6fe8';

  // Check current organization owner
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, owner_id')
    .eq('id', orgId)
    .single();

  console.log('Organization:', org);

  if (org && org.owner_id) {
    // Get owner details
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(org.owner_id);

    if (user) {
      console.log('\n✅ Organization owner exists:');
      console.log('Email:', user.email);
      console.log('ID:', user.id);
      console.log('\n👉 Please log in with this email at http://localhost:3001/signin');

      // Also check user_organizations table
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('*')
        .eq('user_id', org.owner_id)
        .eq('organization_id', orgId);

      if (!userOrg || userOrg.length === 0) {
        // Create user_organizations entry
        const { error: insertError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: org.owner_id,
            organization_id: orgId,
            role: 'owner'
          });

        if (insertError && insertError.code !== '23505') {
          console.log('Error creating user_organizations entry:', insertError);
        } else {
          console.log('✅ Created user_organizations entry for owner');
        }
      }
    } else {
      console.log('⚠️ Owner user not found in auth.users');
    }
  }

  // List all users who have access to this organization
  const { data: orgUsers } = await supabase
    .from('user_organizations')
    .select('user_id, role')
    .eq('organization_id', orgId);

  if (orgUsers && orgUsers.length > 0) {
    console.log('\n📋 Users with organization access:');
    for (const orgUser of orgUsers) {
      const { data: { user } } = await supabase.auth.admin.getUserById(orgUser.user_id);
      if (user) {
        console.log(`- ${user.email} (${orgUser.role})`);
      }
    }
  }
}

setupAdminUser().catch(console.error);