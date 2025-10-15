/**
 * Test calendar booking by simulating a GHL webhook with time confirmation
 */

const WEBHOOK_URL = 'https://login.gymleadhub.co.uk/api/webhooks/ghl/1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

const testPayload = {
  contact_id: 'qvCWafwCpdAhVnAbTzWd',
  first_name: 'Sam',
  last_name: 'Schofield',
  full_name: 'Sam Schofield',
  email: 'test2@test.co.uk',
  phone: '+447490253471',
  tags: 'ai on,test',
  message: {
    type: 2,
    body: "Let's book it for 2pm tomorrow"
  },
  location: {
    id: 'LlYsDmB3c62k0au1YcHh',
    name: "Aimee's Place York"
  },
  user: {
    firstName: 'Aimee',
    lastName: 'Sadler',
    email: 'aimee@aimees.place',
    phone: '+447834289287'
  }
};

console.log('🧪 Testing Calendar Booking Webhook\n');
console.log('📝 Payload:');
console.log('   Message:', testPayload.message.body);
console.log('   Contact:', testPayload.full_name);
console.log('   Phone:', testPayload.phone);
console.log('\n📡 Sending to webhook...\n');

try {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testPayload)
  });

  const data = await response.json();

  console.log('✅ Response Status:', response.status);
  console.log('📦 Response Data:', JSON.stringify(data, null, 2));

  if (data.success) {
    console.log('\n🎉 SUCCESS! Webhook processed successfully');
    console.log('\n📋 Expected in logs:');
    console.log('   [Orchestrator] Executing 1 tools...');
    console.log('   [Orchestrator] Executing tool: book_ghl_appointment');
    console.log('   [Orchestrator] Tool result: SUCCESS');
    console.log('   [Orchestrator] Sending tool results back to Claude...');
    console.log('\n💡 Check Vercel logs to verify tool execution!');
  } else {
    console.log('\n❌ FAILED:', data.error || 'Unknown error');
  }

} catch (error) {
  console.error('\n💥 ERROR:', error.message);
  process.exit(1);
}
