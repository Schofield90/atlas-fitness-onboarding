import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAgents() {
  console.log('Checking ai_agents table for Demo Fitness Studio...\n');

  const { data: agents, error } = await supabase
    .from('ai_agents')
    .select('id, name, role, description, organization_id')
    .eq('organization_id', 'c762845b-34fc-41ea-9e01-f70b81c44ff7');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${agents.length} agent(s):\n`);
  agents.forEach(agent => {
    console.log(`Agent ID: ${agent.id}`);
    console.log(`Name: ${agent.name}`);
    console.log(`Role: ${agent.role}`);
    console.log(`Description: ${agent.description || 'N/A'}`);
    console.log('');
  });

  console.log('Correct URL:');
  if (agents.length > 0) {
    console.log(`http://localhost:3000/org/demo-fitness/ai-agents/chat/${agents[0].id}`);
  }
}

checkAgents().catch(console.error);
