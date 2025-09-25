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
  console.log('\n📝 To get your service key:');
  console.log('1. Go to Supabase Dashboard');
  console.log('2. Settings > API');
  console.log('3. Copy the "service_role" key (starts with eyJ...)');
  console.log('4. Add to .env.local as SUPABASE_SERVICE_KEY=...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetAdminPassword(email, newPassword) {
  console.log('🔐 ADMIN PASSWORD RESET');
  console.log('=======================\n');

  if (!email || !newPassword) {
    console.log('Usage: node reset-admin-password.js <email> <password>');
    console.log('Example: node reset-admin-password.js admin@gymleadhub.co.uk MyNewPass123!');
    process.exit(1);
  }

  if (!email.endsWith('@gymleadhub.co.uk')) {
    console.error('❌ Email must end with @gymleadhub.co.uk for admin access');
    process.exit(1);
  }

  try {
    // Check if user exists
    console.log(`Looking for user: ${email}`);
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find(u => u.email === email);

    let userId;

    if (!existingUser) {
      // Create new user
      console.log('User not found, creating new admin user...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          role: 'admin'
        }
      });

      if (createError) {
        console.error('❌ Failed to create user:', createError.message);
        process.exit(1);
      }

      userId = newUser.user.id;
      console.log('✅ Admin user created');
    } else {
      // Update existing user's password
      userId = existingUser.id;
      console.log('User found, updating password...');

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          password: newPassword,
          email_confirm: true
        }
      );

      if (updateError) {
        console.error('❌ Failed to update password:', updateError.message);
        process.exit(1);
      }

      console.log('✅ Password updated');
    }

    // Ensure user is in super_admin_users table
    console.log('Setting up admin access...');
    const { error: adminError } = await supabase
      .from('super_admin_users')
      .upsert({
        user_id: userId,
        role: 'platform_owner',
        is_active: true,
        permissions: ['all'],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (adminError) {
      console.log('⚠️  Could not update super_admin_users:', adminError.message);
    } else {
      console.log('✅ Admin access configured');
    }

    console.log('\n========================');
    console.log('✅ SUCCESS!');
    console.log('========================\n');
    console.log('You can now login at:');
    console.log('URL: https://admin.gymleadhub.co.uk/signin');
    console.log(`Email: ${email}`);
    console.log(`Password: [set as provided]`);
    console.log('\nAlternative login URLs:');
    console.log('- https://login.gymleadhub.co.uk/admin');
    console.log('- https://login.gymleadhub.co.uk/owner-login');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get command line arguments
const [,, email, password] = process.argv;
resetAdminPassword(email, password);