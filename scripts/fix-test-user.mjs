#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjMzNzA5MCwiZXhwIjoyMDM3OTEzMDkwfQ.6yNl1g10KG8KHlYV94f5xPCQqkBBUd_lG1QZzXLTAIg';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixTestUser() {
  console.log('🔧 Fixing test user password...\n');

  // Delete existing user
  console.log('Deleting old user...');
  const { error: deleteError } = await supabase.auth.admin.deleteUser('bb9e8f7d-fc7e-45e6-9d29-d43e866d3b5b');
  if (deleteError && !deleteError.message.includes('not found')) {
    console.error('Error deleting user:', deleteError);
  } else {
    console.log('✅ Old user deleted');
  }

  // Create new user
  console.log('\nCreating new user...');
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: 'test@test.co.uk',
    password: 'Test123',
    email_confirm: true,
    user_metadata: {
      first_name: 'Test',
      last_name: 'User'
    }
  });

  if (createError) {
    console.error('❌ Error creating user:', createError);
    process.exit(1);
  }

  console.log('✅ User created:', newUser.user.id);

  // Update organization links
  console.log('\nLinking to organization...');
  const orgId = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';

  const { error: linkError } = await supabase
    .from('user_organizations')
    .upsert({
      user_id: newUser.user.id,
      organization_id: orgId,
      role: 'admin'
    }, { onConflict: 'user_id,organization_id' });

  if (linkError) {
    console.error('Error linking to organization:', linkError);
  } else {
    console.log('✅ Linked to organization');
  }

  // Update staff record
  const { error: staffError } = await supabase
    .from('organization_staff')
    .upsert({
      user_id: newUser.user.id,
      organization_id: orgId,
      name: 'Test User',
      email: 'test@test.co.uk',
      phone_number: '07123456789',
      role: 'owner'
    }, { onConflict: 'organization_id,email' });

  if (staffError) {
    console.error('Error updating staff:', staffError);
  } else {
    console.log('✅ Staff record updated');
  }

  console.log('\n✅ Test user is ready!');
  console.log('\nLogin credentials:');
  console.log('  Email: test@test.co.uk');
  console.log('  Password: Test123');
  console.log('  URL: https://login.gymleadhub.co.uk');
}

fixTestUser().catch(console.error);
