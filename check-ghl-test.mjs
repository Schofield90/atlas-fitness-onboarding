import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const leadId = 'e4b8a2ec-abd8-437e-bea7-953f92161c8b';
const conversationId = 'baf4ff06-f4f9-49f3-801b-4a300f5f0ccb';

console.log('\n🔍 Checking GHL Webhook Test Results\n');

// Check lead
const { data: lead, error: leadError } = await supabase
  .from('leads')
  .select('*')
  .eq('id', leadId)
  .single();

if (leadError) {
  console.log('❌ Lead query error:', leadError.message);
} else {
  console.log('✅ Lead found:');
  console.log('  Name:', lead.name);
  console.log('  Email:', lead.email);
  console.log('  Phone:', lead.phone);
  console.log('  Source:', lead.source);
  console.log('  Status:', lead.status);
  console.log('  GHL Contact ID:', lead.metadata?.ghl_contact_id);
}

// Check conversation
const { data: conversation, error: convError } = await supabase
  .from('ai_agent_conversations')
  .select('*')
  .eq('id', conversationId)
  .single();

if (convError) {
  console.log('\n❌ Conversation query error:', convError.message);
} else {
  console.log('\n✅ Conversation found:');
  console.log('  ID:', conversation.id);
  console.log('  Agent ID:', conversation.agent_id);
  console.log('  Lead ID:', conversation.lead_id);
  console.log('  Status:', conversation.status);
  console.log('  Channel:', conversation.channel);
}

// Check messages
const { data: messages, error: messagesError } = await supabase
  .from('ai_agent_messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });

if (messagesError) {
  console.log('\n❌ Messages query error:', messagesError.message);
} else {
  console.log('\n📨 Messages:');
  console.log('  Total messages:', messages.length);
  messages.forEach((msg, i) => {
    const num = i + 1;
    console.log('\n  Message ' + num + ':');
    console.log('    Role:', msg.role);
    console.log('    Content:', msg.content || '❌ NULL/EMPTY');
    console.log('    Created:', msg.created_at);
  });
}

// Check token usage
const { data: usage, error: usageError } = await supabase
  .from('ai_usage_billing')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: false })
  .limit(5);

if (usageError) {
  console.log('\n❌ Usage query error:', usageError.message);
} else if (usage && usage.length > 0) {
  console.log('\n💰 Token Usage:');
  usage.forEach((u, i) => {
    const num = i + 1;
    console.log('  Entry ' + num + ':');
    console.log('    Tokens:', u.tokens_used);
    console.log('    Cost:', u.cost_usd);
    console.log('    Model:', u.model_name);
    console.log('    Created:', u.created_at);
  });
} else {
  console.log('\n⚠️  No token usage records found');
}

console.log('\n');
