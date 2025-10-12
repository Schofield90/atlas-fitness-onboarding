import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '00f2d394-28cd-43ee-8db4-8f841c5d4873';

const { data: agent } = await supabase
  .from('ai_agents')
  .select('name, model, allowed_tools')
  .eq('id', agentId)
  .single();

console.log('Agent:', agent.name);
console.log('Model:', agent.model);
console.log('Tools:', agent.allowed_tools.length, 'tools');
