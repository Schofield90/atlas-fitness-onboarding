#!/usr/bin/env tsx

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("🔍 Testing Supabase Signup\n");

async function testSignup() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";
  
  console.log(`📧 Attempting to sign up: ${testEmail}`);
  
  // Try to sign up a new user
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        test_user: true,
        created_at: new Date().toISOString()
      }
    }
  });
  
  if (error) {
    console.error("❌ Signup failed:", error.message);
    console.error("   Error code:", error.code);
    console.error("   Error status:", error.status);
    
    if (error.message.includes("not enabled")) {
      console.log("\n⚠️  User signups appear to be disabled!");
      console.log("📝 To fix: Go to Supabase Dashboard > Authentication > Settings");
      console.log("   Enable 'Allow new users to sign up'");
    }
    return;
  }
  
  if (data.user) {
    console.log("✅ User created successfully!");
    console.log("   User ID:", data.user.id);
    console.log("   Email:", data.user.email);
    console.log("   Confirmed:", data.user.email_confirmed_at ? "Yes" : "No");
    
    if (data.session) {
      console.log("✅ Session created!");
      console.log("   Access token:", data.session.access_token.substring(0, 20) + "...");
    } else {
      console.log("⚠️  No session created (email confirmation may still be required)");
    }
    
    // Try to sign in
    console.log("\n📧 Testing sign in...");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error("❌ Sign in failed:", signInError.message);
    } else if (signInData.session) {
      console.log("✅ Sign in successful!");
    }
  }
}

testSignup().catch(console.error);