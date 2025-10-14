import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables');
  console.error('URL:', supabaseUrl);
  console.error('Key:', serviceRoleKey ? 'Present' : 'Missing');
  process.exit(1);
}

console.log('Connecting to:', supabaseUrl);

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSamAdmin() {
  // Find sam@gymleadhub.co.uk user
  const { data: userData, error: userError } = await client.auth.admin.listUsers();

  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }

  console.log('\n📋 Total users in database:', userData.users.length);

  const samUser = userData.users.find(u => u.email === 'sam@gymleadhub.co.uk');

  if (!samUser) {
    console.log('\n❌ sam@gymleadhub.co.uk not found!');
    console.log('\nUsers with "sam" in email:');
    userData.users
      .filter(u => u.email?.toLowerCase().includes('sam'))
      .forEach(u => console.log(`  - ${u.email} (${u.id})`));
    return;
  }

  console.log('\n✅ Found sam@gymleadhub.co.uk');
  console.log('User ID:', samUser.id);
  console.log('Email Confirmed:', samUser.email_confirmed_at ? 'Yes' : 'No');
  console.log('Created:', new Date(samUser.created_at).toLocaleString());

  // This is an ADMIN account - it doesn't need organization membership!
  // Admin portal (/admin) is separate from gym dashboard (/dashboard)
  console.log('\n📌 IMPORTANT: This is a SaaS admin account');
  console.log('   Admin portal: admin.gymleadhub.co.uk/admin');
  console.log('   Does NOT require organization membership');
  console.log('   Only sam@gymleadhub.co.uk email can access');
}

checkSamAdmin().catch(console.error);
