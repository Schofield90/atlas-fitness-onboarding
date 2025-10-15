import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const conversationId = 'baf4ff06-f4f9-49f3-801b-4a300f5f0ccb';

async function checkMessages() {
  console.log('\n🔍 Checking conversation messages...\n');

  const { data: messages, error } = await supabase
    .from('ai_agent_messages')
    .select('id, role, content, created_at, tokens_used')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(`Total messages: ${messages.length}\n`);

  messages.forEach((msg, i) => {
    const preview = msg.content ? msg.content.substring(0, 80) : '[EMPTY]';
    const time = new Date(msg.created_at).toLocaleTimeString();
    console.log(`${i + 1}. [${msg.role}] ${time}`);
    console.log(`   Content: ${preview}`);
    if (msg.content && msg.content.length > 80) {
      console.log(`   (${msg.content.length} chars total)`);
    }
    console.log(`   Tokens: ${msg.tokens_used}`);
    console.log();
  });

  // Check for empty messages
  const emptyMessages = messages.filter(m => !m.content || m.content.trim() === '');
  if (emptyMessages.length > 0) {
    console.log(`\n⚠️  Found ${emptyMessages.length} messages with empty content`);
    console.log('These will be filtered out before sending to Anthropic');
  }

  // Show what would be sent to AI
  const validMessages = messages.filter(m => m.content && m.content.trim() !== '');
  console.log(`\n✅ ${validMessages.length} messages with valid content will be sent to AI`);
}

checkMessages();
