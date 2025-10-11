#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ORG_ID = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';

// Test the exact query that the revenue tool uses
const { data: payments, error } = await supabase
  .from('payments')
  .select(`
    id,
    payment_date,
    amount,
    payment_status,
    payment_method,
    client_id,
    membership_id
  `)
  .eq('organization_id', ORG_ID)
  .in('payment_status', ['paid_out', 'succeeded', 'confirmed', 'completed'])
  .gte('payment_date', '2025-09-01')
  .lte('payment_date', '2025-10-31')
  .order('payment_date', { ascending: true });

if (error) {
  console.error('❌ Query failed:', error);
} else {
  console.log(`✅ Query succeeded: ${payments.length} payments found`);
  if (payments.length > 0) {
    const total = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    console.log(`💰 Total revenue: £${total.toFixed(2)}`);
    console.log(`📊 Date range: ${payments[0].payment_date} to ${payments[payments.length-1].payment_date}`);
  }
}
