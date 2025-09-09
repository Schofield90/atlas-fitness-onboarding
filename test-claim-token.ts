import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with anon key to simulate public access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testClaimToken(token: string) {
  console.log("Testing claim token:", token);
  console.log("=".repeat(50));

  // Step 1: Try to fetch the token
  console.log("\n1. Fetching token from account_claim_tokens...");
  const { data: tokenData, error: tokenError } = await supabase
    .from("account_claim_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (tokenError) {
    console.error("❌ Token fetch error:", tokenError);
    console.error("Error code:", tokenError.code);
    console.error("Error message:", tokenError.message);
    console.error("Error details:", tokenError.details);
    console.error("Error hint:", tokenError.hint);
  } else {
    console.log("✅ Token data:", JSON.stringify(tokenData, null, 2));
    
    if (tokenData) {
      // Step 2: Try to fetch the client
      console.log("\n2. Fetching client with ID:", tokenData.client_id);
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, email, phone, date_of_birth")
        .eq("id", tokenData.client_id)
        .single();

      if (clientError) {
        console.error("❌ Client fetch error:", clientError);
        console.error("Error code:", clientError.code);
        console.error("Error message:", clientError.message);
        console.error("Error details:", clientError.details);
        console.error("Error hint:", clientError.hint);
        
        // Try to debug RLS
        console.log("\n3. Checking RLS function...");
        const { data: rlsCheck, error: rlsError } = await supabase
          .rpc("has_valid_claim_token", { client_id_param: tokenData.client_id });
        
        if (rlsError) {
          console.error("❌ RLS function error:", rlsError);
        } else {
          console.log("RLS function result:", rlsCheck);
        }
      } else {
        console.log("✅ Client data:", JSON.stringify(clientData, null, 2));
      }
      
      // Check token status
      console.log("\n4. Token status:");
      console.log("- Expired:", tokenData.expires_at ? new Date(tokenData.expires_at) < new Date() : "No expiry (permanent)");
      console.log("- Claimed:", tokenData.claimed_at ? `Yes (at ${tokenData.claimed_at})` : "No");
    }
  }
}

// Get token from command line
const token = process.argv[2];
if (!token) {
  console.error("Please provide a token as an argument");
  console.error("Usage: npx tsx test-claim-token.ts YOUR_TOKEN_HERE");
  process.exit(1);
}

testClaimToken(token);