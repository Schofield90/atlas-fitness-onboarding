const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
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

async function checkAndCreateUser() {
  try {
    // First check in auth.users via a different approach
    console.log('Checking for existing user sam@atlas-gyms.co.uk...\n');

    // Try to sign in first to see if the user exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'sam@atlas-gyms.co.uk',
      password: 'test-password-wrong' // Using wrong password just to check if user exists
    });

    if (signInError && signInError.message.includes('Invalid login credentials')) {
      console.log('✅ User exists in auth system, password just needs resetting\n');

      // Generate a password reset link
      const { data, error } = await supabase.auth.resetPasswordForEmail(
        'sam@atlas-gyms.co.uk',
        {
          redirectTo: `${supabaseUrl}/auth/callback?redirect=/dashboard`,
        }
      );

      if (error) {
        console.error('Error sending reset email:', error);
      } else {
        console.log('📧 Password reset email sent to sam@atlas-gyms.co.uk');
        console.log('Check email for reset link, or use the direct method below.\n');
      }

      // Alternative: Create a direct update script
      console.log('Alternative: Direct password update');
      console.log('========================================');
      console.log('Since we cannot directly update the password via the API,');
      console.log('you can either:');
      console.log('1. Use the password reset link sent to the email');
      console.log('2. Create the user fresh with the correct password');
      console.log('\nWould you like to create a fresh user instead? (This will require deleting the existing one first)');

    } else if (signInError && signInError.message.includes('User not found')) {
      console.log('❌ User does not exist, creating new user...\n');

      // Create new user with the specified password
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'sam@atlas-gyms.co.uk',
        password: '@Aa80236661',
        email_confirm: true
      });

      if (createError) {
        console.error('Error creating user:', createError);
      } else {
        console.log('✅ User created successfully!');
        console.log('Email:', newUser.user.email);
        console.log('User ID:', newUser.user.id);
        console.log('Password: @Aa80236661');

        // Now create organization association
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('name', 'Atlas Fitness')
          .single();

        if (orgData) {
          console.log('\nFound organization:', orgData.name);

          // Create user_organization link
          const { error: linkError } = await supabase
            .from('user_organizations')
            .insert({
              user_id: newUser.user.id,
              organization_id: orgData.id,
              role: 'owner'
            });

          if (!linkError) {
            console.log('✅ User linked to organization as owner');
          } else {
            console.log('Warning: Could not link user to organization:', linkError.message);
          }
        } else {
          console.log('\n⚠️ No Atlas Fitness organization found, user created without organization link');
        }
      }
    } else {
      console.log('Unexpected response:', signInError || signInData);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  } finally {
    process.exit(0);
  }
}

checkAndCreateUser();