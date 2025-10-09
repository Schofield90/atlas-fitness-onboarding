#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.development.local');
config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetDemoUser() {
  console.log('🔧 Resetting demo user: test@test.co.uk\n');

  const targetEmail = 'test@test.co.uk';
  const targetPassword = 'Test123';
  const orgId = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';

  // Try to find existing user by email
  console.log('Checking for existing user...');
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing users:', listError.message);
    console.log('\nThis might be a database permission issue.');
    console.log('Trying alternative approach via direct API call...\n');
  }

  const existingUser = users?.find(u => u.email === targetEmail);

  if (existingUser) {
    console.log(`✅ Found existing user: ${existingUser.id}`);

    // Update password
    console.log('Updating password...');
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: targetPassword }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError.message);
    } else {
      console.log('✅ Password updated successfully');
    }

    // Ensure email is confirmed
    if (!existingUser.email_confirmed_at) {
      console.log('Confirming email...');
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { email_confirm: true }
      );

      if (confirmError) {
        console.error('❌ Error confirming email:', confirmError.message);
      } else {
        console.log('✅ Email confirmed');
      }
    }

    // Check organization link
    const { data: orgLink, error: orgError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', existingUser.id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!orgLink) {
      console.log('Creating organization link...');
      const { error: linkError } = await supabase
        .from('user_organizations')
        .upsert({
          user_id: existingUser.id,
          organization_id: orgId,
          role: 'admin'
        });

      if (linkError) {
        console.error('❌ Error linking organization:', linkError.message);
      } else {
        console.log('✅ Organization linked');
      }
    }

    // Check staff record
    const { data: staffRecord, error: staffCheckError } = await supabase
      .from('organization_staff')
      .select('*')
      .eq('email', targetEmail)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!staffRecord) {
      console.log('Creating staff record...');
      const { error: staffError } = await supabase
        .from('organization_staff')
        .upsert({
          user_id: existingUser.id,
          organization_id: orgId,
          name: 'Test User',
          email: targetEmail,
          phone_number: '07123456789',
          role: 'owner'
        }, { onConflict: 'organization_id,email' });

      if (staffError) {
        console.error('❌ Error creating staff record:', staffError.message);
      } else {
        console.log('✅ Staff record created');
      }
    }

  } else {
    console.log('User not found, creating new user...');

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: targetEmail,
      password: targetPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'User'
      }
    });

    if (createError) {
      console.error('❌ Error creating user:', createError.message);
      process.exit(1);
    }

    console.log(`✅ User created: ${newUser.user.id}`);

    // Link to organization
    console.log('Linking to organization...');
    const { error: linkError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: newUser.user.id,
        organization_id: orgId,
        role: 'admin'
      });

    if (linkError) {
      console.error('❌ Error linking organization:', linkError.message);
    } else {
      console.log('✅ Organization linked');
    }

    // Create staff record
    const { error: staffError } = await supabase
      .from('organization_staff')
      .insert({
        user_id: newUser.user.id,
        organization_id: orgId,
        name: 'Test User',
        email: targetEmail,
        phone_number: '07123456789',
        role: 'owner'
      });

    if (staffError) {
      console.error('❌ Error creating staff record:', staffError.message);
    } else {
      console.log('✅ Staff record created');
    }
  }

  console.log('\n✅ Demo user reset complete!');
  console.log('\nLogin credentials:');
  console.log('  Email: test@test.co.uk');
  console.log('  Password: Test123');
  console.log('  URL: https://login.gymleadhub.co.uk/owner-login');
}

resetDemoUser().catch(console.error);
