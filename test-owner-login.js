const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testOwnerLogin() {
  console.log('Testing owner login for sam@atlas-gyms.co.uk...');
  
  try {
    // 1. Test authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'sam@atlas-gyms.co.uk',
      password: 'Gyms2020!' // You'll need to provide the correct password
    });
    
    if (authError) {
      console.error('❌ Auth failed:', authError.message);
      return;
    }
    
    console.log('✅ Authentication successful');
    console.log('User ID:', authData.user.id);
    console.log('Email:', authData.user.email);
    
    // 2. Test organization fetch (staff)
    const { data: staffData, error: staffError } = await supabase
      .from('organization_staff')
      .select('organization_id')
      .eq('user_id', authData.user.id)
      .single();
      
    if (!staffError && staffData) {
      console.log('✅ Found organization via staff:', staffData.organization_id);
    } else {
      console.log('⚠️ No staff record found');
      
      // Try organization_members
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', authData.user.id)
        .single();
        
      if (!memberError && memberData) {
        console.log('✅ Found organization via members:', memberData.organization_id);
      } else {
        console.log('❌ No organization found for user');
      }
    }
    
    // 3. Test organizations table access (this is where RLS errors occur)
    console.log('\nTesting organizations table access...');
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1)
      .single();
      
    if (orgError) {
      console.error('❌ Organizations table error:', orgError.message);
      if (orgError.message.includes('infinite recursion')) {
        console.log('⚠️ RLS infinite recursion detected - this is the main issue!');
      }
    } else {
      console.log('✅ Organizations table accessible:', orgData);
    }
    
    // 4. Sign out
    await supabase.auth.signOut();
    console.log('\n✅ Test complete');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testOwnerLogin();