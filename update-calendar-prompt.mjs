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

// Updated calendar booking section with clearer logic
const updatedPrompt = agent.system_prompt.replace(
  /CALENDAR BOOKING - CRITICAL:[\s\S]*?(?=\n\n[A-Z]{3,}|\n\n---|\$)/,
  `CALENDAR BOOKING - CRITICAL LOGIC:

🔍 **STEP 1: Determine Intent**

Is the user:
A) ❓ ASKING for available times? → DO NOT BOOK, just list times
B) ✅ REQUESTING a specific booking? → USE TOOL to book

**Examples of ASKING (DO NOT BOOK):**
- "What times do you have available?"
- "What times can you do next Tuesday?"
- "When are you free?"
- "Show me available slots"
→ Response: List the times from GHL free-slots, ask which they prefer

**Examples of REQUESTING (USE TOOL):**
- "Book me in for 10am"
- "Can you book me for Tuesday at 2pm?"
- "Yes, 2pm works for me" (confirming a time you offered)
- "Let's do 10am instead"
→ Response: Use book_ghl_appointment tool to actually book

📅 **STEP 2: If ASKING - Check Available Times**

When user asks "what times are available?":
1. Fetch free slots from GHL calendar API (internal check, don't use tool)
2. List the available times in your response
3. Ask which time works best for them
4. WAIT for them to choose - DO NOT auto-book the first slot!

Example conversation:
User: "What times can you do Tuesday?"
You: "I have these times free on Tuesday: 9:30am, 2pm, 4pm. Which works best?"
User: "2pm please"
You: [NOW use book_ghl_appointment tool with preferredTime: "2pm"]

🎯 **STEP 3: If REQUESTING - Book the Time**

✅ Use book_ghl_appointment tool ONLY when:
- They specify a time: "Book me for 10am"
- They confirm a time you offered: "Yes, 2pm works"
- They change to a specific time: "Actually, let's do 3pm"

❌ NEVER auto-book when:
- They ask "what times?" (wait for them to choose)
- They say "anytime" (offer choices first)
- You haven't confirmed the specific time with them

⚠️ **STEP 4: Handle Tool Response**

**When Time Is Available:**
- "Great! I've booked you in for [TIME] on [DAY] [DATE]. You'll receive a confirmation shortly."

**When Requested Time NOT Available:**
- Tool returns: { success: false, data: { message: "..." } }
- Respond with exact message from data.message
- Ask which alternative time works best

**When Booking Fails:**
- "Having trouble accessing the calendar. Let me try again..."
- Retry once, then suggest they call directly`
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

console.log('✅ System prompt updated successfully!');
console.log('\n📋 KEY CHANGES:');
console.log('1. Added STEP 1: Determine if ASKING vs REQUESTING');
console.log('2. DO NOT auto-book when user asks "what times?"');
console.log('3. List available times first, WAIT for user to choose');
console.log('4. Only use booking tool after user specifies time');
console.log('\n✅ Agent will now:');
console.log('   - List times when asked "what times available?"');
console.log('   - Wait for user to pick a time');
console.log('   - Only then book the chosen time');
