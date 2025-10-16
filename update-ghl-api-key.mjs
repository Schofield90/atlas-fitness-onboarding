import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

// Get API key from command line argument
const newApiKey = process.argv[2];

if (!newApiKey || newApiKey.length < 20) {
  console.log('Usage: node update-ghl-api-key.mjs <NEW_API_KEY>');
  process.exit(1);
}

console.log('\nUpdating GHL API key...\n');

const { data: currentAgent } = await supabase
  .from('ai_agents')
  .select('metadata, ghl_calendar_id')
  .eq('id', agentId)
  .single();

const updatedMetadata = {
  ...(currentAgent.metadata || {}),
  gohighlevel_api_key: newApiKey
};

const { error } = await supabase
  .from('ai_agents')
  .update({
    ghl_api_key: newApiKey,
    metadata: updatedMetadata
  })
  .eq('id', agentId);

if (error) {
  console.log('Error:', error.message);
  process.exit(1);
}

console.log('✅ Updated!\n');
console.log('Testing permissions...\n');

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);
const startDate = tomorrow.getTime();
const endDate = startDate + (24 * 60 * 60 * 1000) - 1;

const slotsResponse = await fetch(
  'https://services.leadconnectorhq.com/calendars/' + currentAgent.ghl_calendar_id + '/free-slots?startDate=' + startDate + '&endDate=' + endDate,
  {
    headers: {
      'Authorization': 'Bearer ' + newApiKey,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
    },
  }
);

console.log('Read Slots:', slotsResponse.ok ? '✅' : '❌ ' + slotsResponse.status);

const bookResponse = await fetch(
  'https://services.leadconnectorhq.com/calendars/events/appointments',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + newApiKey,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      calendarId: currentAgent.ghl_calendar_id,
      contactId: 'qvCWafwCpdAhVnAbTzWd',
      startTime: '2099-12-31T10:00:00+00:00',
      title: 'Test',
      appointmentStatus: 'confirmed',
    }),
  }
);

console.log('Create Appointments:', bookResponse.ok ? '✅' : '❌ ' + bookResponse.status);
if (bookResponse.ok) {
  const data = await bookResponse.json();
  console.log('Test ID:', data.id, '(DELETE THIS IN GHL!)');
}
console.log('');
