const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkClientAccess() {
  const email = 'samschofield90@hotmail.co.uk';
  console.log(`\n🔍 Checking access for: ${email}\n`);

  try {
    // Check if user exists in clients table
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (clientError) {
      console.log('❌ Not found in clients table:', clientError.message);
      console.log('\nNeed to add as a client first!');
      
      // Check if there's an auth user
      const { data: authUsers } = await supabase
        .from('auth.users')
        .select('id, email')
        .eq('email', email.toLowerCase());
      
      if (authUsers && authUsers.length > 0) {
        console.log('Found in auth.users:', authUsers[0]);
      }
      
      return;
    }

    console.log('✅ Client found:');
    console.log('  - ID:', client.id);
    console.log('  - Name:', client.first_name, client.last_name);
    console.log('  - Organization ID:', client.organization_id);
    console.log('  - User ID:', client.user_id);
    console.log('  - Email:', client.email);

    // Check organization
    if (client.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, is_active')
        .eq('id', client.organization_id)
        .single();
      
      if (org) {
        console.log('\n✅ Organization:', org.name);
        console.log('  - Active:', org.is_active);
      }
    }

    // Check if user is also a gym owner (should NOT be)
    const { data: ownerCheck } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', client.user_id)
      .single();

    if (ownerCheck) {
      console.log('\n⚠️  WARNING: This user also owns an organization!');
      console.log('They should be blocked from members portal!');
    } else {
      console.log('\n✅ Not a gym owner - can access members portal');
    }

    // Check OTP tokens
    const { data: otpTokens } = await supabase
      .from('otp_tokens')
      .select('*')
      .eq('email', email.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(5);

    if (otpTokens && otpTokens.length > 0) {
      console.log('\n📧 Recent OTP tokens:');
      otpTokens.forEach(token => {
        console.log(`  - Token: ${token.token}, Expires: ${token.expires_at}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkClientAccess();