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
const locationId = agent.metadata.gohighlevel_location_id;

// Try both calendar IDs
const calendarIds = [
  { name: 'DB column', id: agent.ghl_calendar_id },
  { name: 'Metadata', id: agent.metadata.gohighlevel_calendar_id }
];

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const date = tomorrow.toISOString().split('T')[0];

console.log('\n🔍 Testing GHL Calendar API...');
console.log('   Location ID:', locationId);
console.log('   Date:', date);
console.log();

// Test both calendar IDs with both API versions
for (const cal of calendarIds) {
  console.log(`📅 Testing ${cal.name}: ${cal.id}`);

  // Try API v1
  console.log('   → API v1 (old endpoint)...');
  let response = await fetch(
    `https://rest.gohighlevel.com/v1/calendars/${cal.id}/free-slots?date=${date}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );
  console.log('      Status:', response.status, response.statusText);
  if (response.ok) {
    const data = await response.json();
    console.log('      ✅ Slots Found:', data.slots?.length || 0);
  }

  // Try API v2 (current)
  console.log('   → API v2 (current endpoint with location)...');
  response = await fetch(
    `https://services.leadconnectorhq.com/calendars/${cal.id}/free-slots?locationId=${locationId}&startDate=${date}T00:00:00.000Z&endDate=${date}T23:59:59.999Z`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    }
  );
  console.log('      Status:', response.status, response.statusText);
  if (response.ok) {
    const data = await response.json();
    console.log('      ✅ Slots:', Array.isArray(data) ? data.length : 'unknown format');
    console.log('      Data:', JSON.stringify(data, null, 2).substring(0, 200));
  } else {
    const text = await response.text();
    console.log('      Error:', text.substring(0, 200));
  }

  console.log();
}

console.log('✨ Test Complete\n');
