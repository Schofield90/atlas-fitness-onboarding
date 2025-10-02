const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMessages() {
  console.log('Checking messages...\n');

  // Check for recent messages in conversations table
  const { data: messages, error } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Recent messages:', messages?.length || 0);
  console.log('Error:', error);

  if (messages && messages.length > 0) {
    console.log('\nLatest message:');
    console.log(JSON.stringify(messages[0], null, 2));

    console.log('\nAll recent messages:');
    messages.forEach((msg, i) => {
      console.log(`${i + 1}. From: ${msg.sender_id} → To: ${msg.receiver_id}`);
      console.log(`   Message: ${msg.message}`);
      console.log(`   Created: ${msg.created_at}\n`);
    });
  }
}

checkMessages();
