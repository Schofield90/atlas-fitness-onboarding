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
  // Direct user ID from logs
  const samUserId = 'fe6c2e38-1d0a-4f2d-a47c-273207ee4ac9';
  const demoOrgId = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'; // Demo Fitness Studio

  console.log(`Linking user ${samUserId} to org ${demoOrgId}...`);

  // Check if already linked
  const { data: existing, error: checkError } = await client
    .from('user_organizations')
    .select('*')
    .eq('user_id', samUserId)
    .eq('organization_id', demoOrgId)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking existing link:', checkError);
  }

  if (existing) {
    console.log('\n✅ Already linked to Demo Fitness Studio');
    console.log('Role:', existing.role);
    return;
  }

  // Link to Demo Fitness Studio as owner
  const { data: link, error } = await client
    .from('user_organizations')
    .insert({
      user_id: samUserId,
      organization_id: demoOrgId,
      role: 'owner'
    })
    .select()
    .single();

  if (error) {
    console.error('\n❌ Error linking:', error);
    return;
  }

  console.log('\n✅ Successfully linked sam@gymleadhub.co.uk to Demo Fitness Studio!');
  console.log('Organization ID:', demoOrgId);
  console.log('Role: owner');
  console.log('\nRefresh your browser page and try creating an AI agent again! 🚀');
}

linkSamToDemoOrg().catch(console.error);
