import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

// Get current prompt
const { data: agent } = await supabase
  .from('ai_agents')
  .select('system_prompt')
  .eq('id', agentId)
  .single();

let updatedPrompt = agent.system_prompt;

// Find and replace the CALENDAR BOOKING section
const calendarSection = `CALENDAR BOOKING - CRITICAL:
✅ ALWAYS use the book_ghl_appointment tool when ANY specific time is mentioned
✅ Use it when they REQUEST a time: "Can you book me in for 10am?"
✅ Use it when they CONFIRM a time: "Yes, 2pm tomorrow works"
✅ Use it when they CHANGE a time: "Let's do 1pm instead"
✅ Use it when they AGREE to a time: "1pm is fine"

Examples that REQUIRE using the booking tool:
- "Can you book me in for a call at 10am tomorrow?"
- "Let's do 2pm"
- "Sorry let's do 1pm"
- "Yes, tomorrow at 3pm works for me"
- "I'm free at 9am"

DO NOT just respond with text - you MUST use the tool to actually book the appointment!`;

const newCalendarSection = `CALENDAR BOOKING - CRITICAL:
✅ ALWAYS use the book_ghl_appointment tool when ANY specific time is mentioned
✅ Use it when they REQUEST a time: "Can you book me in for 10am?"
✅ Use it when they CONFIRM a time: "Yes, 2pm tomorrow works"
✅ Use it when they CHANGE a time: "Let's do 1pm instead"
✅ Use it when they AGREE to a time: "1pm is fine"

Examples that REQUIRE using the booking tool:
- "Can you book me in for a call at 10am tomorrow?"
- "Let's do 2pm"
- "Sorry let's do 1pm"
- "Yes, tomorrow at 3pm works for me"
- "I'm free at 9am"

DO NOT just respond with text - you MUST use the tool to actually book!

⚠️ IF BOOKING FAILS (tool returns error):
- NEVER say "I've booked you in" or "You're all set"
- NEVER confirm a booking that didn't actually succeed
- Instead, apologize and explain: "I'm having trouble accessing the calendar right now"
- Offer alternative: "Let me take your details and I'll have someone call you back to confirm a time"
- BE HONEST - do not mislead the customer about booking status`;

updatedPrompt = updatedPrompt.replace(calendarSection, newCalendarSection);

// Update the agent
const { error } = await supabase
  .from('ai_agents')
  .update({ system_prompt: updatedPrompt })
  .eq('id', agentId);

if (error) {
  console.log('❌ Error updating prompt:', error.message);
} else {
  console.log('✅ System prompt updated with calendar error handling instructions');
  console.log('\nNew section added:');
  console.log('⚠️ IF BOOKING FAILS (tool returns error):');
  console.log('- NEVER say "I\'ve booked you in" or "You\'re all set"');
  console.log('- NEVER confirm a booking that didn\'t actually succeed');
  console.log('- Instead, apologize and explain: "I\'m having trouble accessing the calendar right now"');
  console.log('- Offer alternative: "Let me take your details and I\'ll have someone call you back to confirm a time"');
  console.log('- BE HONEST - do not mislead the customer about booking status');
}
