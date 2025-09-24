const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testAuthAPI() {
  console.log('🔐 Testing authentication API directly...\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test login
    console.log('1. Testing login for sam@atlas-gyms.co.uk...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'sam@atlas-gyms.co.uk',
      password: '@Aa80236661'
    });

    if (authError) {
      console.error('❌ Login failed:', authError.message);
      return;
    }

    console.log('✅ Login successful!');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    console.log('   Session:', authData.session ? 'Active' : 'None');

    // Test getting user
    console.log('\n2. Testing getUser()...');
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('❌ getUser failed:', userError.message);
    } else {
      console.log('✅ getUser successful!');
      console.log('   Current user:', userData.user.email);
    }

    // Test organization check
    console.log('\n3. Checking organization membership...');

    // Check organization_staff
    const { data: staffData, error: staffError } = await supabase
      .from('organization_staff')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (staffData) {
      console.log('✅ Found in organization_staff:');
      console.log('   Organization ID:', staffData.organization_id);
      console.log('   Role:', staffData.role);
    } else {
      console.log('⚠️ Not found in organization_staff');
    }

    // Check organization_members
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (memberData) {
      console.log('✅ Found in organization_members:');
      console.log('   Organization ID:', memberData.organization_id || memberData.org_id);
      console.log('   Role:', memberData.role);
    } else {
      console.log('⚠️ Not found in organization_members');
    }

    // Check if organization exists
    console.log('\n4. Checking organization existence...');
    const orgId = '63589490-8f55-4157-bd3a-e141594b748e';
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (orgData) {
      console.log('✅ Organization exists:');
      console.log('   Name:', orgData.name);
      console.log('   Slug:', orgData.slug);
      console.log('   Owner ID:', orgData.owner_id);
    } else {
      console.log('❌ Organization not found!');
    }

    console.log('\n========================================');
    console.log('✅ AUTHENTICATION API TEST COMPLETE');
    console.log('========================================');

    // Sign out
    await supabase.auth.signOut();
    console.log('\n🚪 Signed out successfully');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testAuthAPI().then(() => process.exit(0));