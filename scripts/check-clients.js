#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkClients() {
  const { count, error } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total clients in database: ${count}`);

  if (count > 0) {
    const { data } = await supabase
      .from('clients')
      .select('email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('\nMost recent 5 clients:');
    data?.forEach(c => console.log(`- ${c.email} (created: ${c.created_at})`));
  }
}

checkClients();
