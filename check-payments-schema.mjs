#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Get one payment to see actual columns
const { data: sample, error } = await supabase
  .from('payments')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error:', error);
} else if (sample && sample[0]) {
  console.log('Payment columns:', Object.keys(sample[0]).join(', '));
}
