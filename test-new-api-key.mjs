import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: agent } = await supabase
  .from('ai_agents')
  .select('ghl_api_key, ghl_calendar_id')
  .eq('id', '1b44af8e-d29d-4fdf-98a8-ab586a289e5e')
  .single();

const apiKey = agent.ghl_api_key;
const calendarId = agent.ghl_calendar_id;

console.log('\n🔍 Testing New API Key Permissions\n');
console.log('API Key:', apiKey.substring(0, 20) + '...');
console.log('Calendar ID:', calendarId);
console.log('');

// Test 1: Read contact
console.log('Test 1: Can we read the contact?');
const contactResponse = await fetch(
  'https://services.leadconnectorhq.com/contacts/qvCWafwCpdAhVnAbTzWd',
  {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Version': '2021-07-28',
    },
  }
);

console.log('   Status:', contactResponse.status);
if (contactResponse.ok) {
  const contact = await contactResponse.json();
  console.log('   ✅ Contact accessible');
  console.log('   Name:', contact.contact?.name || 'N/A');
} else {
  console.log('   ❌ Cannot access contact');
}

// Test 2: Try booking WITHOUT contactId (some calendars allow this)
console.log('\nTest 2: Try booking without contactId...');
const bookNoContact = await fetch(
  'https://services.leadconnectorhq.com/calendars/events/appointments',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      calendarId: calendarId,
      startTime: '2099-12-31T10:00:00+00:00',
      title: 'Test Booking',
      appointmentStatus: 'confirmed',
      email: 'test@test.com',
      name: 'Test User',
    }),
  }
);

console.log('   Status:', bookNoContact.status);
if (!bookNoContact.ok) {
  const errorText = await bookNoContact.text();
  console.log('   Error:', errorText);
}

// Test 3: Check what the calendar endpoint returns
console.log('\nTest 3: Get calendar details...');
const calendarResponse = await fetch(
  `https://services.leadconnectorhq.com/calendars/${calendarId}`,
  {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Version': '2021-07-28',
    },
  }
);

console.log('   Status:', calendarResponse.status);
if (calendarResponse.ok) {
  const calendar = await calendarResponse.json();
  console.log('   ✅ Calendar accessible');
  console.log('   Name:', calendar.calendar?.name || calendar.name || 'N/A');
  console.log('   Location:', calendar.calendar?.locationId || calendar.locationId || 'N/A');
} else {
  const errorText = await calendarResponse.text();
  console.log('   ❌ Cannot access calendar');
  console.log('   Error:', errorText);
}

console.log('\n✨ Tests complete\n');
