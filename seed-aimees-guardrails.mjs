import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e'; // Aimee's Place agent
const organizationId = '0ef8a082-4458-400a-8c50-75b47e461f91'; // GymLeadHub org

console.log('\n🌱 Seeding default guardrails for Aimees Place...\n');

// Define default guardrails for Aimee's Place
const defaultGuardrails = [
  {
    name: 'AI Off Tag Blocker',
    description: 'Prevents AI from messaging leads tagged with "ai off" or "do not contact"',
    type: 'tag_blocker',
    config: {
      blocked_tags: ['ai off', 'do not contact', 'unsubscribe'],
      case_sensitive: false,
      match_type: 'contains', // 'contains' or 'exact'
    },
    enabled: true,
    sort_order: 0, // Check this first (most important)
  },
  {
    name: 'Business Hours Only',
    description: 'Only allow AI messages during business hours (Mon-Fri 9am-5pm UK time)',
    type: 'business_hours',
    config: {
      timezone: 'Europe/London',
      schedule: {
        monday: { enabled: true, start: '09:00', end: '17:00' },
        tuesday: { enabled: true, start: '09:00', end: '17:00' },
        wednesday: { enabled: true, start: '09:00', end: '17:00' },
        thursday: { enabled: true, start: '09:00', end: '17:00' },
        friday: { enabled: true, start: '09:00', end: '17:00' },
        saturday: { enabled: false },
        sunday: { enabled: false },
      },
    },
    enabled: true,
    sort_order: 1,
  },
  {
    name: 'Rate Limit Protection',
    description: 'Max 3 messages per day per lead, with 2-hour cooldown between messages',
    type: 'rate_limit',
    config: {
      max_messages_per_day: 3,
      max_messages_per_hour: 2,
      min_minutes_between_messages: 120, // 2 hours
    },
    enabled: true,
    sort_order: 2,
  },
  {
    name: 'Active Leads Only',
    description: 'Only message leads with active status (not converted or lost)',
    type: 'lead_status',
    config: {
      allowed_statuses: ['new', 'contacted', 'qualified'], // Only message these
      blocked_statuses: ['converted', 'lost', 'archived'], // Never message these
    },
    enabled: true,
    sort_order: 3,
  },
  {
    name: 'Human Takeover Cooldown',
    description: 'Pause AI for 30 minutes after a staff member sends a manual message',
    type: 'human_takeover',
    config: {
      cooldown_minutes: 30,
      detect_manual_messages: true,
    },
    enabled: true,
    sort_order: 4,
  },
  {
    name: 'Active Conversations Only',
    description: 'Only message conversations that are active (not archived or paused)',
    type: 'conversation_status',
    config: {
      allowed_statuses: ['active'],
      blocked_statuses: ['archived', 'deleted', 'paused'],
    },
    enabled: true,
    sort_order: 5,
  },
];

// Seed guardrails
console.log('📝 Creating guardrails...\n');

const createdGuardrails = [];

for (const guardrailDef of defaultGuardrails) {
  const { sort_order, ...guardrailData } = guardrailDef;

  const { data: guardrail, error } = await supabase
    .from('guardrails')
    .insert({
      organization_id: organizationId,
      ...guardrailData,
    })
    .select()
    .single();

  if (error) {
    console.log(`❌ Failed to create "${guardrailDef.name}":`, error.message);
    continue;
  }

  console.log(`✅ Created: ${guardrail.name} (${guardrail.type})`);
  createdGuardrails.push({ ...guardrail, sort_order });
}

console.log(`\n📊 Created ${createdGuardrails.length} guardrails\n`);

// Link all guardrails to Aimee's Place agent
console.log('🔗 Linking guardrails to agent...\n');

const links = createdGuardrails.map((g) => ({
  agent_id: agentId,
  guardrail_id: g.id,
  sort_order: g.sort_order,
}));

const { data: linkedGuardrails, error: linkError } = await supabase
  .from('agent_guardrails')
  .insert(links)
  .select();

if (linkError) {
  console.log('❌ Failed to link guardrails to agent:', linkError.message);
} else {
  console.log(`✅ Linked ${linkedGuardrails.length} guardrails to Aimees Place agent\n`);
}

// Fetch and display final configuration
console.log('📋 Final Guardrail Configuration:\n');

const { data: agentGuardrails } = await supabase
  .from('agent_guardrails')
  .select(`
    sort_order,
    guardrail:guardrails(name, type, enabled)
  `)
  .eq('agent_id', agentId)
  .order('sort_order', { ascending: true });

if (agentGuardrails) {
  agentGuardrails.forEach((ag, index) => {
    const status = ag.guardrail.enabled ? '🟢' : '🔴';
    console.log(`   ${index + 1}. [Order ${ag.sort_order}] ${status} ${ag.guardrail.name}`);
    console.log(`      Type: ${ag.guardrail.type}\n`);
  });
}

console.log('✨ Seeding complete!\n');
console.log('💡 Test the guardrails:');
console.log('   1. Tag a GHL contact with "ai off"');
console.log('   2. Send a webhook from that contact');
console.log('   3. Check webhook logs - should be blocked by Tag Blocker guardrail\n');
