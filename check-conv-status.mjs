import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('ai_agent_messages')
  .select('role, tool_calls, tool_results')
  .eq('conversation_id', '278b7472-e907-440b-9c62-a5a0b1dbc71f')
  .order('created_at', { ascending: true })
  .limit(20);

if (error) throw error;

console.log('\nTotal messages:', data.length, '\n');

data.forEach((msg, i) => {
  const hasToolCalls = msg.tool_calls !== null;
  const hasToolResults = msg.tool_results !== null;
  console.log(i+1, msg.role, '- tool_calls:', hasToolCalls, '- tool_results:', hasToolResults);
});

const toolMsgs = data.filter(m => m.role === 'tool');
console.log('\nTool role messages:', toolMsgs.length, '(should be 0 after fix)');
