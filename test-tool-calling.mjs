// Test tool calling with direct orchestrator usage
import { config } from 'dotenv';
config({ path: '.env.local' });

import { Orchestrator } from './lib/ai-agents/orchestrator.js';

const conversationId = '278b7472-e907-440b-9c62-a5a0b1dbc71f';
const agentId = '00f2d394-28cd-43ee-8db4-8f841c5d4873';
const organizationId = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';
const userId = 'bb9e8f7d-fc7e-45e6-9d29-d43e866d3b5b';

console.log('Initializing orchestrator...');
const orchestrator = new Orchestrator();

console.log('\nSending message: "how many clients do we have?"\n');

try {
  const result = await orchestrator.execute(
    conversationId,
    'how many clients do we have?',
    agentId,
    organizationId,
    userId
  );

  console.log('\n=== RESULT ===');
  console.log('Success:', result.success);
  if (result.success) {
    console.log('Response:', result.response);
  } else {
    console.error('Error:', result.error);
  }
} catch (error) {
  console.error('\n=== ERROR ===');
  console.error(error);
}
