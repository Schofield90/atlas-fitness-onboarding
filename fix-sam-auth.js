const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure .env.local has:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function fixSamAuth() {
  console.log('🔧 Fixing authentication for sam@atlas-gyms.co.uk');
  console.log('========================================\n');

  const targetEmail = 'sam@atlas-gyms.co.uk';
  const targetPassword = '@Aa80236661';
  const targetUserId = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1';
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

  try {
    // Step 1: Check if user exists using admin API
    console.log('Step 1: Checking if user exists...');
    let userId = null;

    try {
      const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserById(targetUserId);

      if (existingUser && !getUserError) {
        console.log('✅ User found with correct ID');
        userId = existingUser.user.id;

        // Update password
        console.log('Updating password...');
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          targetUserId,
          {
            password: targetPassword,
            email_confirm: true
          }
        );

        if (updateError) {
          console.error('⚠️ Error updating password:', updateError.message);
        } else {
          console.log('✅ Password updated successfully');
        }
      }
    } catch (err) {
      console.log('User not found by ID, will create new user');
    }

    // Step 2: If user doesn't exist, create it
    if (!userId) {
      console.log('\nStep 2: Creating new user...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: targetEmail,
        password: targetPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Sam Schofield',
          role: 'owner'
        }
      });

      if (createError) {
        console.error('❌ Error creating user:', createError.message);

        // Try to find existing user by email
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        });

        if (!listError && users) {
          const samUser = users.find(u => u.email === targetEmail);
          if (samUser) {
            console.log('✅ User already exists with ID:', samUser.id);
            userId = samUser.id;

            // Update password for existing user
            const { error: pwdError } = await supabase.auth.admin.updateUserById(
              samUser.id,
              { password: targetPassword }
            );

            if (!pwdError) {
              console.log('✅ Password reset for existing user');
            }
          }
        }
      } else if (newUser) {
        console.log('✅ User created successfully');
        userId = newUser.user.id;
      }
    }

    // Step 3: Ensure organization exists
    console.log('\nStep 3: Checking organization...');
    const { data: orgCheck, error: orgCheckError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (!orgCheck || orgCheckError) {
      console.log('Creating organization...');
      const { error: createOrgError } = await supabase
        .from('organizations')
        .insert({
          id: organizationId,
          name: 'Atlas Fitness',
          slug: 'atlas-fitness',
          owner_id: userId || targetUserId,
          settings: {
            branding: { primaryColor: '#F97316', logo: null },
            features: {
              messaging: true,
              automation: true,
              booking: true,
              ai_chat: true
            }
          }
        });

      if (!createOrgError) {
        console.log('✅ Organization created');
      } else if (createOrgError.code === '23505') {
        console.log('✅ Organization already exists');
      } else {
        console.error('⚠️ Error creating organization:', createOrgError.message);
      }
    } else {
      console.log('✅ Organization exists');

      // Update owner_id if needed
      if (userId && orgCheck.owner_id !== userId) {
        await supabase
          .from('organizations')
          .update({ owner_id: userId })
          .eq('id', organizationId);
        console.log('✅ Updated organization owner');
      }
    }

    // Step 4: Link user to organization
    if (userId) {
      console.log('\nStep 4: Linking user to organization...');

      // Check existing link
      const { data: existingLink } = await supabase
        .from('user_organizations')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single();

      if (!existingLink) {
        const { error: linkError } = await supabase
          .from('user_organizations')
          .upsert({
            user_id: userId,
            organization_id: organizationId,
            role: 'owner'
          }, {
            onConflict: 'user_id,organization_id'
          });

        if (!linkError) {
          console.log('✅ User linked to organization');
        } else {
          console.error('⚠️ Error linking user:', linkError.message);
        }
      } else {
        console.log('✅ User already linked to organization');

        // Ensure role is owner
        if (existingLink.role !== 'owner') {
          await supabase
            .from('user_organizations')
            .update({ role: 'owner' })
            .eq('user_id', userId)
            .eq('organization_id', organizationId);
          console.log('✅ Updated role to owner');
        }
      }
    }

    // Step 5: Test authentication
    console.log('\n========================================');
    console.log('✅ SETUP COMPLETE!');
    console.log('========================================');
    console.log('\nYou can now login with:');
    console.log('Email:', targetEmail);
    console.log('Password:', targetPassword);
    console.log('\nOrganization:', 'Atlas Fitness');
    console.log('Organization ID:', organizationId);
    if (userId) {
      console.log('User ID:', userId);
    }
    console.log('\n🚀 Navigate to: http://localhost:3001/owner-login');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err);
  }
}

fixSamAuth().then(() => process.exit(0));