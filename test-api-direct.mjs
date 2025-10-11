#!/usr/bin/env node
// Test the API endpoint directly to see if it times out or errors

const CONVERSATION_ID = 'e646362a-0bcb-4f0f-bcc7-f5e29e6edcc1'; // Most recent conversation with only user message
const API_URL = 'https://login.gymleadhub.co.uk';

console.log('Testing conversation messages API...\n');
console.log(`Conversation ID: ${CONVERSATION_ID}`);
console.log('Sending message: "what was revenue last month"\n');

const response = await fetch(`${API_URL}/api/ai-agents/conversations/${CONVERSATION_ID}/messages`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Note: This will fail due to auth, but we can see the error
  },
  body: JSON.stringify({
    content: 'what was revenue last month'
  })
});

const data = await response.json();

console.log('Response status:', response.status);
console.log('Response:', JSON.stringify(data, null, 2));

if (!response.ok) {
  console.log('\n❌ Request failed (expected - no auth cookie)');
} else {
  console.log('\n✅ Request succeeded');
}
