const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrgs() {
  const memberId = '126059c3-3970-4db0-bccb-b66e5d948632';
  const staffEmail = 'sam@atlas-gyms.co.uk';
  
  // Get member's org
  const { data: member } = await supabase
    .from('clients')
    .select('id, org_id, first_name, last_name')
    .eq('id', memberId)
    .single();
    
  console.log('Member:', member);
  
  // Get staff user
  const { data: staffUsers } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', staffEmail);
    
  console.log('\nStaff users:', staffUsers);
  
  if (staffUsers && staffUsers.length > 0) {
    for (const staffUser of staffUsers) {
      // Check user_organizations
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('*')
        .eq('user_id', staffUser.id);
        
      console.log(`\nuser_organizations for ${staffUser.id}:`, userOrg);
      
      // Check organization_staff
      const { data: orgStaff } = await supabase
        .from('organization_staff')
        .select('*')
        .eq('user_id', staffUser.id);
        
      console.log(`organization_staff for ${staffUser.id}:`, orgStaff);
    }
  }
}

checkOrgs();
