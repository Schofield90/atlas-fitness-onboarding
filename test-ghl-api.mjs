import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

// Get the agent's GHL API key
const { data: agent } = await supabase
  .from('ai_agents')
  .select('ghl_api_key')
  .eq('id', agentId)
  .single();

const apiKey = agent?.ghl_api_key;

if (!apiKey) {
  console.log('❌ No API key found');
  process.exit(1);
}

console.log('🔑 Testing GHL API with key:', apiKey.substring(0, 30) + '...\n');

// Test 1: Get contact info (read-only, should work with most tokens)
console.log('Test 1: Fetching contact info (qvCWafwCpdAhVnAbTzWd)');
try {
  const response = await fetch(
    'https://services.leadconnectorhq.com/contacts/qvCWafwCpdAhVnAbTzWd',
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
      },
    }
  );

  const data = await response.text();
  console.log(`Status: ${response.status}`);
  console.log('Response:', data.substring(0, 200));
  console.log('');
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('');
}

// Test 2: Send SMS via Conversations API (needs write permission)
console.log('Test 2: Sending SMS via Conversations API');
try {
  const response = await fetch(
    'https://services.leadconnectorhq.com/conversations/messages',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify({
        type: 'SMS',
        contactId: 'qvCWafwCpdAhVnAbTzWd',
        message: 'Test message from API',
      }),
    }
  );

  const data = await response.text();
  console.log(`Status: ${response.status}`);
  console.log('Response:', data.substring(0, 200));
  console.log('');

  if (response.status === 401) {
    console.log('⚠️  401 Unauthorized - Token might need different permissions');
    console.log('');
    console.log('💡 Suggestions:');
    console.log('   1. Check if token has "conversations.write" scope');
    console.log('   2. Try using a Private Integration key (pit-xxxx) instead of JWT');
    console.log('   3. Check token expiration date');
    console.log('   4. Verify token was created for correct GHL location');
  }
} catch (error) {
  console.log('❌ Error:', error.message);
}
