#!/usr/bin/env node

/**
 * Test script to send a second message and verify the agent uses the exact template
 */

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';
const baseUrl = 'http://localhost:3000';

async function testSecondMessage() {
  console.log('🧪 Testing Second Message Template\n');

  // Step 1: Create a new conversation
  console.log('1. Creating new conversation...');
  const convResponse = await fetch(`${baseUrl}/api/ai-agents/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_id: agentId,
      channel: 'test',
      metadata: { test: true }
    })
  });

  const convData = await convResponse.json();
  if (!convData.success || !convData.conversation) {
    console.error('❌ Failed to create conversation:', convData);
    return;
  }

  const conversationId = convData.conversation.id;
  console.log(`✅ Created conversation: ${conversationId}\n`);

  // Step 2: Send first user message (to trigger first assistant message)
  console.log('2. Sending first user message: "yes i do"');
  const msg1Response = await fetch(`${baseUrl}/api/ai-agents/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'yes i do'
    })
  });

  const msg1Data = await msg1Response.json();
  if (!msg1Data.success) {
    console.error('❌ Failed to send first message:', msg1Data);
    return;
  }

  console.log(`✅ First assistant message: "${msg1Data.message.content}"\n`);

  // Step 3: Send second user message (to trigger SECOND assistant message - the one we're testing)
  console.log('3. Sending second user message: "yes i do"');
  const msg2Response = await fetch(`${baseUrl}/api/ai-agents/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'yes i do'
    })
  });

  const msg2Data = await msg2Response.json();
  if (!msg2Data.success) {
    console.error('❌ Failed to send second message:', msg2Data);
    return;
  }

  const secondMessage = msg2Data.message.content;
  console.log(`✅ SECOND assistant message:\n"${secondMessage}"\n`);

  // Step 4: Verify it matches the template
  const expectedTemplate = 'Thanks Sam, and what is your main goal is it more fitness or fat loss?';

  console.log('4. Verification:');
  console.log(`Expected: "${expectedTemplate}"`);
  console.log(`Got:      "${secondMessage}"`);

  if (secondMessage.trim() === expectedTemplate.trim()) {
    console.log('\n✅ SUCCESS! Agent used exact template!');
  } else if (secondMessage.includes('main goal') && secondMessage.includes('fitness or fat loss')) {
    console.log('\n⚠️  PARTIAL: Agent used template content but modified it');
  } else {
    console.log('\n❌ FAIL: Agent completely ignored the template');
  }
}

testSecondMessage().catch(console.error);
