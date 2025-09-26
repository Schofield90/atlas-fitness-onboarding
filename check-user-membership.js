const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

async function checkMembership() {
  const userId = '9e7148f7-cc40-41a8-bc6e-54b8b2252e85';
  const orgId = '59439a33-09b0-4816-89e8-7b4837e0f985';
  
  console.log('🔍 Checking membership for:');
  console.log('   User ID:', userId);
  console.log('   Org ID:', orgId);
  console.log('');
  
  // Get user info
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  console.log('👤 User email:', authUser?.user?.email);
  
  // Get org info
  const { data: org } = await supabase
    .from('organizations')
    .select('name, slug, owner_id')
    .eq('id', orgId)
    .single();
  console.log('🏢 Organization:', org?.name, '(', org?.slug, ')');
  console.log('   Owner ID:', org?.owner_id);
  console.log('');
  
  // Check organization_members
  const { data: membership } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .maybeSingle();
  
  if (membership) {
    console.log('✅ User IS a member of this organization');
    console.log('   Role:', membership.role);
    console.log('   Active:', membership.is_active);
  } else {
    console.log('❌ User is NOT a member of this organization');
    
    // Check what org they ARE a member of
    const { data: userMemberships } = await supabase
      .from('organization_members')
      .select('organization_id, role, organizations(name, slug)')
      .eq('user_id', userId);
    
    if (userMemberships && userMemberships.length > 0) {
      console.log('\nUser is a member of these organizations:');
      userMemberships.forEach(m => {
        console.log('  -', m.organizations?.name, '(', m.organizations?.slug, ') - Role:', m.role);
      });
    } else {
      console.log('\n⚠️ User has NO organization memberships');
    }
    
    console.log('\n🔧 FIXING: Adding user to organization...');
    const { error: addError } = await supabase
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: orgId,
        role: 'owner',
        is_active: true
      });
    
    if (addError) {
      console.log('❌ Failed to add membership:', addError.message);
    } else {
      console.log('✅ Successfully added user as owner of organization');
    }
  }
}

checkMembership().catch(console.error);
