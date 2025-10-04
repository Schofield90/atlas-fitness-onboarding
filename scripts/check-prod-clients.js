#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Production Supabase (the one login.gymleadhub.co.uk uses)
const supabaseUrl = 'https://yafbzdjwhlbeafamznhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZmJ6ZGp3aGxiZWFmYW16bmh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzY5NTE4MCwiZXhwIjoyMDQzMjcxMTgwfQ.YvyPtUw7_Gb2z0Xrpvnbhxdt2yGcYnFuZAR_CJqiWZw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProdClients() {
  const { count, error } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n📊 PRODUCTION database clients: ${count}\n`);

  if (count > 0) {
    const { data } = await supabase
      .from('clients')
      .select('id, email, org_id, organization_id, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    console.log('Recent clients:');
    data?.forEach(c => console.log(`  - ${c.email} (org_id: ${c.org_id}, organization_id: ${c.organization_id})`));
  }
}

checkProdClients();
