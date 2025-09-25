#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY');
  console.log('You need to add the service key to your .env.local file');
  console.log('Get it from: Supabase Dashboard > Settings > API > Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyAdminSetup() {
  console.log('🔍 VERIFYING ADMIN SETUP');
  console.log('========================\n');

  try {
    // 1. Check for admin users in auth.users
    console.log('1️⃣ Checking for @gymleadhub.co.uk users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Error listing users:', usersError.message);
      return;
    }

    const adminUsers = users.users.filter(u => u.email?.endsWith('@gymleadhub.co.uk'));

    if (adminUsers.length === 0) {
      console.log('❌ No @gymleadhub.co.uk users found');
      console.log('\n📝 To create an admin user:');
      console.log('1. Go to Supabase Dashboard > Authentication > Users');
      console.log('2. Click "Invite user"');
      console.log('3. Enter email: yourname@gymleadhub.co.uk');
      console.log('4. They will receive an invite email to set password');
      return;
    }

    console.log(`✅ Found ${adminUsers.length} admin user(s):`);
    for (const user of adminUsers) {
      console.log(`   - ${user.email} (ID: ${user.id})`);
      console.log(`     Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`     Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    }

    // 2. Check super_admin_users table
    console.log('\n2️⃣ Checking super_admin_users table...');
    const { data: superAdmins, error: superAdminError } = await supabase
      .from('super_admin_users')
      .select('*')
      .eq('is_active', true);

    if (superAdminError) {
      console.log('⚠️  Could not query super_admin_users:', superAdminError.message);
    } else {
      console.log(`✅ Found ${superAdmins?.length || 0} active super admin(s)`);
    }

    // 3. Provide login instructions
    console.log('\n========================');
    console.log('📋 LOGIN INSTRUCTIONS');
    console.log('========================\n');

    console.log('To login as admin:');
    console.log('1. Go to: https://admin.gymleadhub.co.uk/signin');
    console.log('2. Enter your email: yourname@gymleadhub.co.uk');
    console.log('3. Enter your password');
    console.log('\nIf you forgot your password:');
    console.log('1. Go to: https://admin.gymleadhub.co.uk/signin');
    console.log('2. Click "Forgot password?"');
    console.log('3. Enter your email to receive reset link');

    // 4. Test a sample login (optional)
    if (adminUsers.length > 0) {
      console.log('\n========================');
      console.log('🔐 PASSWORD RESET OPTION');
      console.log('========================\n');
      console.log('To set/reset password for an admin user programmatically:');
      console.log(`node scripts/reset-admin-password.js ${adminUsers[0].email} newpassword123`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyAdminSetup();