import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get the latest assistant message that's NULL
const { data: nullMessage } = await supabase
  .from('ai_agent_messages')
  .select('*')
  .eq('role', 'assistant')
  .is('content', null)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

console.log('\n🔍 Latest NULL Assistant Message:');
console.log('  ID:', nullMessage.id);
console.log('  Conversation ID:', nullMessage.conversation_id);
console.log('  Created:', nullMessage.created_at);
console.log('  Metadata:', JSON.stringify(nullMessage.metadata, null, 2));

// Check activity logs for that conversation
const { data: logs } = await supabase
  .from('ai_agent_activity_log')
  .select('*')
  .eq('conversation_id', nullMessage.conversation_id)
  .order('created_at', { ascending: false })
  .limit(5);

console.log('\n📋 Recent Activity Logs:');
if (logs && logs.length > 0) {
  logs.forEach((log, i) => {
    console.log('\n  Log ' + (i + 1) + ':');
    console.log('    Action:', log.action_type);
    console.log('    Status:', log.status);
    console.log('    Error:', log.error_message || 'None');
    console.log('    Details:', JSON.stringify(log.details, null, 2));
    console.log('    Created:', log.created_at);
  });
} else {
  console.log('  No activity logs found');
}

// Check ai_usage_billing table schema
const { data: usageColumns, error } = await supabase
  .from('ai_usage_billing')
  .select('*')
  .limit(1);

console.log('\n📊 ai_usage_billing table check:');
if (error) {
  console.log('  Error:', error.message);
} else if (usageColumns && usageColumns.length > 0) {
  console.log('  ✅ Table exists. Sample columns:', Object.keys(usageColumns[0]));
} else {
  console.log('  ⚠️  Table empty, querying schema...');
}

console.log('\n');
