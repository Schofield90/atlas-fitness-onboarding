// Quick test to debug AI chat responses
// Run with: node test-chat-debug.mjs

const conversationId = '278b7472-e907-440b-9c62-a5a0b1dbc71f';

// Test 1: Get conversation messages
async function getMessages() {
  const response = await fetch(`http://localhost:3000/api/ai-agents/conversations/${conversationId}/messages?limit=20`);
  const data = await response.json();

  console.log('\n=== CONVERSATION MESSAGES ===');
  console.log(`Total messages: ${data.messages?.length || 0}`);

  if (data.messages) {
    data.messages.forEach((msg, i) => {
      console.log(`\n[${i + 1}] ${msg.role.toUpperCase()} (${new Date(msg.created_at).toLocaleTimeString()})`);
      console.log(`Content: ${msg.content?.substring(0, 100)}${msg.content?.length > 100 ? '...' : ''}`);
      if (msg.tool_calls) {
        console.log(`Tool calls: ${msg.tool_calls.length}`);
      }
    });
  }
}

// Test 2: Send a test message
async function sendTestMessage() {
  const testMessage = `Test ${Date.now()} - What's the weather like?`;

  console.log(`\n=== SENDING TEST MESSAGE ===`);
  console.log(`Message: "${testMessage}"`);

  const response = await fetch(`http://localhost:3000/api/ai-agents/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'sb-access-token=your-token-here' // You'll need a valid session
    },
    body: JSON.stringify({ content: testMessage })
  });

  const data = await response.json();
  console.log(`\nResponse status: ${response.status}`);
  console.log(`Response:`, JSON.stringify(data, null, 2));
}

// Run tests
await getMessages();
// await sendTestMessage(); // Uncomment to test sending
