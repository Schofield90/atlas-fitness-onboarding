#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkEnum() {
  console.log('🔍 Checking admin_role enum values and table structure...\n');

  try {
    // First, let's see what's in the table already
    const { data: existingAdmins, error: fetchError } = await supabase
      .from('super_admin_users')
      .select('*')
      .limit(5);

    if (!fetchError && existingAdmins) {
      console.log('📊 Existing super_admin_users entries:');
      console.log(JSON.stringify(existingAdmins, null, 2));
    }

    // Get sam's user ID
    const { data: samUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'sam@atlas-gyms.co.uk')
      .single();

    if (samUser) {
      console.log('\n👤 Sam\'s user ID:', samUser.id);
      
      // Try to insert with different role values
      const rolesToTry = ['owner', 'super_admin', 'admin', 'platform_admin', 'root'];
      
      for (const role of rolesToTry) {
        console.log(`\n🧪 Trying role: "${role}"`);
        
        const { data, error } = await supabase
          .from('super_admin_users')
          .upsert({
            user_id: samUser.id,
            role: role,
            is_active: true
          }, {
            onConflict: 'user_id'
          })
          .select();

        if (!error) {
          console.log(`✅ SUCCESS with role: "${role}"`);
          console.log('   Entry created:', data);
          break;
        } else {
          console.log(`❌ Failed with role "${role}":`, error.message);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkEnum();