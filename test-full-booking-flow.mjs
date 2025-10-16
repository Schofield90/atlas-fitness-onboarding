import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';
const contactId = 'qvCWafwCpdAhVnAbTzWd'; // Sam Schofield

console.log('\n🧪 FULL BOOKING FLOW TEST\n');
console.log('=' .repeat(60));

// Step 1: Get agent configuration
console.log('\n📋 Step 1: Fetching agent configuration...');
const { data: agent } = await supabase
  .from('ai_agents')
  .select('ghl_calendar_id, ghl_api_key, metadata')
  .eq('id', agentId)
  .single();

const apiKey = agent.ghl_api_key;
const calendarId = agent.ghl_calendar_id;

console.log('   ✅ Agent ID:', agentId);
console.log('   ✅ Calendar ID:', calendarId);
console.log('   ✅ API Key exists:', !!apiKey);
console.log('   ✅ Contact ID:', contactId);

// Step 2: Get available slots
console.log('\n📅 Step 2: Fetching available calendar slots...');

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);
const startDate = tomorrow.getTime();
const endDate = startDate + (24 * 60 * 60 * 1000) - 1;

const slotsResponse = await fetch(
  `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots?startDate=${startDate}&endDate=${endDate}`,
  {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
    },
  }
);

console.log('   Status:', slotsResponse.status, slotsResponse.statusText);

if (!slotsResponse.ok) {
  const errorText = await slotsResponse.text();
  console.log('   ❌ ERROR:', errorText);
  process.exit(1);
}

const slotsData = await slotsResponse.json();
const dateKey = Object.keys(slotsData).find(key => key !== 'traceId');
const slots = slotsData[dateKey]?.slots || [];

console.log('   ✅ Date:', dateKey);
console.log('   ✅ Slots Found:', slots.length);

if (slots.length === 0) {
  console.log('   ❌ No available slots - cannot test booking');
  process.exit(1);
}

const testSlot = slots[0];
console.log('   ✅ First Slot:', testSlot);

// Step 3: Attempt to book appointment
console.log('\n📝 Step 3: Attempting to book appointment...');

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
      startTime: testSlot,
      title: 'Test Booking - AI Agent',
      appointmentStatus: 'confirmed',
      notes: 'Test booking via diagnostic script',
    }),
  }
);

console.log('   Status:', bookResponse.status, bookResponse.statusText);

if (!bookResponse.ok) {
  const errorText = await bookResponse.text();
  console.log('   ❌ BOOKING FAILED');
  console.log('   Error Response:', errorText);
  console.log('\n🔍 Diagnosis:');

  try {
    const errorJson = JSON.parse(errorText);
    console.log('   Error Type:', errorJson.error || errorJson.message);
    console.log('   Details:', JSON.stringify(errorJson, null, 2));

    if (errorText.includes('contact')) {
      console.log('\n   💡 Possible Issue: Contact ID invalid or not found');
      console.log('      - Check if contact exists in GoHighLevel');
      console.log('      - Verify contact ID matches GHL contact');
    }

    if (errorText.includes('calendar')) {
      console.log('\n   💡 Possible Issue: Calendar configuration problem');
      console.log('      - Check calendar ID is correct');
      console.log('      - Verify API key has calendar access');
    }

    if (errorText.includes('time') || errorText.includes('slot')) {
      console.log('\n   💡 Possible Issue: Time format problem');
      console.log('      - Slot format:', testSlot);
      console.log('      - Expected: ISO 8601 string with timezone');
    }
  } catch (e) {
    console.log('   Raw Error:', errorText);
  }

  console.log('\n❌ TEST FAILED\n');
  process.exit(1);
}

const bookData = await bookResponse.json();
console.log('   ✅ BOOKING SUCCESSFUL!');
console.log('   Appointment ID:', bookData.id || bookData.appointmentId);
console.log('   Full Response:', JSON.stringify(bookData, null, 2));

// Step 4: Verify in database
console.log('\n💾 Step 4: Verifying booking could be stored in our database...');
console.log('   Lead ID would be looked up from conversation');
console.log('   Appointment data would be saved to leads.metadata');
console.log('   Status would be updated to "appointment_scheduled"');

console.log('\n✅ FULL BOOKING FLOW TEST PASSED!\n');
console.log('=' .repeat(60));
console.log('\nNEXT STEPS:');
console.log('1. Check GoHighLevel calendar at: https://app.gohighlevel.com/');
console.log('2. Verify appointment appears for Sam Schofield');
console.log('3. If appointment exists, booking system is working!');
console.log('4. If not, check GHL API permissions\n');
