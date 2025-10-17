import fetch from 'node-fetch';

const AGENT_ID = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

async function testAvailability(baseUrl) {
  console.log(`\n🔍 Testing ${baseUrl}...`);

  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = tomorrow.toISOString().split('T')[0];

  console.log(`📅 Checking availability for: ${date}`);

  const response = await fetch(`${baseUrl}/api/ai-agents/${AGENT_ID}/check-availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });

  const result = await response.json();

  if (result.success) {
    console.log(`✅ Success!`);
    console.log(`Total slots: ${result.data?.totalSlots || 0}`);
    console.log(`Morning: ${result.data?.morningSlots?.length || 0} slots`);
    console.log(`Afternoon: ${result.data?.afternoonSlots?.length || 0} slots`);
    console.log(`Evening: ${result.data?.eveningSlots?.length || 0} slots`);

    if (result.data?.morningSlots?.length > 0) {
      console.log(`\nFirst morning slot: ${result.data.morningSlots[0].startTime}`);
    }
  } else {
    console.log(`❌ Error: ${result.error}`);
  }
}

// Test both local and production
async function run() {
  await testAvailability('http://localhost:3001');
  await testAvailability('https://login.gymleadhub.co.uk');
}

run().catch(console.error);
