#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAdminUser(email, password) {
  try {
    console.log(`\n🔧 Setting up admin user: ${email}`);

    // Check if user exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email);

    let userId;

    if (userExists) {
      console.log('✅ User already exists in auth.users');
      userId = existingUser.users.find(u => u.email === email).id;

      // Update password if provided
      if (password) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          userId,
          { password }
        );

        if (updateError) {
          console.error('❌ Failed to update password:', updateError.message);
        } else {
          console.log('✅ Password updated');
        }
      }
    } else {
      // Create new user
      console.log('Creating new admin user...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'super_admin'
        }
      });

      if (createError) {
        console.error('❌ Failed to create user:', createError.message);
        return;
      }

      userId = newUser.user.id;
      console.log('✅ Admin user created');
    }

    // Set up super admin access in database
    const { error: dbError } = await supabase.rpc('ensure_admin_user', {
      admin_email: email
    });

    if (dbError) {
      console.error('⚠️  Database setup warning:', dbError.message);
    } else {
      console.log('✅ Database admin access configured');
    }

    console.log('\n✅ Admin user setup complete!');
    console.log('📝 Login at: https://login.gymleadhub.co.uk/admin');
    console.log(`📧 Email: ${email}`);
    if (password) {
      console.log(`🔑 Password: [set as provided]`);
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const email = args[0];
const password = args[1];

if (!email || !email.endsWith('@gymleadhub.co.uk')) {
  console.log('Usage: node setup-admin-user.js <email@gymleadhub.co.uk> <password>');
  console.log('Note: Email must end with @gymleadhub.co.uk for admin access');
  process.exit(1);
}

if (!password) {
  console.log('⚠️  No password provided - will only configure existing user');
}

setupAdminUser(email, password).then(() => process.exit(0));