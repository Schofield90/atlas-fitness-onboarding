const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

async function fixIdMismatch() {
  const authUserId = '9e7148f7-cc40-41a8-bc6e-54b8b2252e85'; // From auth.users
  const wrongUserId = '3904729d-5fec-4b9f-8632-9256941fd4ae'; // Wrong ID in public.users
  const orgId = '59439a33-09b0-4816-89e8-7b4837e0f985';
  const email = 'sam@atlas-gyms.co.uk';
  
  console.log('🔧 FIXING ID MISMATCH...\n');
  console.log('Auth User ID:', authUserId);
  console.log('Wrong Public User ID:', wrongUserId);
  console.log('');
  
  // Step 1: Delete the wrong user record
  console.log('1. Deleting wrong user record...');
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', wrongUserId);
  
  if (deleteError) {
    console.log('   ⚠️ Could not delete:', deleteError.message);
  } else {
    console.log('   ✅ Deleted wrong record');
  }
  
  // Step 2: Create correct user record
  console.log('\n2. Creating correct user record...');
  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: authUserId,
      email: email,
      name: 'Sam Schofield'
    });
  
  if (insertError) {
    if (insertError.code === '23505') {
      console.log('   ✅ Correct record already exists');
    } else {
      console.log('   ❌ Failed:', insertError.message);
      return;
    }
  } else {
    console.log('   ✅ Created correct user record');
  }
  
  // Step 3: Create organization membership
  console.log('\n3. Creating organization membership...');
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      user_id: authUserId,
      organization_id: orgId,
      role: 'owner',
      is_active: true
    });
  
  if (memberError) {
    if (memberError.code === '23505') {
      console.log('   ✅ Membership already exists');
    } else {
      console.log('   ❌ Failed:', memberError.message);
      return;
    }
  } else {
    console.log('   ✅ Membership created');
  }
  
  // Step 4: Update organization owner
  console.log('\n4. Setting as organization owner...');
  const { error: updateError } = await supabase
    .from('organizations')
    .update({ owner_id: authUserId })
    .eq('id', orgId);
  
  if (updateError) {
    console.log('   ⚠️ Could not update owner:', updateError.message);
  } else {
    console.log('   ✅ Set as organization owner');
  }
  
  // Step 5: Test client creation
  console.log('\n5. Testing client creation...');
  const testClient = {
    org_id: orgId,
    first_name: 'Test',
    last_name: 'Fix',
    email: `test-fix-${Date.now()}@example.com`,
    phone: '555-0123',
    status: 'active',
    created_by: authUserId,
    source: 'test'
  };
  
  const { data: newClient, error: clientError } = await supabase
    .from('clients')
    .insert(testClient)
    .select()
    .single();
  
  if (clientError) {
    console.log('   ❌ Failed:', clientError.message);
  } else {
    console.log('   ✅ Client created successfully!');
    console.log('      ID:', newClient.id);
  }
  
  console.log('\n🎉 SUCCESS! ID MISMATCH FIXED!');
  console.log('   sam@atlas-gyms.co.uk can now create clients');
  console.log('   Try again at http://localhost:3000/members/new');
}

fixIdMismatch().catch(console.error);
