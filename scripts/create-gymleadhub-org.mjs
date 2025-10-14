import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createGymLeadHubOrg() {
  console.log('🚀 Creating GymLeadHub internal organization...\n');

  // 1. Get sam@gymleadhub.co.uk user ID from users table
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'sam@gymleadhub.co.uk')
    .maybeSingle();

  if (userError) {
    console.error('❌ Error fetching user:', userError);
    process.exit(1);
  }

  if (!users) {
    console.error('❌ User sam@gymleadhub.co.uk not found in users table');

    // Try to find any users for debugging
    const { data: allUsers } = await supabase
      .from('users')
      .select('email')
      .limit(5);

    console.error('Sample users in database:', allUsers?.map(u => u.email) || 'None found');
    process.exit(1);
  }

  console.log('✅ Found user:', users.email);
  console.log('   User ID:', users.id);

  const samUserId = users.id;

  // 2. Check if GymLeadHub org already exists
  const { data: existingOrg, error: checkError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', 'gymleadhub')
    .maybeSingle();

  if (checkError) {
    console.error('❌ Error checking for existing org:', checkError);
    process.exit(1);
  }

  let orgId;

  if (existingOrg) {
    console.log('\n⚠️  GymLeadHub organization already exists');
    console.log('   Org ID:', existingOrg.id);
    console.log('   Name:', existingOrg.name);
    console.log('   Slug:', existingOrg.slug);
    orgId = existingOrg.id;
  } else {
    // 3. Create GymLeadHub organization
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert({
        name: 'GymLeadHub',
        slug: 'gymleadhub',
        email: 'sam@gymleadhub.co.uk',  // Required field
        owner_id: samUserId,
        settings: {
          type: 'internal',
          purpose: 'Platform administration and baseline agent templates'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, name, slug')
      .single();

    if (createError) {
      console.error('❌ Error creating organization:', createError);
      process.exit(1);
    }

    console.log('\n✅ Created GymLeadHub organization');
    console.log('   Org ID:', newOrg.id);
    console.log('   Name:', newOrg.name);
    console.log('   Slug:', newOrg.slug);
    orgId = newOrg.id;
  }

  // 4. Check if sam is already linked to the org
  const { data: existingLink, error: linkCheckError } = await supabase
    .from('user_organizations')
    .select('*')
    .eq('user_id', samUserId)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (linkCheckError && linkCheckError.code !== 'PGRST116') {
    console.error('❌ Error checking user link:', linkCheckError);
  }

  if (!existingLink) {
    // 5. Link sam@gymleadhub.co.uk to the organization
    const { error: linkError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: samUserId,
        organization_id: orgId,
        role: 'owner',
        created_at: new Date().toISOString()
      });

    if (linkError) {
      console.error('❌ Error linking user to organization:', linkError);
      process.exit(1);
    }

    console.log('\n✅ Linked sam@gymleadhub.co.uk to GymLeadHub org');
  } else {
    console.log('\n✅ sam@gymleadhub.co.uk already linked to GymLeadHub org');
  }

  // 6. Summary
  console.log('\n📊 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Organization ID:', orgId);
  console.log('Organization Name: GymLeadHub');
  console.log('Organization Slug: gymleadhub');
  console.log('Owner:', users.email);
  console.log('Owner ID:', samUserId);
  console.log('Purpose: Internal platform administration & baseline agents');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n✨ GymLeadHub organization setup complete!');
  console.log('\nNext steps:');
  console.log('1. Update baseline agent creation to default to this org');
  console.log('2. Create baseline agents under this organization');
  console.log('3. Build internal admin tools under this org context');
  console.log('\n💡 Save this Organization ID for agent creation!');

  return orgId;
}

createGymLeadHubOrg().catch(console.error);
