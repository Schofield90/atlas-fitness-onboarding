import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const conversationId = 'baf4ff06-f4f9-49f3-801b-4a300f5f0ccb';

// Check activity logs
const { data: logs, error: logsError } = await supabase
  .from('ai_agent_activity_log')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: false })
  .limit(10);

console.log('\n📋 Activity Logs for Conversation:');
if (logsError) {
  console.log('  Error:', logsError.message);
} else if (logs && logs.length > 0) {
  logs.forEach((log, i) => {
    console.log('\n  Log ' + (i + 1) + ':');
    console.log('    Action:', log.action_type);
    console.log('    Status:', log.status);
    console.log('    Error:', log.error_message || 'None');
    if (log.details) {
      console.log('    Details:', JSON.stringify(log.details, null, 2));
    }
    console.log('    Created:', log.created_at);
  });
} else {
  console.log('  ⚠️  No activity logs found');
}

console.log('\n');
