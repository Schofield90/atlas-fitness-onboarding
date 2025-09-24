const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function fixSamOrganization() {
  try {
    console.log('Checking Sam\'s account and organization setup...\n');

    // First, find Sam's user ID
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', 'sam@atlas-gyms.co.uk')
      .single();

    if (!userData) {
      console.log('❌ User sam@atlas-gyms.co.uk not found in auth.users');

      // Try alternative approach
      const { data: { users }, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });

      const samUser = users?.find(u => u.email === 'sam@atlas-gyms.co.uk');
      if (!samUser) {
        console.log('User not found via admin API either');
        return;
      }

      console.log('✅ Found user via admin API:', samUser.id);
      userData = { id: samUser.id, email: samUser.email };
    } else {
      console.log('✅ Found user:', userData.email);
      console.log('   User ID:', userData.id);
    }

    // Check if organization exists
    let { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .or('name.eq.Atlas Fitness,name.eq.Atlas Gyms')
      .single();

    if (!org) {
      // Create organization
      console.log('\n📝 Creating Atlas Fitness organization...');
      const { data: newOrg, error: createOrgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Atlas Fitness',
          owner_id: userData.id,
          settings: {
            branding: {
              primaryColor: '#F97316',
              logo: null
            },
            features: {
              messaging: true,
              automation: true,
              booking: true
            }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createOrgError) {
        console.error('❌ Error creating organization:', createOrgError);
        return;
      }

      org = newOrg;
      console.log('✅ Organization created successfully');
    } else {
      console.log('\n✅ Found existing organization:', org.name);

      // Update owner if needed
      if (org.owner_id !== userData.id) {
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ owner_id: userData.id })
          .eq('id', org.id);

        if (!updateError) {
          console.log('✅ Updated organization owner');
        }
      }
    }

    console.log('   Organization ID:', org.id);

    // Check user_organizations link
    const { data: existingLink, error: linkCheckError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', userData.id)
      .eq('organization_id', org.id)
      .single();

    if (!existingLink) {
      console.log('\n📝 Creating user-organization link...');

      // First remove any existing links for this user
      await supabase
        .from('user_organizations')
        .delete()
        .eq('user_id', userData.id);

      // Create new link
      const { error: linkError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: userData.id,
          organization_id: org.id,
          role: 'owner',
          created_at: new Date().toISOString()
        });

      if (linkError) {
        console.error('❌ Error linking user to organization:', linkError);
      } else {
        console.log('✅ User linked to organization as owner');
      }
    } else {
      console.log('\n✅ User-organization link exists');
      console.log('   Role:', existingLink.role);

      // Update role to owner if needed
      if (existingLink.role !== 'owner') {
        const { error: updateRoleError } = await supabase
          .from('user_organizations')
          .update({ role: 'owner' })
          .eq('user_id', userData.id)
          .eq('organization_id', org.id);

        if (!updateRoleError) {
          console.log('✅ Updated user role to owner');
        }
      }
    }

    // Verify the setup
    console.log('\n========================================');
    console.log('✅ SETUP VERIFICATION');
    console.log('========================================');

    const { data: finalCheck } = await supabase
      .from('user_organizations')
      .select(`
        user_id,
        organization_id,
        role,
        organizations (
          id,
          name,
          owner_id
        )
      `)
      .eq('user_id', userData.id)
      .single();

    if (finalCheck) {
      console.log('User ID:', userData.id);
      console.log('Email:', userData.email);
      console.log('Organization:', finalCheck.organizations.name);
      console.log('Organization ID:', finalCheck.organization_id);
      console.log('Role:', finalCheck.role);
      console.log('\n✅ Everything is set up correctly!');
      console.log('You should now be able to login and access the dashboard.');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  } finally {
    process.exit(0);
  }
}

fixSamOrganization();