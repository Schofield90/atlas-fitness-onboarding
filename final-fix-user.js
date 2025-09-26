const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

async function finalFix() {
  const userId = '9e7148f7-cc40-41a8-bc6e-54b8b2252e85';
  const orgId = '59439a33-09b0-4816-89e8-7b4837e0f985';
  
  console.log('🔧 FINAL FIX - Creating user record with service role...\n');
  
  // Step 1: Insert into public.users with service role (bypasses RLS)
  console.log('1. Creating user in public.users...');
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: 'sam@atlas-gyms.co.uk',
      name: 'Sam Schofield',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (userError) {
    if (userError.code === '23505') {
      console.log('   ✅ User already exists');
    } else {
      console.log('   ❌ Failed:', userError.message);
      console.log('      Code:', userError.code);
      console.log('      Details:', userError.details);
      return;
    }
  } else {
    console.log('   ✅ User created successfully');
  }
  
  // Step 2: Create organization membership
  console.log('\n2. Creating organization membership...');
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      user_id: userId,
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
  
  console.log('\n✅ ALL FIXED!');
  console.log('   sam@atlas-gyms.co.uk can now create clients');
  console.log('   Try creating a member again at http://localhost:3000/members/new');
}

finalFix().catch(console.error);
