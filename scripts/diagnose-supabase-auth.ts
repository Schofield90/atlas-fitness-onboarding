#!/usr/bin/env tsx

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables:");
  if (!SUPABASE_URL) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  if (!SERVICE_ROLE_KEY) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

console.log("🔍 Diagnosing Supabase Auth Configuration\n");
console.log("📌 Supabase URL:", SUPABASE_URL);
console.log("📌 Service Role Key:", SERVICE_ROLE_KEY.substring(0, 20) + "...\n");

async function diagnoseAuth() {
  try {
    // Create admin client
    const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Test listing users
    console.log("1️⃣ Testing user list access...");
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("❌ Failed to list users:", listError.message);
      console.error("   This suggests the service role key may not have proper permissions.");
      return;
    }
    
    console.log("✅ Can list users. Found", users?.users?.length || 0, "existing users");

    // 2. Check if auth.users table has RLS enabled
    console.log("\n2️⃣ Checking auth schema access...");
    const { data: authCheck, error: authError } = await supabaseAdmin
      .from("auth.users")
      .select("id")
      .limit(1);
    
    if (authError) {
      console.log("⚠️  Cannot directly query auth.users (expected - this is normal)");
      console.log("   Auth operations should go through the Admin API");
    } else {
      console.log("✅ Can query auth.users directly (unusual but not problematic)");
    }

    // 3. Try to create a test user
    const testEmail = `test-${Date.now()}@example.com`;
    console.log("\n3️⃣ Attempting to create test user:", testEmail);
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: "TestPassword123!",
      email_confirm: true,
      user_metadata: {
        role: "test",
        created_by: "diagnostic-script",
      },
    });

    if (createError) {
      console.error("❌ Failed to create user:", createError.message);
      console.error("   Error details:", JSON.stringify(createError, null, 2));
      
      // Check if it's a specific error
      if (createError.message.includes("duplicate")) {
        console.log("   → User already exists");
      } else if (createError.message.includes("password")) {
        console.log("   → Password policy issue");
      } else if (createError.message.includes("disabled")) {
        console.log("   → User signups may be disabled in the Supabase dashboard");
        console.log("\n📝 TO FIX: Go to Supabase Dashboard > Authentication > Providers");
        console.log("   Make sure 'Enable Email Provider' is ON");
        console.log("   Check 'Enable Email Confirmations' settings");
      }
      return;
    }

    console.log("✅ Successfully created test user:", newUser?.user?.email);
    console.log("   User ID:", newUser?.user?.id);

    // 4. Try to sign in with the test user
    console.log("\n4️⃣ Testing sign-in with new user...");
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: testEmail,
      password: "TestPassword123!",
    });

    if (signInError) {
      console.error("❌ Failed to sign in:", signInError.message);
    } else {
      console.log("✅ Successfully signed in");
      console.log("   Session access token:", signInData?.session?.access_token?.substring(0, 20) + "...");
    }

    // 5. Clean up - delete test user
    console.log("\n5️⃣ Cleaning up test user...");
    if (newUser?.user?.id) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      if (deleteError) {
        console.error("⚠️  Failed to delete test user:", deleteError.message);
      } else {
        console.log("✅ Test user deleted");
      }
    }

    // 6. Check auth settings via API
    console.log("\n6️⃣ Checking project configuration...");
    
    // Try to get auth config (this might not work depending on permissions)
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        apikey: SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });

    if (response.ok) {
      const settings = await response.json();
      console.log("✅ Auth settings retrieved:");
      console.log("   - Email enabled:", settings?.external?.email?.enabled);
      console.log("   - Signups enabled:", settings?.disable_signup === false);
      console.log("   - Email confirmations:", settings?.external?.email?.confirm);
    } else {
      console.log("⚠️  Cannot retrieve auth settings (may require different permissions)");
    }

    console.log("\n✨ Diagnosis complete!");
    console.log("\nIf user creation is failing, check:");
    console.log("1. Supabase Dashboard > Authentication > Providers > Email is enabled");
    console.log("2. Supabase Dashboard > Authentication > Settings > User Signups is enabled");
    console.log("3. Service role key has full permissions (regenerate if needed)");
    console.log("4. No RLS policies are blocking auth operations");

  } catch (error) {
    console.error("\n❌ Unexpected error during diagnosis:", error);
    if (error instanceof Error) {
      console.error("   Error message:", error.message);
      console.error("   Stack trace:", error.stack);
    }
  }
}

// Run diagnosis
diagnoseAuth().catch(console.error);