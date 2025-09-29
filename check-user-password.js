const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserAndResetPassword() {
  const email = 'sam@atlas-gyms.co.uk';
  const newPassword = '@Aa80236661';

  try {
    // First check with the actual owner ID we know
    const ownerId = 'e165c9a2-734e-4239-a4e4-5f6c9eacea2e';

    // Get the user by ID
    const { data: { user }, error: fetchError } = await supabase.auth.admin.getUserById(ownerId);

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return;
    }

    if (user) {
      console.log('Found user:', {
        id: user.id,
        email: user.email,
        created: user.created_at
      });

      // Update the password
      const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword
      });

      if (error) {
        console.error('Error updating password:', error);
      } else {
        console.log(`✅ Password updated successfully for ${email}`);
        console.log(`New password: ${newPassword}`);
        console.log('\nYou can now log in at http://localhost:3001/owner-login');
      }
    } else {
      console.log('User not found');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkUserAndResetPassword();