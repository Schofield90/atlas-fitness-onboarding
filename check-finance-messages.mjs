#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FINANCE_AGENT_ID = '00f2d394-28cd-43ee-8db4-8f841c5d4873';

// Get all conversations
const { data: conversations, error: convError } = await supabase
  .from('ai_agent_conversations')
  .select('id, created_at, updated_at')
  .eq('agent_id', FINANCE_AGENT_ID)
  .order('updated_at', { ascending: false });

if (convError) {
  console.error('Error:', convError);
  process.exit(1);
}

console.log(`Found ${conversations.length} conversations for finance agent\n`);

for (const conv of conversations) {
  const { data: messages } = await supabase
    .from('ai_agent_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true });
  
  console.log(`Conversation ${conv.id.substring(0, 8)}... (${messages?.length || 0} messages)`);
  console.log(`  Last updated: ${conv.updated_at}`);
  
  if (messages && messages.length > 0) {
    messages.forEach((msg, i) => {
      const preview = msg.content.substring(0, 80).replace(/\n/g, ' ');
      console.log(`  ${i+1}. [${msg.role}] ${preview}...`);
    });
  }
  console.log('');
}
