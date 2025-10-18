#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyODczNDczOCwiZXhwIjoyMDQ0MzEwNzM4fQ.kQRj-l6863c-KTe1jCEvAGk0MZ2TpqNKaD4_y_vqS1M';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const AGENT_ID = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

const UPDATED_CALENDAR_SECTION = `
CALENDAR BOOKING - CRITICAL:

BUSINESS HOURS:
- You take calls Monday - Friday only
- NO calls on Saturday or Sunday
- When suggesting days, ALWAYS check the current day and skip weekends

SMART DAY SUGGESTIONS:
Before suggesting "tomorrow" or any specific day, consider:

1. Current day logic:
   - If today is Friday → Suggest "Monday" (skip weekend)
   - If today is Saturday → Suggest "Monday" (skip weekend)
   - If today is Sunday → Suggest "tomorrow" (Monday)
   - If today is Monday-Thursday → Check availability first

2. Check availability FIRST using check_ghl_availability tool
   - If next business day is fully booked → Suggest the following business day
   - If Monday is fully booked → Suggest Tuesday
   - If Tuesday is fully booked → Suggest Wednesday
   - And so on...

3. Natural language examples:
   - "Are you free Monday for a quick chat?" (when today is Friday/Saturday)
   - "Are you free tomorrow at all?" (when today is Mon-Thu and tomorrow has slots)
   - "Are you free Wednesday at all?" (when today is Mon and Tue is fully booked)

BOOKING TOOL USAGE:
✅ ALWAYS use check_ghl_availability FIRST to see what days/times are available
✅ THEN use book_ghl_appointment when they confirm a specific time
✅ Use tools when ANY specific time is mentioned
✅ Use when they REQUEST a time: "Can you book me in for 10am?"
✅ Use when they CONFIRM a time: "Yes, 2pm tomorrow works"
✅ Use when they CHANGE a time: "Let's do 1pm instead"
✅ Use when they AGREE to a time: "1pm is fine"

CONVERSATION FLOW:
1. Collect name, main goal (fitness/fat loss)
2. Check availability for next available business day
3. Suggest specific day based on availability: "Are you free [DAY] at all for a quick chat?"
4. When they confirm availability, show available times
5. When they choose a time, use book_ghl_appointment to actually book it

Examples that REQUIRE using the booking tool:
- "Can you book me in for a call at 10am tomorrow?"
- "Let's do 2pm"
- "Sorry let's do 1pm"
- "Yes, tomorrow at 3pm works for me"
- "I'm free at 9am"

DO NOT just respond with text - you MUST use the tool to actually book!
`.trim();

async function updateSystemPrompt() {
  console.log('🔍 Fetching current agent...\n');

  const { data: agent, error: fetchError } = await supabase
    .from('ai_agents')
    .select('system_prompt, name')
    .eq('id', AGENT_ID)
    .single();

  if (fetchError) {
    console.error('❌ Error fetching agent:', fetchError);
    process.exit(1);
  }

  console.log(`Agent: ${agent.name}\n`);

  // Find and replace the CALENDAR BOOKING section
  let updatedPrompt = agent.system_prompt;

  // Find the start of CALENDAR BOOKING section
  const calendarStart = updatedPrompt.indexOf('CALENDAR BOOKING');

  if (calendarStart === -1) {
    console.log('⚠️  CALENDAR BOOKING section not found, appending to end...\n');
    updatedPrompt = updatedPrompt + '\n\n' + UPDATED_CALENDAR_SECTION;
  } else {
    // Find the end of the section (next all-caps section or end of prompt)
    const afterCalendar = updatedPrompt.substring(calendarStart);
    const nextSectionMatch = afterCalendar.substring(20).match(/\n\n[A-Z][A-Z ]+:/);

    let calendarEnd;
    if (nextSectionMatch) {
      calendarEnd = calendarStart + 20 + nextSectionMatch.index;
    } else {
      calendarEnd = updatedPrompt.length;
    }

    // Replace the section
    updatedPrompt =
      updatedPrompt.substring(0, calendarStart) +
      UPDATED_CALENDAR_SECTION +
      updatedPrompt.substring(calendarEnd);
  }

  console.log('📝 Updating system prompt with smart day suggestions...\n');
  console.log('New CALENDAR BOOKING section:');
  console.log('─'.repeat(80));
  console.log(UPDATED_CALENDAR_SECTION);
  console.log('─'.repeat(80));
  console.log('');

  const { error: updateError } = await supabase
    .from('ai_agents')
    .update({ system_prompt: updatedPrompt })
    .eq('id', AGENT_ID);

  if (updateError) {
    console.error('❌ Error updating agent:', updateError);
    process.exit(1);
  }

  console.log('✅ System prompt updated successfully!\n');
  console.log('Changes:');
  console.log('  ✅ Added BUSINESS HOURS section (Mon-Fri only)');
  console.log('  ✅ Added SMART DAY SUGGESTIONS with weekend logic');
  console.log('  ✅ Friday/Saturday → Suggest Monday');
  console.log('  ✅ Check availability first before suggesting days');
  console.log('  ✅ Skip fully booked days automatically');
  console.log('');
  console.log('Test the agent now - it should:');
  console.log('  1. Suggest "Monday" when tested on Friday/Saturday');
  console.log('  2. Check availability before suggesting any day');
  console.log('  3. Skip to next available day if one is fully booked');
}

updateSystemPrompt();
