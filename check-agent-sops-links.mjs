import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

console.log('\n🔍 Checking agent-SOP links...\n');

// Check agent_sops junction table
const { data: agentSops, error: linksError } = await supabase
  .from('agent_sops')
  .select(`
    *,
    sop:sops(*)
  `)
  .eq('agent_id', agentId)
  .order('sort_order', { ascending: true });

if (linksError) {
  console.log('❌ Error fetching agent-SOP links:', linksError.message);
  process.exit(1);
}

if (!agentSops || agentSops.length === 0) {
  console.log('⚠️  No SOPs linked to this agent\n');

  // Check if SOPs exist for the organization
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('organization_id')
    .eq('id', agentId)
    .single();

  const { data: orgSops } = await supabase
    .from('sops')
    .select('*')
    .eq('organization_id', agent.organization_id);

  if (orgSops && orgSops.length > 0) {
    console.log(`✅ Found ${orgSops.length} SOPs in organization:\n`);
    orgSops.forEach((sop, index) => {
      console.log(`${index + 1}. ${sop.name}`);
      console.log(`   ID: ${sop.id}`);
      console.log(`   Content: ${sop.content?.substring(0, 100)}...`);
      console.log('');
    });
    console.log('\n💡 To link SOPs to agent:');
    console.log('   INSERT INTO agent_sops (agent_id, sop_id, sort_order)');
    console.log(`   VALUES ('${agentId}', 'SOP_ID_HERE', 0);`);
  } else {
    console.log('⚠️  No SOPs found in organization either');
  }
} else {
  console.log(`✅ Agent has ${agentSops.length} linked SOPs:\n`);

  agentSops.forEach((link, index) => {
    const sop = link.sop;
    console.log(`${index + 1}. ${sop?.name || 'Unknown SOP'} (Order: ${link.sort_order})`);
    console.log(`   SOP ID: ${link.sop_id}`);
    console.log(`   Content Length: ${sop?.content?.length || 0} chars`);
    console.log(`   Content Preview: ${sop?.content?.substring(0, 150)}...`);
    console.log('');
  });

  console.log('\n📋 Full Combined System Prompt:\n');
  console.log('---');

  const sopContents = agentSops
    .map(item => item.sop?.content)
    .filter(Boolean)
    .join('\n\n---\n\n');

  console.log(sopContents);
  console.log('---\n');
}

console.log('\n');
