#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

// Production Supabase credentials
const supabaseUrl = "https://lzlrojoaxrqvmhempnkn.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkGoTeamUpStatus() {
  console.log("🔍 Checking GoTeamUp Migration Status\n");
  console.log("=" .repeat(50));
  
  let migrationApplied = false;
  
  // 1. Check if client_invitations table exists
  console.log("\n1️⃣  Checking if client_invitations table exists...");
  const { data: invitations, error: tableError } = await supabase
    .from("client_invitations")
    .select("id")
    .limit(1);
  
  if (tableError) {
    if (tableError.code === '42P01' || tableError.message.includes('does not exist')) {
      console.log("   ❌ Table does NOT exist - migration not applied");
      console.log("\n⚠️  MIGRATION NEEDS TO BE APPLIED!");
      console.log("\nTo apply the migration:");
      console.log("1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql");
      console.log("2. Copy the SQL chunks from above and run them");
      return false;
    } else {
      console.log(`   ⚠️  Unexpected error: ${tableError.message}`);
    }
  } else {
    console.log("   ✅ Table EXISTS!");
    migrationApplied = true;
    
    // Count invitations
    const { count } = await supabase
      .from("client_invitations")
      .select("*", { count: 'exact', head: true });
    
    console.log(`   📊 Total invitations: ${count}`);
  }
  
  if (!migrationApplied) return false;
  
  // 2. Check functions
  console.log("\n2️⃣  Checking database functions...");
  const { error: funcError } = await supabase
    .rpc("generate_client_invitation", { 
      p_client_id: '00000000-0000-0000-0000-000000000000' 
    });
  
  if (funcError) {
    if (funcError.message.includes('Client not found')) {
      console.log("   ✅ Functions exist and working");
    } else if (funcError.message.includes('does not exist')) {
      console.log("   ❌ Functions missing");
    }
  }
  
  // 3. Check Sam's account
  console.log("\n3️⃣  Checking Sam's account status...");
  const { data: samClient } = await supabase
    .from("clients")
    .select("id, email, first_name, last_name, password_hash, password_required")
    .eq("email", "samschofield90@hotmail.co.uk")
    .single();
  
  if (samClient) {
    console.log(`   ✅ Found Sam's account`);
    console.log(`      Name: ${samClient.first_name} ${samClient.last_name}`);
    console.log(`      Password set: ${samClient.password_hash ? 'Yes' : 'No'}`);
    
    // Check for invitation
    const { data: samInvitation } = await supabase
      .from("client_invitations")
      .select("invitation_token, claimed")
      .eq("client_id", samClient.id)
      .single();
    
    if (samInvitation) {
      console.log(`      Invitation exists: Yes`);
      console.log(`      Claimed: ${samInvitation.claimed ? 'Yes' : 'No'}`);
      
      if (!samInvitation.claimed && !samClient.password_hash) {
        console.log(`\n   🔗 Sam's invitation URL:`);
        console.log(`      https://members.gymleadhub.co.uk/claim/${samInvitation.invitation_token}`);
      } else if (samInvitation.claimed) {
        console.log(`\n   ✅ Sam can login with password at:`);
        console.log(`      https://members.gymleadhub.co.uk/simple-login`);
      }
    } else {
      console.log(`      ⚠️  No invitation found for Sam`);
    }
  }
  
  // 4. Summary
  console.log("\n" + "=".repeat(50));
  if (migrationApplied) {
    console.log("✅ GoTeamUp Migration is ACTIVE!");
    console.log("\nSystem is ready for:");
    console.log("• New clients to receive invitation links");
    console.log("• Existing clients to set passwords via invitations");
    console.log("• Password-only login at members.gymleadhub.co.uk/simple-login");
  } else {
    console.log("❌ GoTeamUp Migration NOT Applied");
    console.log("Run the migration chunks in Supabase SQL Editor");
  }
  
  return migrationApplied;
}

checkGoTeamUpStatus().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});