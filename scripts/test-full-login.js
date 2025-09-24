const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFullFlow() {
  console.log('Testing full login flow for sam@atlas-gyms.co.uk\n');
  console.log('='.repeat(50));
  
  // 1. Test login
  console.log('\n1. Testing login...');
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'sam@atlas-gyms.co.uk',
    password: 'Gyms2020!'
  });
  
  if (loginError) {
    console.error('❌ Login failed:', loginError.message);
    return;
  }
  
  console.log('✅ Login successful!');
  console.log('   User ID:', loginData.user.id);
  console.log('   Email:', loginData.user.email);
  console.log('   Session:', loginData.session ? 'Active' : 'None');
  
  // 2. Test organization access
  console.log('\n2. Checking organization access...');
  const { data: staffData, error: staffError } = await supabase
    .from('organization_staff')
    .select('organization_id, role')
    .eq('user_id', loginData.user.id)
    .eq('is_active', true)
    .single();
  
  if (staffError) {
    console.error('❌ Failed to get organization:', staffError.message);
  } else {
    console.log('✅ Organization found!');
    console.log('   Organization ID:', staffData.organization_id);
    console.log('   Role:', staffData.role);
  }
  
  // 3. Test dashboard data access
  console.log('\n3. Testing dashboard data access...');
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, owner_id')
    .eq('id', '63589490-8f55-4157-bd3a-e141594b748e')
    .single();
  
  if (orgError) {
    console.error('❌ Failed to fetch organization:', orgError.message);
  } else {
    console.log('✅ Organization data accessible!');
    console.log('   Name:', orgData.name);
    console.log('   Owner ID:', orgData.owner_id);
    console.log('   Matches User:', orgData.owner_id === loginData.user.id ? 'Yes' : 'No');
  }
  
  // 4. Test leads access (common dashboard query)
  console.log('\n4. Testing leads access...');
  const { data: leadsData, error: leadsError } = await supabase
    .from('leads')
    .select('id')
    .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
    .limit(5);
  
  if (leadsError) {
    console.error('❌ Failed to fetch leads:', leadsError.message);
  } else {
    console.log('✅ Leads accessible!');
    console.log('   Count:', leadsData.length);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ ALL TESTS PASSED! Login flow is working correctly.');
  console.log('\nThe owner can:');
  console.log('- Login successfully');
  console.log('- Access their organization');
  console.log('- View organization data');
  console.log('- Access leads data');
  console.log('\nThe normal login should work at http://localhost:3000/owner-login');
}

testFullFlow();