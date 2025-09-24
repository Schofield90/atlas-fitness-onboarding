const { createClient } = require('@supabase/supabase-js');

// Use service role key to bypass RLS
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAuth() {
  console.log('Checking sam@atlas-gyms.co.uk authentication setup...\n');
  
  // 1. Check if user exists in auth.users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError.message);
    return;
  }
  
  const samUser = users.find(u => u.email === 'sam@atlas-gyms.co.uk');
  
  if (!samUser) {
    console.log('❌ User sam@atlas-gyms.co.uk NOT found in auth.users!');
    console.log('\nCreating user...');
    
    // Create the user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'sam@atlas-gyms.co.uk',
      password: 'Gyms2020!',
      email_confirm: true
    });
    
    if (createError) {
      console.error('❌ Error creating user:', createError.message);
      return;
    }
    
    console.log('✅ User created:', newUser.user.id);
    return;
  }
  
  console.log('✅ User found in auth.users');
  console.log('   ID:', samUser.id);
  console.log('   Email:', samUser.email);
  console.log('   Created:', samUser.created_at);
  
  // 2. Check organization_staff membership
  const { data: staffData, error: staffError } = await supabase
    .from('organization_staff')
    .select('*')
    .eq('user_id', samUser.id);
  
  console.log('\n📋 Organization Staff Records:');
  if (staffData && staffData.length > 0) {
    staffData.forEach(s => {
      console.log(`   - Org: ${s.organization_id}, Role: ${s.role}, Active: ${s.is_active}`);
    });
  } else {
    console.log('   ❌ No staff records found');
    
    // Create staff record
    console.log('\n   Creating staff record...');
    const { error: insertError } = await supabase
      .from('organization_staff')
      .insert({
        user_id: samUser.id,
        organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
        role: 'owner',
        is_active: true
      });
    
    if (insertError) {
      console.log('   ❌ Error creating staff record:', insertError.message);
    } else {
      console.log('   ✅ Staff record created');
    }
  }
  
  // 3. Check organization_members
  const { data: memberData, error: memberError } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', samUser.id);
    
  console.log('\n📋 Organization Members Records:');
  if (memberData && memberData.length > 0) {
    memberData.forEach(m => {
      console.log(`   - Org: ${m.organization_id}, Role: ${m.role}, Active: ${m.is_active}`);
    });
  } else {
    console.log('   ❌ No member records found');
    
    // Create member record
    console.log('\n   Creating member record...');
    const { error: insertError } = await supabase
      .from('organization_members')
      .insert({
        user_id: samUser.id,
        organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
        role: 'owner',
        is_active: true
      });
    
    if (insertError) {
      console.log('   ❌ Error creating member record:', insertError.message);
    } else {
      console.log('   ✅ Member record created');
    }
  }
  
  // 4. Check organizations table
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, owner_id')
    .eq('id', '63589490-8f55-4157-bd3a-e141594b748e')
    .single();
    
  console.log('\n🏢 Organization:');
  if (orgData) {
    console.log('   ✅ Found:', orgData.name);
    console.log('   Owner ID:', orgData.owner_id);
    
    if (orgData.owner_id !== samUser.id) {
      console.log('   ⚠️ Owner mismatch! Updating...');
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ owner_id: samUser.id })
        .eq('id', '63589490-8f55-4157-bd3a-e141594b748e');
        
      if (updateError) {
        console.log('   ❌ Error updating owner:', updateError.message);
      } else {
        console.log('   ✅ Owner updated');
      }
    }
  } else {
    console.log('   ❌ Organization not found!');
  }
  
  console.log('\n✅ Setup complete! Try logging in now.');
}

checkAuth();