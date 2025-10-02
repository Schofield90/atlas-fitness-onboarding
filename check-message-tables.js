const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  const conversationId = '95312149-56c1-4546-97d1-bd5d93dda8f8';

  console.log('Checking message tables...\n');

  // Check messages table
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  console.log('Messages table:');
  console.log('  Count:', messages?.length || 0);
  console.log('  Error:', messagesError);

  if (messages && messages.length > 0) {
    console.log('\nMessages:');
    messages.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.sender_type}: ${msg.content}`);
      console.log(`   Created: ${msg.created_at}`);
    });
  }

  // Check conversation_messages table
  const { data: convMessages, error: convError } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  console.log('\nConversation_messages table:');
  console.log('  Count:', convMessages?.length || 0);
  console.log('  Error:', convError);

  if (convMessages && convMessages.length > 0) {
    console.log('\nConversation Messages:');
    convMessages.forEach((msg, i) => {
      console.log(`${i + 1}. From ${msg.sender_id}: ${msg.message}`);
      console.log(`   Created: ${msg.created_at}`);
    });
  }
}

checkTables();
