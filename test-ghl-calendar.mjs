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
  .select('ghl_calendar_id, ghl_api_key')
  .eq('id', agentId)
  .single();

const calendarId = agent.ghl_calendar_id;
const apiKey = agent.ghl_api_key;

// Get tomorrow's date
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const date = tomorrow.toISOString().split('T')[0];

console.log('\n🔍 Testing GHL Calendar API...');
console.log('   Calendar ID:', calendarId);
console.log('   Date:', date);
console.log();

// Test 1: Fetch available slots
console.log('📅 Test 1: Fetching available slots...');
const response = await fetch(
  `https://rest.gohighlevel.com/v1/calendars/${calendarId}/free-slots?date=${date}`,
  {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  }
);

console.log('   Status:', response.status, response.statusText);

if (!response.ok) {
  const text = await response.text();
  console.log('   ❌ Error Response:', text);
} else {
  const data = await response.json();
  console.log('   ✅ Slots Found:', data.slots?.length || 0);

  if (data.slots && data.slots.length > 0) {
    console.log('\n   Sample Slots:');
    data.slots.slice(0, 3).forEach((slot, i) => {
      const start = new Date(slot.startTime);
      console.log(`   ${i + 1}. ${start.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`);
    });
  }
}

console.log();

// Test 2: Try to book a slot (if slots available)
if (response.ok) {
  const data = await response.json();
  if (data.slots && data.slots.length > 0) {
    console.log('📝 Test 2: Testing appointment booking...');

    const testSlot = data.slots[0];
    const contactId = 'qvCWafwCpdAhVnAbTzWd'; // Sam Schofield from logs

    console.log('   Contact ID:', contactId);
    console.log('   Slot:', new Date(testSlot.startTime).toLocaleString());

    const bookResponse = await fetch(
      `https://rest.gohighlevel.com/v1/calendars/${calendarId}/appointments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: contactId,
          startTime: testSlot.startTime,
          endTime: testSlot.endTime,
          title: 'Test Booking via AI Agent',
          appointmentStatus: 'confirmed',
          notes: 'Automated test booking',
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
      console.log('   Appointment ID:', bookData.id || bookData.appointmentId);
    }
  }
}

console.log('\n✨ Test Complete\n');
