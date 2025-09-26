const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

async function checkUsersTable() {
  const targetUserId = '9e7148f7-cc40-41a8-bc6e-54b8b2252e85';
  
  console.log('🔍 Checking users table...\n');
  
  // Get ALL users
  const { data: allUsers, error } = await supabase
    .from('users')
    .select('id, email, name, created_at')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  console.log(`Found ${allUsers?.length || 0} users:\n`);
  
  let foundTarget = false;
  allUsers?.forEach((user, i) => {
    const isTarget = user.id === targetUserId;
    if (isTarget) foundTarget = true;
    
    console.log(`${i + 1}. ${isTarget ? '👉' : '  '} ${user.email}`);
    console.log(`     ID: ${user.id}`);
    console.log(`     Name: ${user.name || '(no name)'}`);
    console.log('');
  });
  
  if (!foundTarget) {
    console.log('❌ User ID', targetUserId, 'NOT found in users table');
    console.log('\n🔧 Attempting direct SQL insert...');
    
    // Try a raw SQL approach
    const { data, error: insertError } = await supabase.rpc('exec_sql', {
      query: `
        INSERT INTO public.users (id, email, name)
        VALUES ('${targetUserId}', 'sam@atlas-gyms.co.uk', 'Sam Schofield')
        ON CONFLICT (id) DO NOTHING
        RETURNING *;
      `
    }).catch(err => {
      // exec_sql might not exist, try normal insert
      return supabase.from('users').upsert({
        id: targetUserId,
        email: 'sam@atlas-gyms.co.uk',
        name: 'Sam Schofield'
      }, { onConflict: 'id' });
    });
    
    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
    } else {
      console.log('✅ User inserted successfully');
    }
  } else {
    console.log('✅ User sam@atlas-gyms.co.uk found in users table');
  }
}

checkUsersTable().catch(console.error);
