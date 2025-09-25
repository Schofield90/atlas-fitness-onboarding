#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

// Production Supabase credentials
const supabaseUrl = "https://lzlrojoaxrqvmhempnkn.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProdMigration() {
  console.log("🔍 Checking GoTeamUp Migration in Production\n");
  
  // 1. Check if migration was applied by looking for the table
  console.log("1. Checking client_invitations table...");
  const { data: invitations, error: tableError } = await supabase
    .from("client_invitations")
    .select("*")
    .limit(5);
  
  if (tableError) {
    if (tableError.code === '42P01') {
      console.log("   ❌ Table does not exist - migration not applied");
      console.log("\n⚠️  The migration needs to be applied to production!");
      console.log("Run: npm run migrate:prod");
      return false;
    } else {
      console.log(`   Error: ${tableError.message}`);
      return false;
    }
  }
  
  console.log(`   ✅ Table exists with ${invitations?.length || 0} sample records`);
  
  // 2. Check for a specific client's invitation
  console.log("\n2. Checking Sam's invitation...");
  const { data: samClient, error: samError } = await supabase
    .from("clients")
    .select("id, email, first_name, last_name, password_hash, password_required")
    .eq("email", "samschofield90@hotmail.co.uk")
    .single();
  
  if (samClient) {
    console.log(`   Found Sam's client record:`);
    console.log(`   - ID: ${samClient.id}`);
    console.log(`   - Name: ${samClient.first_name} ${samClient.last_name}`);
    console.log(`   - Password Hash: ${samClient.password_hash ? 'Set' : 'Not set'}`);
    console.log(`   - Password Required: ${samClient.password_required}`);
    
    // Check for invitation
    const { data: samInvitation } = await supabase
      .from("client_invitations")
      .select("invitation_token, claimed, created_at")
      .eq("client_id", samClient.id)
      .single();
    
    if (samInvitation) {
      console.log(`\n   Sam's invitation:`);
      console.log(`   - Token: ${samInvitation.invitation_token}`);
      console.log(`   - Claimed: ${samInvitation.claimed}`);
      console.log(`   - Created: ${samInvitation.created_at}`);
      
      if (!samInvitation.claimed && !samClient.password_hash) {
        console.log(`\n   🔗 Sam's invitation URL:`);
        console.log(`      https://members.gymleadhub.co.uk/claim/${samInvitation.invitation_token}`);
      }
    } else {
      console.log(`   No invitation found for Sam`);
    }
  }
  
  // 3. Check functions
  console.log("\n3. Testing functions...");
  
  // Try to generate an invitation (will fail with specific client but proves function exists)
  const { error: funcError } = await supabase
    .rpc("generate_client_invitation", { 
      p_client_id: '00000000-0000-0000-0000-000000000000' 
    });
  
  if (funcError) {
    if (funcError.message.includes('Client not found')) {
      console.log("   ✅ generate_client_invitation function exists");
    } else if (funcError.message.includes('does not exist')) {
      console.log("   ❌ Function does not exist");
    } else {
      console.log(`   Function error: ${funcError.message}`);
    }
  }
  
  // 4. Summary
  console.log("\n" + "=".repeat(50));
  if (!tableError) {
    console.log("✅ GoTeamUp migration has been applied!");
    console.log("\nNext steps:");
    console.log("1. Test login at: https://members.gymleadhub.co.uk/simple-login");
    console.log("2. Clients without passwords need their invitation links");
    return true;
  }
  
  return false;
}

checkProdMigration().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error("Error:", error);
  process.exit(1);
});