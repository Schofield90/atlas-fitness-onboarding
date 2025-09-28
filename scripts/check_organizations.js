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

async function checkOrganizations() {
  console.log("🔍 Checking organizations and clients for sam@atlas-gyms.co.uk\n");
  
  // Get the user
  const { data: users } = await supabase.auth.admin.listUsers();
  const samUser = users?.users?.find(u => u.email === 'sam@atlas-gyms.co.uk');
  
  if (!samUser) {
    console.log("❌ User not found");
    return;
  }
  
  console.log("✅ User found:", samUser.id);
  
  // Check all organizations for this user
  const { data: userOrgs } = await supabase
    .from('user_organizations')
    .select('organization_id, role')
    .eq('user_id', samUser.id);
    
  console.log("\n📋 User's organizations from user_organizations:");
  console.log(userOrgs);
  
  // Check organizations owned by this user
  const { data: ownedOrgs } = await supabase
    .from('organizations')
    .select('id, name, slug, email')
    .eq('owner_id', samUser.id);
    
  console.log("\n📋 Organizations owned by user:");
  console.log(ownedOrgs);
  
  // Check all organizations with specific names
  const { data: atlasOrgs } = await supabase
    .from('organizations')
    .select('id, name, slug, owner_id, email')
    .or('name.ilike.%atlas%,slug.ilike.%atlas%,name.ilike.%gym%');
    
  console.log("\n📋 All Atlas/Gym-related organizations:");
  atlasOrgs?.forEach(org => {
    console.log(`  - ${org.name} (${org.id})`);
    console.log(`    slug: ${org.slug}, owner: ${org.owner_id}`);
  });
  
  // Check clients for each organization
  for (const org of atlasOrgs || []) {
    const { data: clients, count } = await supabase
      .from('clients')
      .select('id, email, first_name, last_name, created_at, status', { count: 'exact' })
      .eq('org_id', org.id);
      
    console.log(`\n📊 Clients in ${org.name} (${org.id}):`);
    console.log(`  Total count: ${count}`);
    if (clients && clients.length > 0) {
      console.log("  All clients:");
      clients.forEach(c => {
        console.log(`    - ${c.first_name || 'No first name'} ${c.last_name || 'No last name'} (${c.email}) - Status: ${c.status}`);
      });
    }
  }
  
  // Also check if there are clients with organization_id field
  const { data: clientsWithOrgId } = await supabase
    .from('clients')
    .select('id, email, first_name, last_name, organization_id, org_id')
    .not('organization_id', 'is', null)
    .limit(5);
    
  if (clientsWithOrgId && clientsWithOrgId.length > 0) {
    console.log("\n⚠️ Found clients with organization_id field (not org_id):");
    clientsWithOrgId.forEach(c => {
      console.log(`  - ${c.email}: organization_id=${c.organization_id}, org_id=${c.org_id}`);
    });
  }
  
  process.exit(0);
}

checkOrganizations().catch(console.error);
