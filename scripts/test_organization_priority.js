const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

async function testOrganizationPriority() {
  console.log("🔍 Testing organization priority for sam@atlas-gyms.co.uk\n");
  
  // Get the user
  const { data: users } = await supabase.auth.admin.listUsers();
  const samUser = users?.users?.find(u => u.email === 'sam@atlas-gyms.co.uk');
  
  if (!samUser) {
    console.log("❌ User not found");
    return;
  }
  
  const userId = samUser.id;
  console.log("✅ User ID:", userId);
  
  // Simulate the new priority logic from get-organization API
  console.log("\n📋 Simulating new organization priority logic:\n");
  
  // Step 1: Check for owned organization first
  console.log("1. Checking organizations table for owner_id:", userId);
  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', userId)
    .maybeSingle();
    
  let orgId = null;
  let userRole = 'member';
  
  if (ownedOrg) {
    orgId = ownedOrg.id;
    userRole = 'owner';
    console.log("   ✅ Found organization by owner_id:", ownedOrg);
  } else {
    console.log("   ❌ No owned organization found");
    
    // Step 2: Fall back to user_organizations table
    console.log("\n2. Checking user_organizations table:");
    const { data: userOrgData } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', userId)
      .limit(1);
      
    if (userOrgData && userOrgData.length > 0) {
      orgId = userOrgData[0].organization_id;
      userRole = userOrgData[0].role;
      console.log("   ✅ Found organization via user_organizations:", userOrgData[0]);
    } else {
      console.log("   ❌ No organization found in user_organizations");
    }
  }
  
  console.log("\n🎯 Final result:");
  console.log("   Organization ID:", orgId);
  console.log("   User Role:", userRole);
  
  if (orgId) {
    // Fetch organization details
    const { data: orgDetails } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
      
    console.log("   Organization Name:", orgDetails?.name);
    console.log("   Organization Slug:", orgDetails?.slug);
    
    // Check clients in this organization
    const { data: clients, count } = await supabase
      .from('clients')
      .select('id, email, first_name, last_name', { count: 'exact' })
      .eq('org_id', orgId);
      
    console.log("\n📊 Clients in selected organization:");
    console.log("   Total count:", count);
    if (clients && clients.length > 0) {
      console.log("   Clients:");
      clients.forEach(c => {
        console.log(`     - ${c.first_name || 'No name'} ${c.last_name || ''} (${c.email})`);
      });
    }
  }
  
  process.exit(0);
}

testOrganizationPriority().catch(console.error);
