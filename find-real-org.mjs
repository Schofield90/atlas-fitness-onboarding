#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const REAL_ORG_ID = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'; // Your actual gym

const { data: org } = await supabase
  .from('organizations')
  .select('name')
  .eq('id', REAL_ORG_ID)
  .single();

console.log(`Your real organization: ${org?.name || 'Unknown'}`);
console.log(`ID: ${REAL_ORG_ID}\n`);

// Check if there's an agent for this org
const { data: agents } = await supabase
  .from('ai_agents')
  .select('id, name, model, enabled')
  .eq('organization_id', REAL_ORG_ID);

console.log(`Agents for ${org?.name}:`);
if (agents && agents.length > 0) {
  agents.forEach(a => {
    console.log(`  - ${a.name} (${a.model}) - Enabled: ${a.enabled}`);
    console.log(`    ID: ${a.id}`);
  });
} else {
  console.log('  No agents found');
  console.log('\n💡 You need to create a finance agent for your actual gym!');
  console.log('   The current finance agent belongs to Demo Fitness Studio.');
}
