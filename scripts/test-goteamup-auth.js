#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

// Use the actual Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lzlrojoaxrqvmhempnkn.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testGoTeamUpAuth() {
  console.log("🔍 Testing GoTeamUp-style Authentication System\n");
  
  try {
    // 1. Check if client exists
    const testEmail = "test@example.com";
    console.log(`1. Checking for test client with email: ${testEmail}`);
    
    const { data: existingClient, error: checkError } = await supabase
      .from("clients")
      .select(`
        id,
        email,
        first_name,
        last_name,
        organization_id,
        password_hash,
        password_required,
        client_invitations (
          invitation_token,
          claimed
        )
      `)
      .eq("email", testEmail)
      .single();
    
    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking client:", checkError);
      return;
    }
    
    let clientId;
    let invitationToken;
    
    if (!existingClient) {
      console.log("   ❌ Client not found, creating test client...");
      
      // Get a sample organization
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .limit(1)
        .single();
      
      if (!org) {
        console.error("No organizations found. Please create an organization first.");
        return;
      }
      
      // Create test client
      const { data: newClient, error: createError } = await supabase
        .from("clients")
        .insert({
          email: testEmail,
          first_name: "Test",
          last_name: "User",
          organization_id: org.id
        })
        .select()
        .single();
      
      if (createError) {
        console.error("Error creating client:", createError);
        return;
      }
      
      clientId = newClient.id;
      console.log(`   ✅ Created test client with ID: ${clientId}`);
    } else {
      clientId = existingClient.id;
      console.log(`   ✅ Found existing client with ID: ${clientId}`);
      
      if (existingClient.client_invitations?.[0]) {
        invitationToken = existingClient.client_invitations[0].invitation_token;
        const claimed = existingClient.client_invitations[0].claimed;
        console.log(`   📧 Existing invitation token: ${invitationToken}`);
        console.log(`   📌 Invitation claimed: ${claimed}`);
      }
    }
    
    // 2. Generate invitation if needed
    if (!invitationToken) {
      console.log("\n2. Generating invitation for client...");
      
      const { data: inviteResult, error: inviteError } = await supabase
        .rpc("generate_client_invitation", { p_client_id: clientId });
      
      if (inviteError) {
        console.error("Error generating invitation:", inviteError);
        return;
      }
      
      invitationToken = inviteResult;
      console.log(`   ✅ Generated invitation token: ${invitationToken}`);
    }
    
    // 3. Check invitation status
    console.log("\n3. Checking invitation status...");
    
    const { data: invitation, error: inviteCheckError } = await supabase
      .from("client_invitations")
      .select(`
        *,
        clients (
          email,
          first_name,
          last_name
        ),
        organizations (
          name
        )
      `)
      .eq("invitation_token", invitationToken)
      .single();
    
    if (inviteCheckError) {
      console.error("Error checking invitation:", inviteCheckError);
      return;
    }
    
    console.log(`   ✅ Invitation found:`);
    console.log(`      - Client: ${invitation.clients.first_name} ${invitation.clients.last_name}`);
    console.log(`      - Email: ${invitation.clients.email}`);
    console.log(`      - Organization: ${invitation.organizations.name}`);
    console.log(`      - Claimed: ${invitation.claimed}`);
    console.log(`      - Created: ${invitation.created_at}`);
    
    // 4. Display invitation URL
    console.log("\n4. Invitation URLs:");
    console.log(`   🔗 Local: http://localhost:3000/claim/${invitationToken}`);
    console.log(`   🔗 Production: https://members.gymleadhub.co.uk/claim/${invitationToken}`);
    
    // 5. Test claim process (only if not already claimed)
    if (!invitation.claimed) {
      console.log("\n5. Testing claim process...");
      
      // Generate a test password hash
      const crypto = require("crypto");
      const testPassword = "TestPassword123!";
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.pbkdf2Sync(testPassword, salt, 10000, 64, "sha512").toString("hex");
      const passwordHash = `${salt}:${hash}`;
      
      const { data: claimResult, error: claimError } = await supabase
        .rpc("claim_client_invitation", {
          p_token: invitationToken,
          p_password_hash: passwordHash
        });
      
      if (claimError) {
        console.error("Error claiming invitation:", claimError);
        return;
      }
      
      if (claimResult && claimResult[0]) {
        const result = claimResult[0];
        if (result.success) {
          console.log(`   ✅ Invitation claimed successfully!`);
          console.log(`      - Client ID: ${result.client_id}`);
          console.log(`      - Email: ${result.email}`);
          console.log(`      - Test Password: ${testPassword}`);
        } else {
          console.log(`   ❌ Failed to claim: ${result.message}`);
        }
      }
    } else {
      console.log("\n5. Invitation already claimed - client can login with their password");
    }
    
    // 6. Check client_invitation_status view
    console.log("\n6. Checking client invitation status view...");
    
    const { data: statusView, error: viewError } = await supabase
      .from("client_invitation_status")
      .select("*")
      .eq("email", testEmail)
      .single();
    
    if (viewError) {
      console.error("Error checking status view:", viewError);
      return;
    }
    
    console.log(`   ✅ Status from view:`);
    console.log(`      - Status: ${statusView.invitation_status}`);
    console.log(`      - Password Required: ${statusView.password_required}`);
    console.log(`      - Password Set At: ${statusView.password_set_at || "Not set"}`);
    
    console.log("\n✅ GoTeamUp-style authentication system is working correctly!");
    
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

// Run the test
testGoTeamUpAuth().then(() => {
  console.log("\n🎉 Test completed!");
  process.exit(0);
}).catch(error => {
  console.error("Test failed:", error);
  process.exit(1);
});