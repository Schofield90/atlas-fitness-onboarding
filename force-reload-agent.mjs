import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '00f2d394-28cd-43ee-8db4-8f841c5d4873';

// Force reload by touching the updated_at timestamp
const { error } = await supabase
  .from('ai_agents')
  .update({ updated_at: new Date().toISOString() })
  .eq('id', agentId);

if (error) throw error;

// Verify the current model
const { data: agent } = await supabase
  .from('ai_agents')
  .select('name, model, allowed_tools')
  .eq('id', agentId)
  .single();

console.log('Agent:', agent.name);
console.log('Model:', agent.model);
console.log('Tools:', agent.allowed_tools.length);
console.log('\n✅ Agent timestamp updated - will force reload on next API call');
