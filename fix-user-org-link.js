const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

async function fixUserOrgLink() {
  const userId = '9e7148f7-cc40-41a8-bc6e-54b8b2252e85';
  const orgId = '59439a33-09b0-4816-89e8-7b4837e0f985';
  const email = 'sam@atlas-gyms.co.uk';
  
  console.log('🔧 Fixing user organization link...\n');
  
  // Step 1: Ensure user exists in users table
  console.log('1. Checking users table...');
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  if (!existingUser) {
    console.log('   Creating user record...');
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        name: 'Sam Schofield'
      });
    
    if (userError && userError.code !== '23505') {
      console.log('   ❌ Failed to create user:', userError.message);
      return;
    }
    console.log('   ✅ User record created');
  } else {
    console.log('   ✅ User already exists in users table');
  }
  
  // Step 2: Create organization membership
  console.log('\n2. Creating organization membership...');
  
  // Check if already exists
  const { data: existingMembership } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .maybeSingle();
  
  if (existingMembership) {
    console.log('   ✅ Membership already exists');
  } else {
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: orgId,
        role: 'owner',
        is_active: true
      });
    
    if (memberError) {
      console.log('   ❌ Failed to create membership:', memberError.message);
      return;
    }
    console.log('   ✅ Membership created');
  }
  
  // Step 3: Update organization owner
  console.log('\n3. Setting as organization owner...');
  const { error: updateError } = await supabase
    .from('organizations')
    .update({ owner_id: userId })
    .eq('id', orgId);
  
  if (updateError) {
    console.log('   ⚠️ Could not update owner:', updateError.message);
  } else {
    console.log('   ✅ Set as organization owner');
  }
  
  // Step 4: Test client creation
  console.log('\n4. Testing client creation...');
  const testClient = {
    org_id: orgId,
    first_name: 'Test',
    last_name: 'Client',
    email: `test-${Date.now()}@example.com`,
    phone: '555-0123',
    status: 'active',
    created_by: userId,
    source: 'test'
  };
  
  const { data: newClient, error: clientError } = await supabase
    .from('clients')
    .insert(testClient)
    .select()
    .single();
  
  if (clientError) {
    console.log('   ❌ Failed to create test client:', clientError.message);
  } else {
    console.log('   ✅ Test client created successfully!');
    console.log('      ID:', newClient.id);
    console.log('      Email:', newClient.email);
  }
  
  console.log('\n✅ FIX COMPLETE!');
  console.log('   User sam@atlas-gyms.co.uk can now create clients');
  console.log('   Organization: Atlas Fitness Harrogate');
}

fixUserOrgLink().catch(console.error);
