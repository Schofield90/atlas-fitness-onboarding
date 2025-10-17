import fetch from 'node-fetch';

const AGENT_ID = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';
const API_BASE = 'http://localhost:3001';

async function testSecondMessage() {
  console.log('🔍 Testing second message template bypass...\n');

  // 1. Create a conversation
  console.log('1️⃣ Creating conversation...');
  const conversationRes = await fetch(`${API_BASE}/api/ai-agents/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: AGENT_ID,
      metadata: {
        test_session: true,
        lead_name: 'Sam',
        full_name: 'Sam Schofield',
        simulated_lead: true
      }
    })
  });

  const { conversation } = await conversationRes.json();
  console.log(`✅ Conversation created: ${conversation.id}\n`);

  // 2. Send first message (triggers first template)
  console.log('2️⃣ Sending first message to trigger first template...');
  const firstMsgRes = await fetch(`${API_BASE}/api/ai-agents/conversations/${conversation.id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'Hi there!'
    })
  });

  const firstResult = await firstMsgRes.json();
  console.log(`✅ First response: "${firstResult.message?.content?.substring(0, 100)}..."\n`);

  // 3. Send second message (should trigger SECOND template)
  console.log('3️⃣ Sending second message - should use EXACT template:');
  console.log('   Expected: "Thanks Sam, and what is your main goal is it more fitness or fat loss?"\n');

  const secondMsgRes = await fetch(`${API_BASE}/api/ai-agents/conversations/${conversation.id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'I live in York'
    })
  });

  const secondResult = await secondMsgRes.json();
  const actualMessage = secondResult.message?.content || '';

  console.log(`📥 Actual response: "${actualMessage}"\n`);

  // Check if it matches the expected template
  const expectedTemplate = 'Thanks Sam, and what is your main goal is it more fitness or fat loss?';
  const isCorrect = actualMessage.trim() === expectedTemplate.trim();

  if (isCorrect) {
    console.log('✅ ✅ ✅ SUCCESS! Second message matches expected template exactly!');
  } else {
    console.log('❌ ❌ ❌ FAILURE! Second message does NOT match template.');
    console.log('\nExpected:');
    console.log(`"${expectedTemplate}"`);
    console.log('\nActual:');
    console.log(`"${actualMessage}"`);
  }

  // Check server logs for template bypass messages
  console.log('\n📋 Now check the server logs for these debug messages:');
  console.log('   [Orchestrator] 🔍 Template bypass check: assistantMessageCount=1');
  console.log('   [Orchestrator] 🔍 Found 3 exact_script SOPs');
  console.log('   [Orchestrator] 🎯 Using exact template #2: "Second message"');
}

testSecondMessage().catch(console.error);
