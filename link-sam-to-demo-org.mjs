import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function linkSamToDemoOrg() {
  // Find sam@gymleadhub.co.uk
  const samEmail = 'sam@gymleadhub.co.uk';
  const demoOrgId = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'; // Demo Fitness Studio

  // Get user ID
  const { data: usersData } = await client.auth.admin.listUsers();
  const samUser = usersData.users.find(u => u.email === samEmail);

  if (!samUser) {
    console.log('❌ sam@gymleadhub.co.uk not found');
    return;
  }

  console.log(`✅ Found ${samEmail}`);
  console.log(`User ID: ${samUser.id}`);

  // Check if already linked
  const { data: existing } = await client
    .from('user_organizations')
    .select('*')
    .eq('user_id', samUser.id)
    .eq('organization_id', demoOrgId)
    .single();

  if (existing) {
    console.log('\n✅ Already linked to Demo Fitness Studio');
    console.log('Role:', existing.role);
    return;
  }

  // Link to Demo Fitness Studio as admin
  const { data: link, error } = await client
    .from('user_organizations')
    .insert({
      user_id: samUser.id,
      organization_id: demoOrgId,
      role: 'admin'
    })
    .select()
    .single();

  if (error) {
    console.error('\n❌ Error linking:', error);
    return;
  }

  console.log('\n✅ Successfully linked sam@gymleadhub.co.uk to Demo Fitness Studio!');
  console.log('Organization ID:', demoOrgId);
  console.log('Role: admin');
  console.log('\nYou can now create AI agents on localhost! 🚀');
}

linkSamToDemoOrg().catch(console.error);
