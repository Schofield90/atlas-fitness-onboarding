#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const AGENT_ID = '00f2d394-28cd-43ee-8db4-8f841c5d4873';
const ORG_ID = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';

// Find most recent conversation for this agent
const { data: conversations, error: convError } = await supabase
  .from('ai_agent_conversations')
  .select('id, created_at')
  .eq('agent_id', AGENT_ID)
  .eq('organization_id', ORG_ID)
  .order('created_at', { ascending: false })
  .limit(5);

if (convError) {
  console.error('Error fetching conversations:', convError);
  process.exit(1);
}

console.log(`Found ${conversations.length} recent conversations:\n`);

for (const conv of conversations) {
  console.log(`Conversation ${conv.id} (${conv.created_at})`);
  
  // Get messages for this conversation
  const { data: messages, error: msgError } = await supabase
    .from('ai_agent_messages')
    .select('role, content, created_at, metadata')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true });
  
  if (msgError) {
    console.error('  Error fetching messages:', msgError);
    continue;
  }
  
  console.log(`  Messages: ${messages.length}`);
  messages.forEach((msg, i) => {
    const content = msg.content.substring(0, 100);
    const toolCalls = msg.metadata?.tool_calls?.length || 0;
    console.log(`  ${i+1}. [${msg.role}] ${content}${toolCalls ? ` (${toolCalls} tool calls)` : ''}`);
  });
  console.log('');
}
