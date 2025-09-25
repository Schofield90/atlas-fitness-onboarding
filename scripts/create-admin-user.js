#!/usr/bin/env node

/**
 * Create Admin User Script
 * This script creates an admin user through Supabase Auth
 * and sets them up as a platform owner
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.log('\nRequired variables:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  console.log('\nGet the service key from:');
  console.log('Supabase Dashboard > Settings > API > Service Role Key');
  console.log('\nAdd to .env.local:');
  console.log('SUPABASE_SERVICE_KEY=eyJ...');
  process.exit(1);
}

// Create Supabase client with service key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser(email, password) {
  console.log('🔧 Creating Admin User');
  console.log('======================\n');

  // Validate email domain
  if (!email.endsWith('@gymleadhub.co.uk')) {
    console.error('❌ Email must end with @gymleadhub.co.uk for admin access');
    console.log('   Example: admin@gymleadhub.co.uk');
    process.exit(1);
  }

  try {
    console.log(`📧 Email: ${email}`);

    // Step 1: Check if user already exists
    console.log('\n1️⃣ Checking if user exists...');
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId;

    if (existingUser) {
      console.log('   ✅ User already exists');
      userId = existingUser.id;

      // Update password if provided
      if (password) {
        console.log('   🔐 Updating password...');
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          userId,
          {
            password,
            email_confirm: true
          }
        );

        if (updateError) {
          console.error('   ❌ Failed to update password:', updateError.message);
        } else {
          console.log('   ✅ Password updated');
        }
      }
    } else {
      // Create new user
      console.log('   📝 Creating new user...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          is_platform_admin: true
        }
      });

      if (createError) {
        console.error('   ❌ Failed to create user:', createError.message);
        process.exit(1);
      }

      userId = newUser.user.id;
      console.log('   ✅ User created successfully');
      console.log(`   🆔 User ID: ${userId}`);
    }

    // Step 2: Add to super_admin_users table
    console.log('\n2️⃣ Setting up admin access...');

    const { data: adminData, error: adminError } = await supabase
      .from('super_admin_users')
      .upsert({
        user_id: userId,
        role: 'platform_owner',
        is_active: true,
        permissions: ['all']
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (adminError) {
      console.error('   ⚠️  Could not update super_admin_users:', adminError.message);
      console.log('   Run the SQL script to fix this:');
      console.log('   scripts/fix-admin-auth.sql');
    } else {
      console.log('   ✅ Admin access granted');
      console.log('   🎭 Role: platform_owner');
    }

    // Step 3: Update profiles if table exists
    console.log('\n3️⃣ Updating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        role: 'admin',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.log('   ⚠️  Could not update profile:', profileError.message);
    } else {
      console.log('   ✅ Profile updated');
    }

    // Success!
    console.log('\n✅ SUCCESS!');
    console.log('===========\n');
    console.log('You can now login at:');
    console.log('🌐 URL: https://admin.gymleadhub.co.uk/signin');
    console.log(`📧 Email: ${email}`);
    console.log('🔑 Password: [as provided]');
    console.log('\n📝 Troubleshooting:');
    console.log('- Clear browser cookies if login fails');
    console.log('- Check browser console for errors');
    console.log('- Ensure domain is correctly configured');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const email = args[0];
const password = args[1];

// Show usage if no arguments
if (!email || !password) {
  console.log('Usage: node create-admin-user.js <email> <password>');
  console.log('');
  console.log('Example:');
  console.log('  node create-admin-user.js admin@gymleadhub.co.uk MySecurePassword123!');
  console.log('');
  console.log('Note: Email must end with @gymleadhub.co.uk');
  process.exit(1);
}

// Run the script
createAdminUser(email, password);