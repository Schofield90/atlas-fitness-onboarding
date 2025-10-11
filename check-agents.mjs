#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ORG_ID = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';

const { data: agents, error } = await supabase
  .from('ai_agents')
  .select('id, name, enabled')
  .eq('organization_id', ORG_ID);

if (error) {
  console.error('Error:', error);
} else {
  console.log(`Agents for organization:\n`);
  agents.forEach(a => {
    console.log(`${a.id.substring(0, 8)}... - ${a.name} (enabled: ${a.enabled})`);
  });
}
