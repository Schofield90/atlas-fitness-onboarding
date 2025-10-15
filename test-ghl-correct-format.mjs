import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

// Get agent config
const { data: agent } = await supabase
  .from('ai_agents')
  .select('ghl_calendar_id, ghl_api_key, metadata')
  .eq('id', agentId)
  .single();

const apiKey = agent.ghl_api_key;
const calendarId = agent.metadata.gohighlevel_calendar_id; // Use the one with uppercase O

// Get tomorrow's date as Unix timestamps (milliseconds)
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);
const startDate = tomorrow.getTime();
const endDate = tomorrow.getTime() + (24 * 60 * 60 * 1000) - 1;

console.log('\n🔍 Testing GHL Calendar API (v2 correct format)...');
console.log('   Calendar ID:', calendarId);
console.log('   Start Date:', new Date(startDate).toISOString());
console.log('   End Date:', new Date(endDate).toISOString());
console.log();

// Test 1: Get available slots
console.log('📅 Test 1: Fetching available slots...');
const url = `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots?startDate=${startDate}&endDate=${endDate}`;
console.log('   URL:', url);

const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
  },
});

console.log('   Status:', response.status, response.statusText);

if (!response.ok) {
  const text = await response.text();
  console.log('   ❌ Error:', text);
} else {
  const data = await response.json();
  console.log('   ✅ Response received!');
  console.log('   Type:', Array.isArray(data) ? 'Array' : typeof data);

  if (Array.isArray(data)) {
    console.log('   Slots Found:', data.length);
    if (data.length > 0) {
      console.log('\n   Sample Slots:');
      data.slice(0, 3).forEach((slot, i) => {
        console.log(`   ${i + 1}.`, JSON.stringify(slot, null, 2));
      });
    }
  } else {
    console.log('   Data:', JSON.stringify(data, null, 2));
  }

  // Test 2: Try booking if slots available
  if (Array.isArray(data) && data.length > 0) {
    console.log('\n📝 Test 2: Testing appointment booking...');

    const testSlot = data[0];
    const contactId = 'qvCWafwCpdAhVnAbTzWd'; // Sam Schofield

    console.log('   Contact ID:', contactId);
    console.log('   Slot:', testSlot);

    const bookResponse = await fetch(
      `https://services.leadconnectorhq.com/calendars/events/appointments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calendarId: calendarId,
          contactId: contactId,
          startTime: testSlot.startTime || testSlot.slots?.[0]?.startTime,
          endTime: testSlot.endTime || testSlot.slots?.[0]?.endTime,
          title: 'Test Booking via AI Agent',
          appointmentStatus: 'confirmed',
        }),
      }
    );

    console.log('   Status:', bookResponse.status, bookResponse.statusText);

    if (!bookResponse.ok) {
      const errorText = await bookResponse.text();
      console.log('   ❌ Error:', errorText);
    } else {
      const bookData = await bookResponse.json();
      console.log('   ✅ Booking Successful!');
      console.log('   Response:', JSON.stringify(bookData, null, 2));
    }
  }
}

console.log('\n✨ Test Complete\n');
