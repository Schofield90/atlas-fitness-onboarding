#!/usr/bin/env tsx

import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("🔍 Checking Supabase Auth Configuration\n");

async function checkAuthConfig() {
  // Check auth settings endpoint
  console.log("1️⃣ Checking auth configuration endpoint...");
  
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        'apikey': ANON_KEY,
      }
    });
    
    if (response.ok) {
      const settings = await response.json();
      console.log("✅ Auth settings retrieved:");
      console.log(JSON.stringify(settings, null, 2));
    } else {
      console.log(`⚠️  Auth settings endpoint returned: ${response.status} ${response.statusText}`);
      const text = await response.text();
      if (text) {
        console.log("Response:", text);
      }
    }
  } catch (error) {
    console.error("❌ Failed to fetch auth settings:", error);
  }
  
  // Check if we can reach the signup endpoint
  console.log("\n2️⃣ Testing signup endpoint directly...");
  
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
      })
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    const result = await response.json();
    console.log("   Response:", JSON.stringify(result, null, 2));
    
    if (result.error_description) {
      console.log("\n🔍 Error Analysis:");
      if (result.error_description.includes("Database error")) {
        console.log("   → Database issue detected");
        console.log("   → This could be:");
        console.log("     1. RLS policies blocking inserts to auth.users");
        console.log("     2. Database triggers failing");
        console.log("     3. Custom auth hooks failing");
        console.log("     4. Database connection issues");
      }
      if (result.error_description.includes("not enabled")) {
        console.log("   → Signups are disabled in project settings");
      }
    }
  } catch (error) {
    console.error("❌ Failed to test signup endpoint:", error);
  }
  
  console.log("\n📝 Next Steps:");
  console.log("1. Check Supabase Dashboard > Authentication > Settings");
  console.log("2. Ensure 'Allow new users to sign up' is ON");
  console.log("3. Check for any Auth Hooks that might be failing");
  console.log("4. Check Database > Functions for any auth triggers");
  console.log("5. Try creating a user manually in the dashboard");
}

checkAuthConfig().catch(console.error);