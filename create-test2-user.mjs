import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join('/Users/Sam/atlas-fitness-onboarding', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createTestUser() {
  console.log('Creating test2@test.co.uk user...\n');

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'test2@test.co.uk',
      password: 'Test123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User 2'
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('✅ User already exists - resetting password...');

        // Update password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          authData?.user?.id || (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === 'test2@test.co.uk').id,
          { password: 'Test123' }
        );

        if (updateError) {
          console.error('❌ Failed to update password:', updateError.message);
        } else {
          console.log('✅ Password updated successfully');
        }
        return;
      }
      throw authError;
    }

    console.log('✅ Auth user created:', authData.user.id);
    console.log('Email:', authData.user.email);
    console.log('Confirmed:', authData.user.email_confirmed_at ? 'Yes' : 'No');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestUser();
