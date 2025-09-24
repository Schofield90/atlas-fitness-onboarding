const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function resetOwnerPassword() {
  try {
    // First, find the user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }

    const user = userData?.users?.find(u => u.email === 'sam@atlas-gyms.co.uk');

    if (!user) {
      console.log('⚠️ User sam@atlas-gyms.co.uk not found in auth.users');
      console.log('Available users:', userData?.users?.map(u => u.email).join(', '));
      return;
    }

    // Update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: '@Aa80236661' }
    );

    if (error) {
      console.error('Error updating password:', error);
      return;
    }

    console.log('✅ Password successfully reset for sam@atlas-gyms.co.uk');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('New password: @Aa80236661');

    // Check organization association
    const { data: orgData } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id);

    if (orgData && orgData.length > 0) {
      console.log('Organization associations:', orgData);
    } else {
      // Check if they own an organization directly
      const { data: ownedOrg } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('owner_id', user.id);

      if (ownedOrg && ownedOrg.length > 0) {
        console.log('Owned organizations:', ownedOrg);
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  } finally {
    process.exit(0);
  }
}

resetOwnerPassword();