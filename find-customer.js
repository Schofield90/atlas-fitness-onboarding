/**
 * Find customer by email
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  console.log('Usage: NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=yyy node find-customer.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findCustomer() {
  const email = 'samschofield90@hotmail.co.uk';

  console.log(`\nSearching for customer: ${email}\n`);

  // Check clients table
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('email', email);

  if (clientError) {
    console.error('Error searching clients:', clientError);
  } else if (clients && clients.length > 0) {
    console.log(`✅ Found in 'clients' table:`);
    clients.forEach(c => {
      console.log(`   ID: ${c.id}`);
      console.log(`   Name: ${c.first_name} ${c.last_name}`);
      console.log(`   Email: ${c.email}`);
      console.log(`   Org ID: ${c.org_id}`);
      console.log('');
    });
  } else {
    console.log('❌ Not found in clients table');
  }

  // Check leads table
  const { data: leads, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('email', email);

  if (leadError) {
    console.error('Error searching leads:', leadError);
  } else if (leads && leads.length > 0) {
    console.log(`✅ Found in 'leads' table:`);
    leads.forEach(l => {
      console.log(`   ID: ${l.id}`);
      console.log(`   Name: ${l.name}`);
      console.log(`   Email: ${l.email}`);
      console.log(`   Org ID: ${l.organization_id}`);
      console.log('');
    });
  } else {
    console.log('❌ Not found in leads table');
  }
}

findCustomer().catch(console.error);
