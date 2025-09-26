const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

async function debug() {
  const userId = '9e7148f7-cc40-41a8-bc6e-54b8b2252e85';
  
  console.log('🔍 Debugging user issue...\n');
  
  // Check auth.users
  console.log('1. Checking auth.users...');
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  
  if (authError) {
    console.log('   ❌ Error getting auth user:', authError.message);
  } else if (authUser?.user) {
    console.log('   ✅ Found in auth.users');
    console.log('      Email:', authUser.user.email);
    console.log('      Created:', authUser.user.created_at);
  } else {
    console.log('   ❌ User NOT found in auth.users');
  }
  
  // Check public.users
  console.log('\n2. Checking public.users...');
  const { data: publicUser, error: publicError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  if (publicError) {
    console.log('   ❌ Error:', publicError.message);
  } else if (publicUser) {
    console.log('   ✅ Found in public.users');
    console.log('      Email:', publicUser.email);
    console.log('      Name:', publicUser.name);
  } else {
    console.log('   ❌ User NOT found in public.users');
    
    // The issue is auth.users exists but public.users doesn't
    // The foreign key references auth.users, not public.users
    console.log('\n3. Testing direct insert into organization_members...');
    
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: '59439a33-09b0-4816-89e8-7b4837e0f985',
        role: 'owner',
        is_active: true
      });
    
    if (memberError) {
      console.log('   ❌ Insert failed:', memberError.message);
      console.log('      Code:', memberError.code);
      console.log('      Details:', memberError.details);
    } else {
      console.log('   ✅ Successfully inserted membership!');
    }
  }
}

debug().catch(console.error);
