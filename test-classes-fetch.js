const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testClassesFetch() {
  console.log('🔐 Testing classes fetch as sam@atlas-gyms.co.uk...\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Login as sam
    console.log('1. Logging in as sam@atlas-gyms.co.uk...');
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

    const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

    // Try to fetch programs as the UI would
    console.log('\n2. Fetching programs...');
    const { data, error } = await supabase
      .from("programs")
      .select(`*`)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error('❌ Error fetching programs:', {
        message: error.message,
        code: error.code,
        details: error.details,
        fullError: JSON.stringify(error, null, 2)
      });
    } else {
      console.log('✅ Programs fetched successfully!');
      console.log('   Found', data?.length || 0, 'programs');
      if (data?.length) {
        data.forEach(program => {
          console.log('   -', program.name, '| Active:', program.is_active);
        });
      }
    }

    // Also try with a service role key to check if it's a permissions issue
    console.log('\n3. Testing with service role...');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false }}
    );

    const { data: adminData, error: adminError } = await supabaseAdmin
      .from("programs")
      .select(`*`)
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (adminError) {
      console.error('❌ Admin error:', adminError.message);
    } else {
      console.log('✅ Admin fetch successful - Found', adminData?.length || 0, 'programs');
    }

    // Sign out
    await supabase.auth.signOut();
    console.log('\n🚪 Signed out successfully');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testClassesFetch().then(() => process.exit(0));