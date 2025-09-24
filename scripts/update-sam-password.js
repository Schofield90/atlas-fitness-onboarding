const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updatePassword() {
  try {
    // First get the user ID for sam@atlas-gyms.co.uk
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    
    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return;
    }

    const samUser = users.users.find(u => u.email === 'sam@atlas-gyms.co.uk');
    
    if (!samUser) {
      console.error('User sam@atlas-gyms.co.uk not found');
      return;
    }

    console.log('Found user:', samUser.id);

    // Update the password
    const { data, error } = await supabase.auth.admin.updateUserById(
      samUser.id,
      { password: '@Aa80236661' }
    );

    if (error) {
      console.error('Error updating password:', error);
      return;
    }

    console.log('Password successfully updated for sam@atlas-gyms.co.uk');
    
    // Test the login
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'sam@atlas-gyms.co.uk',
      password: '@Aa80236661'
    });

    if (signInError) {
      console.error('Login test failed:', signInError);
    } else {
      console.log('Login test successful!');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

updatePassword();