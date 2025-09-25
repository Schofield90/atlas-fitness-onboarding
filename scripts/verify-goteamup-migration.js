#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

// Production Supabase credentials
const supabaseUrl = "https://lzlrojoaxrqvmhempnkn.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
});

async function verifyMigration() {
  console.log("🔍 Verifying GoTeamUp Migration Status\n");
  
  try {
    // 1. Check if client_invitations table exists
    console.log("1. Checking if client_invitations table exists...");
    
    const { data: tables, error: tableError } = await supabase.rpc('get_table_names', {
      schema_name: 'public'
    }).catch(() => ({ data: null, error: 'Function not found' }));
    
    // Alternative way to check
    const { data: testInvitation, error: inviteError } = await supabase
      .from("client_invitations")
      .select("id")
      .limit(1);
    
    if (!inviteError || inviteError.code === 'PGRST116') {
      console.log("   ✅ client_invitations table exists");
    } else if (inviteError.code === '42P01') {
      console.log("   ❌ client_invitations table does NOT exist");
      console.log("   ⚠️  Migration needs to be applied to production");
      return;
    } else {
      console.log(`   ⚠️  Unexpected error: ${inviteError.message}`);
    }
    
    // 2. Check if functions exist
    console.log("\n2. Checking if functions exist...");
    
    // Test generate_client_invitation function
    const { error: genError } = await supabase
      .rpc("generate_client_invitation", { p_client_id: '00000000-0000-0000-0000-000000000000' })
      .catch(err => ({ error: err }));
    
    if (!genError || genError.message.includes('Client not found')) {
      console.log("   ✅ generate_client_invitation function exists");
    } else if (genError.message.includes('does not exist')) {
      console.log("   ❌ generate_client_invitation function does NOT exist");
    } else {
      console.log(`   ⚠️  Function exists but returned: ${genError.message}`);
    }
    
    // Test claim_client_invitation function  
    const { error: claimError } = await supabase
      .rpc("claim_client_invitation", { 
        p_token: 'test',
        p_password_hash: 'test'
      })
      .catch(err => ({ error: err }));
    
    if (!claimError || claimError.message.includes('Invalid invitation')) {
      console.log("   ✅ claim_client_invitation function exists");
    } else if (claimError.message.includes('does not exist')) {
      console.log("   ❌ claim_client_invitation function does NOT exist");
    } else {
      console.log(`   ⚠️  Function exists`);
    }
    
    // 3. Check if columns were added to clients table
    console.log("\n3. Checking if new columns exist in clients table...");
    
    const { data: sampleClient, error: clientError } = await supabase
      .from("clients")
      .select("id, password_hash, password_required, invitation_sent_at")
      .limit(1)
      .single();
    
    if (!clientError || clientError.code === 'PGRST116') {
      console.log("   ✅ All new columns exist in clients table");
      if (sampleClient) {
        console.log(`      - password_hash: ${sampleClient.password_hash ? 'Set' : 'Not set'}`);
        console.log(`      - password_required: ${sampleClient.password_required}`);
        console.log(`      - invitation_sent_at: ${sampleClient.invitation_sent_at || 'Not set'}`);
      }
    } else {
      console.log(`   ❌ Error checking columns: ${clientError.message}`);
    }
    
    // 4. Check if any invitations were generated
    console.log("\n4. Checking existing invitations...");
    
    const { count: inviteCount, error: countError } = await supabase
      .from("client_invitations")
      .select("*", { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`   📊 Total invitations in database: ${inviteCount}`);
      
      // Get some sample invitations
      const { data: samples, error: sampleError } = await supabase
        .from("client_invitations")
        .select("invitation_token, claimed, created_at")
        .limit(3);
      
      if (samples && samples.length > 0) {
        console.log("   📋 Sample invitations:");
        samples.forEach((inv, i) => {
          console.log(`      ${i+1}. Token: ${inv.invitation_token.substring(0, 8)}...`);
          console.log(`         Claimed: ${inv.claimed}, Created: ${inv.created_at}`);
        });
      }
    } else {
      console.log(`   ⚠️  Could not count invitations: ${countError.message}`);
    }
    
    // 5. Check view
    console.log("\n5. Checking client_invitation_status view...");
    
    const { data: viewData, error: viewError } = await supabase
      .from("client_invitation_status")
      .select("email, invitation_status")
      .limit(1);
    
    if (!viewError) {
      console.log("   ✅ client_invitation_status view exists");
      if (viewData && viewData.length > 0) {
        console.log(`      Sample: ${viewData[0].email} - ${viewData[0].invitation_status}`);
      }
    } else {
      console.log(`   ❌ View error: ${viewError.message}`);
    }
    
    console.log("\n📊 Migration Status Summary:");
    console.log("================================");
    
    if (!inviteError && !genError && !claimError && !clientError && !viewError) {
      console.log("✅ All GoTeamUp migration components are present!");
      console.log("The system is ready for use.");
    } else {
      console.log("⚠️  Some migration components are missing.");
      console.log("The migration may need to be applied to production.");
    }
    
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

// Run verification
verifyMigration().then(() => {
  console.log("\n🎉 Verification completed!");
  process.exit(0);
}).catch(error => {
  console.error("Verification failed:", error);
  process.exit(1);
});