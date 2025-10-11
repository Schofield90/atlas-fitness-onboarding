#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ORG_ID = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';

// Check for failed/declined payments
const { data: failed, error } = await supabase
  .from('payments')
  .select('*')
  .eq('organization_id', ORG_ID)
  .in('payment_status', ['failed', 'declined', 'requires_action'])
  .gte('payment_date', '2025-09-01')
  .lte('payment_date', '2025-09-30');

if (error) {
  console.error('Error:', error);
} else {
  console.log(`Found ${failed.length} failed/declined payments in September 2025`);
  if (failed.length > 0) {
    console.log('Sample:', failed[0]);
  }
}

// Also check all payment statuses to see what exists
const { data: allStatuses } = await supabase
  .from('payments')
  .select('payment_status')
  .eq('organization_id', ORG_ID);

const statuses = [...new Set(allStatuses?.map(p => p.payment_status))];
console.log('\nAll payment statuses in database:', statuses.join(', '));
