#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

// Production Supabase credentials
const supabaseUrl = "https://lzlrojoaxrqvmhempnkn.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdminTable() {
  console.log("🔍 Checking super_admin_users table...\n");
  
  // Try to query the table
  const { data, error } = await supabase
    .from("super_admin_users")
    .select("*")
    .limit(1);
  
  if (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log("❌ Table 'super_admin_users' does NOT exist!");
      console.log("\n📋 SQL to create it:\n");
      
      const createTableSQL = `
-- Create super_admin_users table for GymLeadHub platform admins
CREATE TABLE IF NOT EXISTS super_admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"all": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_super_admin_users_user_id ON super_admin_users(user_id);
CREATE INDEX idx_super_admin_users_email ON super_admin_users(email);
CREATE INDEX idx_super_admin_users_active ON super_admin_users(is_active);

-- Enable RLS
ALTER TABLE super_admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only super admins can view super admins
CREATE POLICY "Super admins can view all" ON super_admin_users
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM super_admin_users WHERE is_active = true
    )
  );

-- RLS Policy: Service role can manage
CREATE POLICY "Service role full access" ON super_admin_users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Add first admin user (you'll need to update this with a real user)
-- First create a user in Supabase Auth, then insert them here
-- Example:
-- INSERT INTO super_admin_users (email, full_name, role)
-- VALUES ('admin@gymleadhub.co.uk', 'Admin User', 'super_admin');
`;
      
      console.log(createTableSQL);
      console.log("\n⚠️  Copy the SQL above and run it in:");
      console.log("   https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql");
      
    } else {
      console.log("Error checking table:", error.message);
    }
  } else {
    console.log("✅ Table 'super_admin_users' exists!");
    
    // Count admins
    const { count } = await supabase
      .from("super_admin_users")
      .select("*", { count: 'exact', head: true });
    
    console.log(`\n📊 Current admin users: ${count || 0}`);
    
    if (count === 0) {
      console.log("\n⚠️  No admin users found!");
      console.log("You need to create an admin user first.");
    } else {
      // List admin emails
      const { data: admins } = await supabase
        .from("super_admin_users")
        .select("email, is_active, role");
      
      console.log("\n📋 Admin users:");
      admins?.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.role}) ${admin.is_active ? '✅' : '❌'}`);
      });
    }
  }
}

checkAdminTable().catch(console.error);