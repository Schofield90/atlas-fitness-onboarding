#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAdminAccess() {
  console.log('🔧 Fixing admin access for sam@atlas-gyms.co.uk...\n');

  try {
    // Step 1: Get user ID for sam@atlas-gyms.co.uk
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'sam@atlas-gyms.co.uk')
      .single();

    if (userError) {
      console.log('⚠️  User not found in users table, checking auth.users...');
      
      // Try direct query to auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        return;
      }

      const samUser = authUser.users.find(u => u.email === 'sam@atlas-gyms.co.uk');
      
      if (!samUser) {
        console.error('❌ User sam@atlas-gyms.co.uk not found in auth.users');
        console.log('\n💡 Please make sure you are logged in with sam@atlas-gyms.co.uk');
        return;
      }

      console.log('✅ Found user in auth.users:', samUser.id);

      // Step 2: Check if super_admin_users table exists
      const { data: tables, error: tableError } = await supabase
        .from('super_admin_users')
        .select('id')
        .limit(1);

      if (tableError && tableError.code === '42P01') {
        console.log('⚠️  Table super_admin_users does not exist. Creating it...');
        
        // Create the table
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS public.super_admin_users (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
              role TEXT NOT NULL DEFAULT 'admin',
              is_active BOOLEAN DEFAULT true,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(user_id)
            );
          `
        });

        if (createError) {
          console.log('⚠️  Could not create table via RPC. Table might need to be created manually.');
        }
      }

      // Step 3: Insert or update super admin access
      const { data: adminData, error: adminError } = await supabase
        .from('super_admin_users')
        .upsert({
          user_id: samUser.id,
          role: 'admin',  // Using 'admin' instead of 'super_admin' to avoid enum issues
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (adminError) {
        console.error('❌ Error granting admin access:', adminError);
        console.log('\n📝 Manual SQL fix:');
        console.log(`
INSERT INTO public.super_admin_users (user_id, role, is_active)
VALUES ('${samUser.id}', 'admin', true)
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin',
  is_active = true,
  updated_at = NOW();
        `);
        return;
      }

      console.log('✅ Admin access granted successfully!');
      console.log('   User ID:', samUser.id);
      console.log('   Email:', samUser.email);
      console.log('   Role: admin');
      console.log('   Active: true');

      // Step 4: Verify the entry
      const { data: verification, error: verifyError } = await supabase
        .from('super_admin_users')
        .select('*')
        .eq('user_id', samUser.id)
        .single();

      if (!verifyError && verification) {
        console.log('\n✅ Verification successful! Admin access is configured.');
        console.log('\n🚀 You can now access the admin dashboard at:');
        console.log('   https://atlas-fitness-onboarding.vercel.app/admin/dashboard');
      } else {
        console.log('⚠️  Could not verify the entry:', verifyError);
      }

    } else {
      // User found in users table
      console.log('✅ Found user:', users.email);
      
      // Continue with the same process for users table user
      const { data: adminData, error: adminError } = await supabase
        .from('super_admin_users')
        .upsert({
          user_id: users.id,
          role: 'admin',
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (adminError) {
        console.error('❌ Error granting admin access:', adminError);
        return;
      }

      console.log('✅ Admin access granted successfully!');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixAdminAccess();