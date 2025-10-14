import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSamAdmin() {
  console.log('\n🔍 Checking for Sam admin accounts...\n');

  const emails = ['sam@gymleadhub.co.uk', 'sam@atlas-gyms.co.uk'];

  for (const email of emails) {
    // Query auth.users via admin API
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error(`❌ Error fetching users:`, error);
      continue;
    }

    const user = users.find(u => u.email === email);

    if (user) {
      console.log(`✅ FOUND: ${email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}\n`);
    } else {
      console.log(`❌ NOT FOUND: ${email}\n`);
    }
  }
}

checkSamAdmin();
