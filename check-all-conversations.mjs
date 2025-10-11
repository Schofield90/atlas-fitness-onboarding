#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ORG_ID = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';

// Check all conversations
const { data: conversations, error } = await supabase
  .from('ai_agent_conversations')
  .select('id, agent_id, created_at, updated_at')
  .eq('organization_id', ORG_ID)
  .order('updated_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('Error:', error);
} else {
  console.log(`Total conversations: ${conversations.length}\n`);
  
  for (const conv of conversations) {
    // Get message count
    const { data: messages, count } = await supabase
      .from('ai_agent_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id);
    
    console.log(`Conv: ${conv.id.substring(0, 8)}... Agent: ${conv.agent_id.substring(0, 8)}...`);
    console.log(`  Created: ${conv.created_at}`);
    console.log(`  Updated: ${conv.updated_at}`);
    console.log(`  Messages: ${count || 0}\n`);
  }
}
