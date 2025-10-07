import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addTestPayments() {
  console.log('Fetching all clients...');

  // Get all clients for Atlas Fitness organization
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, org_id')
    .eq('org_id', 'ee1206d7-62fb-49cf-9f39-95b9c54423a4');

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
    return;
  }

  console.log(`Found ${clients.length} clients`);

  let inserted = 0;
  let errors = 0;

  for (const client of clients) {
    console.log(`Adding test payment for ${client.first_name} ${client.last_name} (${client.email})...`);

    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        organization_id: client.org_id,
        client_id: client.id,
        amount: 1.00,
        payment_status: 'succeeded',
        payment_method: 'test',
        payment_provider: 'test',
        provider_payment_id: `test_${client.id}_${Date.now()}`,
        payment_date: new Date().toISOString().split('T')[0],
        description: 'Test',
        metadata: {
          test: true,
          created_by: 'test_script',
        },
      });

    if (insertError) {
      console.error(`Error inserting payment for ${client.email}:`, insertError);
      errors++;
    } else {
      inserted++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total clients: ${clients.length}`);
  console.log(`Payments inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
}

addTestPayments().catch(console.error);
