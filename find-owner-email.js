const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function findOwnerEmail() {
  const ownerId = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1';

  console.log('Looking for owner with ID:', ownerId);
  console.log('----------------------------------------\n');

  try {
    // Try to get the user by ID
    const { data: userData, error } = await supabase.auth.admin.getUserById(ownerId);

    if (!error && userData) {
      console.log('✅ Found owner account:');
      console.log('   Email:', userData.user.email);
      console.log('   ID:', userData.user.id);
      console.log('   Created:', userData.user.created_at);
      console.log('   Last Sign In:', userData.user.last_sign_in_at);
      console.log('\n========================================');
      console.log('LOGIN WITH THIS EMAIL:', userData.user.email);
      console.log('========================================');
    } else {
      console.log('Could not find user with that ID');

      // List all users to find the right one
      const { data: { users } } = await supabase.auth.admin.listUsers();

      console.log('\nAll users in the system:');
      users?.forEach(u => {
        console.log(`- ${u.email} (ID: ${u.id})`);
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
  }

  process.exit(0);
}

findOwnerEmail();