import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

// Get agent details
const { data: agent, error: agentError } = await supabase
  .from('ai_agents')
  .select('*')
  .eq('id', agentId)
  .single();

if (agentError) {
  console.log('❌ Agent error:', agentError.message);
  process.exit(1);
}

console.log('\n🤖 Agent: ', agent.name);
console.log('📍 Organization ID:', agent.organization_id);
console.log('\n🔍 Checking for SOPs...\n');

// Check for SOPs in the organization
const { data: sops, error: sopsError } = await supabase
  .from('sops')
  .select('*')
  .eq('organization_id', agent.organization_id)
  .order('updated_at', { ascending: false });

if (sopsError) {
  console.log('❌ SOPs query error:', sopsError.message);
} else if (!sops || sops.length === 0) {
  console.log('⚠️  No SOPs found for this organization');
  console.log('\n💡 To add SOPs:');
  console.log('   1. Go to Settings → SOPs in the dashboard');
  console.log('   2. Create SOPs for lead response procedures');
  console.log('   3. Publish them');
  console.log('   4. Agent will automatically read them');
} else {
  console.log(`✅ Found ${sops.length} SOPs:\n`);

  sops.forEach((sop, index) => {
    console.log(`${index + 1}. ${sop.name}`);
    console.log(`   Description: ${sop.description || 'No description'}`);
    console.log(`   Content Length: ${sop.content?.length || 0} chars`);
    console.log(`   Updated: ${new Date(sop.updated_at).toLocaleString()}`);
    console.log('');
  });

  console.log('\n📋 SOP Details:\n');
  sops.forEach((sop) => {
    console.log(`\n--- ${sop.name} ---`);
    console.log(sop.content?.substring(0, 500));
    if (sop.content?.length > 500) {
      console.log('... (truncated)');
    }
    console.log('');
  });
}

console.log('\n');
