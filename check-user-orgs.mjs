import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey);

async function checkUser() {
  // Check for Sam's user account
  const { data: userData } = await client.auth.admin.listUsers();

  console.log('\n📋 All users in database:');
  userData.users.slice(0, 10).forEach(u => {
    console.log(`  - ${u.email} (${u.id})`);
  });
  console.log(`  ... (${userData.users.length} total users)\n`);

  const samUser = userData.users.find(u =>
    u.email?.includes('sam@gymleadhub') ||
    u.email?.includes('schofield') ||
    u.email?.includes('sam@atlas')
  );

  if (!samUser) {
    console.log('❌ Sam user not found in database');
    console.log('💡 Try logging in first at https://login.gymleadhub.co.uk/saas-admin');
    return;
  }

  console.log('✅ User found:', samUser.email, samUser.id);

  // Check user_organizations
  const { data: userOrgs } = await client
    .from('user_organizations')
    .select('organization_id, role, organizations(name)')
    .eq('user_id', samUser.id);

  console.log('\n📋 user_organizations:', userOrgs?.length || 0);
  userOrgs?.forEach(o => console.log('  -', o.organizations?.name, '(' + o.role + ')'));

  // Check organizations owned
  const { data: ownedOrgs } = await client
    .from('organizations')
    .select('id, name')
    .eq('owner_id', samUser.id);

  console.log('\n🏢 Owned organizations:', ownedOrgs?.length || 0);
  ownedOrgs?.forEach(o => console.log('  -', o.name, '(id:', o.id + ')'));

  // Check organization_staff
  const { data: staffOrgs } = await client
    .from('organization_staff')
    .select('organization_id, organizations(name)')
    .eq('user_id', samUser.id);

  console.log('\n👥 Staff in organizations:', staffOrgs?.length || 0);
  staffOrgs?.forEach(o => console.log('  -', o.organizations?.name));

  // Check user preferences
  const { data: prefs } = await client
    .from('user_preferences')
    .select('preference_key, preference_value')
    .eq('user_id', samUser.id)
    .eq('preference_key', 'selected_organization_id');

  console.log('\n⚙️  User preferences:', prefs?.length || 0);
  prefs?.forEach(p => console.log('  -', p.preference_key + ':', p.preference_value));

  // Summary
  console.log('\n📊 Summary:');
  if (!userOrgs?.length && !ownedOrgs?.length && !staffOrgs?.length) {
    console.log('❌ User has NO organization associations');
    console.log('💡 This is why you\'re being redirected!');
  } else {
    console.log('✅ User has organization access');
  }
}

checkUser().catch(console.error);
