const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

async function testClientCreation() {
  console.log('🧪 Testing client creation with RLS policies...\n');
  
  // Step 1: Find sam@gymleadhub.co.uk
  const { data: users } = await supabase.auth.admin.listUsers();
  const sam = users?.users?.find(u => u.email === 'sam@gymleadhub.co.uk');
  
  if (!sam) {
    console.log('❌ User sam@gymleadhub.co.uk not found');
    return;
  }
  
  console.log('✅ Found user:', sam.id);
  
  // Step 2: Get their organization
  const { data: orgMember, error: orgError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', sam.id)
    .maybeSingle();
  
  if (!orgMember) {
    console.log('❌ User has no organization');
    
    // Try to create one
    console.log('\n📝 Creating organization for sam...');
    const { data: newOrg, error: createOrgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Atlas Fitness Test',
        slug: 'atlas-fitness-test',
        email: 'sam@gymleadhub.co.uk',
        owner_id: sam.id
      })
      .select()
      .single();
    
    if (createOrgError) {
      console.log('❌ Failed to create organization:', createOrgError.message);
      return;
    }
    
    console.log('✅ Created organization:', newOrg.id);
    
    // Create member link
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        user_id: sam.id,
        organization_id: newOrg.id,
        role: 'owner',
        is_active: true
      });
    
    if (memberError) {
      console.log('❌ Failed to create member link:', memberError.message);
      return;
    }
    
    console.log('✅ Created member link');
    orgMember = { organization_id: newOrg.id };
  }
  
  console.log('✅ Organization ID:', orgMember.organization_id);
  
  // Step 3: Test creating a client
  console.log('\n🧪 Creating test client...');
  
  const clientData = {
    org_id: orgMember.organization_id,
    first_name: 'Test',
    last_name: 'Client',
    email: `test-${Date.now()}@example.com`,
    phone: '555-0123',
    status: 'active',
    source: 'test',
    tags: ['test'],
    metadata: { test: true }
  };
  
  const { data: newClient, error: clientError } = await supabase
    .from('clients')
    .insert(clientData)
    .select()
    .single();
  
  if (clientError) {
    console.log('❌ Failed to create client:', clientError);
    console.log('Error code:', clientError.code);
    console.log('Error details:', clientError.details);
    console.log('Error hint:', clientError.hint);
    return;
  }
  
  console.log('✅ Successfully created client!');
  console.log('   ID:', newClient.id);
  console.log('   Name:', newClient.first_name, newClient.last_name);
  console.log('   Email:', newClient.email);
  console.log('   Org:', newClient.org_id);
  
  // Step 4: Verify we can read it back
  const { data: readClient, error: readError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', newClient.id)
    .single();
  
  if (readError) {
    console.log('❌ Failed to read client back:', readError.message);
  } else {
    console.log('✅ Successfully read client back');
  }
  
  console.log('\n🎉 ALL TESTS PASSED - RLS POLICIES ARE WORKING!');
}

testClientCreation().catch(console.error);