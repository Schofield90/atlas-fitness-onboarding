#!/usr/bin/env tsx

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log("🔍 Debugging Auth User Creation Issue\n");

async function debugAuthIssue() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log("1️⃣  Checking if we can query the public schema...");
  
  // Check if there's a public.profiles or public.users table that might have a trigger
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['profiles', 'users', 'user_profiles', 'user_metadata']);

  if (tablesError) {
    // Try a different approach - check common tables
    console.log("   Checking for profiles table...");
    const { error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (!profilesError) {
      console.log("   ✅ Found 'profiles' table");
      
      // Check if profiles has a trigger for new users
      const { data: profileData, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (!profileCheckError && profileData) {
        console.log("   Profile table structure:", Object.keys(profileData[0] || {}));
      }
    } else {
      console.log("   ❌ No 'profiles' table found or accessible");
    }
  } else {
    console.log("   Found tables:", tables?.map(t => t.table_name).join(', '));
  }

  console.log("\n2️⃣  Checking organizations and related tables...");
  
  // Check if organization-related tables might be blocking
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(1);
  
  if (!orgError) {
    console.log("   ✅ Organizations table is accessible");
  }

  console.log("\n3️⃣  Testing database function to create user (bypassing auth)...");
  
  // Try to insert directly into a profiles table if it exists
  const testUserId = crypto.randomUUID();
  const testEmail = `test-${Date.now()}@example.com`;
  
  const { error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: testUserId,
      email: testEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  
  if (insertError) {
    console.log("   ❌ Cannot insert into profiles:", insertError.message);
    console.log("   This might be blocking auth.users creation if there's a trigger");
  } else {
    console.log("   ✅ Can insert into profiles table");
    
    // Clean up test data
    await supabase.from('profiles').delete().eq('id', testUserId);
  }

  console.log("\n4️⃣  Checking for custom auth functions...");
  
  // List all functions in public schema
  const { data: functions, error: funcError } = await supabase.rpc(
    'pg_catalog.pg_proc',
    {},
    { count: 'exact' }
  ).select('proname');
  
  if (!funcError && functions) {
    const authRelated = functions.filter((f: any) => 
      f.proname?.includes('user') || 
      f.proname?.includes('auth') || 
      f.proname?.includes('signup')
    );
    
    if (authRelated.length > 0) {
      console.log("   Found auth-related functions:", authRelated.map((f: any) => f.proname).join(', '));
    }
  }

  console.log("\n📝 Common Causes of 'Database error creating new user':");
  console.log("1. Trigger on auth.users failing (check Database → Functions)");
  console.log("2. Trigger on public.profiles or public.users failing");
  console.log("3. Custom auth hook failing (check Authentication → Hooks)");
  console.log("4. RLS policy on related table blocking inserts");
  console.log("5. Database storage quota exceeded");
  console.log("6. Missing required columns in profiles table");
  
  console.log("\n🔧 Suggested Fix:");
  console.log("1. Go to Supabase Dashboard → Database → Functions");
  console.log("2. Look for any function with 'user' in the name");
  console.log("3. Check if there's a handle_new_user() function");
  console.log("4. Edit the function and add error handling or temporarily disable it");
}

debugAuthIssue().catch(console.error);