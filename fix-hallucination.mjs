#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

// Get current system prompt
const { data: agent } = await supabase
  .from('ai_agents')
  .select('system_prompt')
  .eq('id', agentId)
  .single();

// Add anti-hallucination rules at the end of calendar section
const updatedPrompt = agent.system_prompt.replace(
  /(⚠️ \*\*STEP 4: Handle Tool Response\*\*[\s\S]*?)$/m,
  `$1

🚨 **CRITICAL: NO HALLUCINATIONS**

When you use the book_ghl_appointment tool, it returns ACTUAL data:
- success: true/false
- data.startTime: The ACTUAL booked time
- data.message: Alternative times if requested slot unavailable

❌ **NEVER make up times or data**
❌ **NEVER list times that aren't in the tool response**
❌ **NEVER say "I have these times available" after booking**

✅ **ALWAYS use the exact data from the tool result:**

If tool returns:
{
  "success": true,
  "data": {
    "startTime": "2025-10-21T09:30:00+01:00",
    "confirmationMessage": "Great! I've booked..."
  }
}

You MUST respond with:
"Great! I've booked you in for 9:30am on Tuesday October 21. You'll receive a confirmation shortly."

DO NOT respond with:
"I have these times available: 9:30am, 10am, 2pm..." ← HALLUCINATION!

If tool returns:
{
  "success": false,
  "data": {
    "message": "Unfortunately 10:00 isn't available. I have: 11:00, 14:00, 16:00. Which works?"
  }
}

You MUST use the exact message:
"Unfortunately 10:00 isn't available. I have: 11:00, 14:00, 16:00. Which works?"

🎯 **Golden Rule**: Only mention times that are explicitly in the tool response. Never invent times.
`
);

// Update the agent
const { error } = await supabase
  .from('ai_agents')
  .update({ system_prompt: updatedPrompt })
  .eq('id', agentId);

if (error) {
  console.error('❌ Error updating prompt:', error);
  process.exit(1);
}

console.log('✅ Anti-hallucination rules added!');
console.log('\n📋 KEY CHANGES:');
console.log('1. Added 🚨 CRITICAL: NO HALLUCINATIONS section');
console.log('2. Explicit rule: NEVER make up times');
console.log('3. ALWAYS use exact data from tool response');
console.log('4. Examples of correct vs incorrect responses');
console.log('\n✅ Agent will now:');
console.log('   - Only mention times from tool response');
console.log('   - Never invent or cache times');
console.log('   - Use exact confirmation messages');
