import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

async function checkGuardrails() {
  // Check agent-guardrail links
  const { data: links, error: linksError } = await supabase
    .from('agent_guardrails')
    .select(`
      guardrail_id,
      sort_order,
      guardrail:guardrails(id, name, type, enabled)
    `)
    .eq('agent_id', agentId)
    .order('sort_order');

  if (linksError) {
    console.error('Error fetching links:', linksError);
    process.exit(1);
  }

  console.log(`\n✅ Guardrails linked to agent: ${links.length}`);

  if (links.length === 0) {
    console.log('\n⚠️ NO GUARDRAILS LINKED TO AGENT!');
    console.log('This is why only the migration seeded data shows up.\n');
  } else {
    console.log('\nLinked guardrails:\n');
    links.forEach((link, i) => {
      const gr = link.guardrail;
      console.log(`${i + 1}. [${link.sort_order}] ${gr.name} (${gr.type}) - ${gr.enabled ? 'ENABLED' : 'DISABLED'}`);
    });
  }

  // Also check all guardrails in the system
  const { data: allGuardrails, error: grError } = await supabase
    .from('guardrails')
    .select('id, name, type, enabled, organization_id')
    .eq('organization_id', '0ef8a082-4458-400a-8c50-75b47e461f91')
    .order('created_at');

  if (grError) {
    console.error('Error fetching all guardrails:', grError);
  } else {
    console.log(`\n📊 Total guardrails in organization: ${allGuardrails.length}`);
  }

  // Check agent details
  const { data: agent, error: agentError } = await supabase
    .from('ai_agents')
    .select('id, name, model, organization_id')
    .eq('id', agentId)
    .single();

  if (agentError) {
    console.error('Error fetching agent:', agentError);
  } else {
    console.log(`\n🤖 Agent: ${agent.name}`);
    console.log(`   Model: ${agent.model}`);
    console.log(`   Org: ${agent.organization_id}`);
  }
}

checkGuardrails().catch(console.error);
