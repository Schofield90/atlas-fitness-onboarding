import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyODY0NDE2MywiZXhwIjoyMDQ0MjIwMTYzfQ.CvWSLwL-nLuBP3lYFajDZg9O4-uWtRFy9W7OyVgH9tE'
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

// Get current date/time in UK timezone
const now = new Date();
const ukDateTime = now.toLocaleString('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

const dayOfWeek = now.toLocaleDateString('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'long'
});

const isoDate = now.toISOString().split('T')[0];

// Fetch current system prompt
const { data: agent, error: fetchError } = await supabase
  .from('ai_agents')
  .select('system_prompt')
  .eq('id', agentId)
  .single();

if (fetchError) {
  console.error('Error fetching agent:', fetchError);
  process.exit(1);
}

// Add current date/time to the top of system prompt
const dateHeader = `CURRENT DATE/TIME:
Today is ${ukDateTime} (${dayOfWeek})
ISO Date: ${isoDate}

IMPORTANT: You are having this conversation on ${dayOfWeek}, ${now.toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'long', year: 'numeric' })}.

`;

let updatedPrompt = agent.system_prompt;

// Remove old date header if exists
updatedPrompt = updatedPrompt.replace(/^CURRENT DATE\/TIME:[\s\S]*?(?=\n\n[A-Z]|$)/m, '');

// Add new date header at the top
updatedPrompt = dateHeader + updatedPrompt.trim();

// Update agent
const { error: updateError } = await supabase
  .from('ai_agents')
  .update({ system_prompt: updatedPrompt })
  .eq('id', agentId);

if (updateError) {
  console.error('Error updating agent:', updateError);
  process.exit(1);
}

console.log('✅ System prompt updated with current date/time');
console.log('');
console.log('Current Date/Time:', ukDateTime);
console.log('Day of Week:', dayOfWeek);
console.log('ISO Date:', isoDate);
