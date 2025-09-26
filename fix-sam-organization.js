const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

async function fixSamOrganization() {
  console.log('🔧 Fixing sam@gymleadhub.co.uk organization link...\n');
  
  // Step 1: Find sam
  const { data: users } = await supabase.auth.admin.listUsers();
  const sam = users?.users?.find(u => u.email === 'sam@gymleadhub.co.uk');
  
  if (!sam) {
    console.log('❌ User sam@gymleadhub.co.uk not found');
    return;
  }
  
  console.log('✅ Found user:', sam.id);
  
  // Step 2: Find existing organization
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .or('email.eq.sam@gymleadhub.co.uk,slug.eq.atlas-fitness-test,slug.eq.gymleadhub-admin')
    .limit(1);
  
  let orgId;
  
  if (orgs && orgs.length > 0) {
    console.log('✅ Found existing organization:', orgs[0].name);
    orgId = orgs[0].id;
    
    // Update owner_id if needed
    if (orgs[0].owner_id !== sam.id) {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ owner_id: sam.id })
        .eq('id', orgId);
      
      if (updateError) {
        console.log('⚠️ Could not update owner_id:', updateError.message);
      } else {
        console.log('✅ Updated organization owner');
      }
    }
  } else {
    // Create new org with unique slug
    console.log('📝 Creating new organization...');
    const uniqueSlug = `atlas-fitness-${Date.now()}`;
    
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert({
        name: 'Atlas Fitness',
        slug: uniqueSlug,
        email: 'sam@gymleadhub.co.uk',
        owner_id: sam.id
      })
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Failed to create organization:', createError.message);
      return;
    }
    
    console.log('✅ Created organization:', newOrg.id);
    orgId = newOrg.id;
  }
  
  // Step 3: Create or update member link
  console.log('\n🔗 Creating member link...');
  
  // Check if link exists
  const { data: existingLink } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', sam.id)
    .eq('organization_id', orgId)
    .maybeSingle();
  
  if (existingLink) {
    console.log('✅ Member link already exists');
  } else {
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        user_id: sam.id,
        organization_id: orgId,
        role: 'owner',
        is_active: true
      });
    
    if (memberError) {
      console.log('❌ Failed to create member link:', memberError);
      console.log('Error code:', memberError.code);
      console.log('Error details:', memberError.details);
    } else {
      console.log('✅ Created member link');
    }
  }
  
  // Step 4: Test creating a client
  console.log('\n🧪 Testing client creation...');
  
  const clientData = {
    org_id: orgId,
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
    console.log('❌ Failed to create client:', clientError.message);
    console.log('Error code:', clientError.code);
    return;
  }
  
  console.log('✅ Successfully created client!');
  console.log('   ID:', newClient.id);
  console.log('   Name:', newClient.first_name, newClient.last_name);
  console.log('   Email:', newClient.email);
  
  console.log('\n🎉 SUCCESS! You can now:');
  console.log('1. Log in as sam@gymleadhub.co.uk');
  console.log('2. Navigate to http://localhost:3000/members/new');
  console.log('3. Create clients successfully');
  console.log('\nOrganization ID:', orgId);
}

fixSamOrganization().catch(console.error);
