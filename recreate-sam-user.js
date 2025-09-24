const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  db: { schema: 'auth' }
});

const supabasePublic = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  db: { schema: 'public' }
});

async function recreateUser() {
  try {
    console.log('Starting user recreation process for sam@atlas-gyms.co.uk...\n');

    // Step 1: Find and delete existing user using direct database query
    console.log('Step 1: Looking up existing user...');

    const { data: userData, error: lookupError } = await supabase
      .rpc('get_user_by_email', { email: 'sam@atlas-gyms.co.uk' })
      .single();

    let userId = null;

    if (lookupError) {
      // Try alternative method - get all users and filter
      console.log('Using alternative method to find user...');

      // We'll need to use raw SQL through the service role
      const { data: rawUsers, error: rawError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', 'sam@atlas-gyms.co.uk')
        .single();

      if (rawUsers) {
        userId = rawUsers.id;
      }
    } else if (userData) {
      userId = userData.id;
    }

    if (userId) {
      console.log('Found existing user with ID:', userId);

      // Delete user_organizations entries first
      const { error: orgDeleteError } = await supabasePublic
        .from('user_organizations')
        .delete()
        .eq('user_id', userId);

      if (!orgDeleteError) {
        console.log('✅ Removed organization associations');
      }

      // Delete the user from auth.users
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.log('Warning: Could not delete user via admin API:', deleteError.message);
        console.log('Attempting direct database deletion...');

        // Try direct deletion from auth.users table
        const { error: directDeleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (directDeleteError) {
          console.log('⚠️ Could not delete existing user, proceeding anyway...');
        } else {
          console.log('✅ Existing user deleted');
        }
      } else {
        console.log('✅ Existing user deleted successfully');
      }
    } else {
      console.log('No existing user found, proceeding with creation...');
    }

    // Step 2: Create new user with correct password
    console.log('\nStep 2: Creating new user with password @Aa80236661...');

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'sam@atlas-gyms.co.uk',
      password: '@Aa80236661',
      email_confirm: true,
      user_metadata: {
        name: 'Sam Schofield',
        role: 'owner'
      }
    });

    if (createError) {
      console.error('❌ Error creating user:', createError);
      return;
    }

    console.log('✅ User created successfully!');
    console.log('   Email: sam@atlas-gyms.co.uk');
    console.log('   Password: @Aa80236661');
    console.log('   User ID:', newUser.user.id);

    // Step 3: Create or find organization and link user
    console.log('\nStep 3: Setting up organization...');

    // Check if Atlas Fitness organization exists
    let { data: org, error: orgError } = await supabasePublic
      .from('organizations')
      .select('id, name, owner_id')
      .or('name.eq.Atlas Fitness,name.eq.Atlas Gyms')
      .single();

    if (!org) {
      // Create organization if it doesn't exist
      console.log('Creating Atlas Fitness organization...');
      const { data: newOrg, error: createOrgError } = await supabasePublic
        .from('organizations')
        .insert({
          name: 'Atlas Fitness',
          owner_id: newUser.user.id,
          settings: {
            branding: {
              primaryColor: '#F97316',
              logo: null
            }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createOrgError) {
        console.log('⚠️ Could not create organization:', createOrgError.message);
        return;
      }

      org = newOrg;
      console.log('✅ Organization created:', org.name);
    } else {
      console.log('✅ Found existing organization:', org.name);

      // Update owner_id if needed
      if (org.owner_id !== newUser.user.id) {
        const { error: updateError } = await supabasePublic
          .from('organizations')
          .update({ owner_id: newUser.user.id })
          .eq('id', org.id);

        if (!updateError) {
          console.log('✅ Updated organization owner');
        }
      }
    }

    // Step 4: Link user to organization
    console.log('\nStep 4: Linking user to organization...');

    // Check if link already exists
    const { data: existingLink } = await supabasePublic
      .from('user_organizations')
      .select('id')
      .eq('user_id', newUser.user.id)
      .eq('organization_id', org.id)
      .single();

    if (!existingLink) {
      const { error: linkError } = await supabasePublic
        .from('user_organizations')
        .insert({
          user_id: newUser.user.id,
          organization_id: org.id,
          role: 'owner',
          created_at: new Date().toISOString()
        });

      if (linkError) {
        console.log('⚠️ Could not link user to organization:', linkError.message);
      } else {
        console.log('✅ User linked to organization as owner');
      }
    } else {
      console.log('✅ User already linked to organization');
    }

    console.log('\n========================================');
    console.log('✅ SETUP COMPLETE!');
    console.log('========================================');
    console.log('Login credentials:');
    console.log('Email: sam@atlas-gyms.co.uk');
    console.log('Password: @Aa80236661');
    console.log('\nYou can now login at:');
    console.log('https://login.gymleadhub.co.uk');
    console.log('or');
    console.log('http://localhost:3000/owner-login');

  } catch (err) {
    console.error('Unexpected error:', err);
  } finally {
    process.exit(0);
  }
}

recreateUser();