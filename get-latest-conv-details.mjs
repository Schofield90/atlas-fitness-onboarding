#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CONV_ID = 'e646362a-0bcb-4f0f-bcc7-f5e29e6edcc1'; // Latest conversation

// Get messages
const { data: messages } = await supabase
  .from('ai_agent_messages')
  .select('*')
  .eq('conversation_id', CONV_ID)
  .order('created_at', { ascending: true });

console.log(`Conversation ${CONV_ID.substring(0, 8)}...`);
console.log(`Total messages: ${messages?.length || 0}\n`);

messages?.forEach((msg, i) => {
  console.log(`Message ${i+1}:`);
  console.log(`  Role: ${msg.role}`);
  console.log(`  Content: ${msg.content.substring(0, 100)}`);
  console.log(`  Created: ${msg.created_at}`);
  console.log(`  Metadata:`, msg.metadata ? JSON.stringify(msg.metadata).substring(0, 200) : 'null');
  console.log('');
});

// Check activity log for this conversation
const { data: logs } = await supabase
  .from('ai_agent_activity_log')
  .select('*')
  .eq('conversation_id', CONV_ID)
  .order('created_at', { ascending: false })
  .limit(5);

console.log('Recent activity logs:');
logs?.forEach(log => {
  console.log(`  [${log.action_type}] ${log.created_at}`);
  if (log.error_message) {
    console.log(`    ERROR: ${log.error_message}`);
  }
  if (log.metadata) {
    console.log(`    Metadata:`, JSON.stringify(log.metadata).substring(0, 150));
  }
});
