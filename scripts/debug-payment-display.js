const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// The ID from your URL
const urlId = 'd067bd15-0d73-4b3c-8d74-98cd9e049d13';

async function debugPaymentDisplay() {
  console.log('🔍 Debugging payment display issue...\n');
  console.log('URL ID:', urlId);

  try {
    // Check if this is a lead ID
    console.log('\n1️⃣ Checking if this is a lead ID...');
    const { data: lead } = await supabase
      .from('leads')
      .select('id, name, client_id')
      .eq('id', urlId)
      .single();

    if (lead) {
      console.log('✅ Found as lead:', lead);
      if (lead.client_id) {
        console.log('Has linked client_id:', lead.client_id);
      }
    } else {
      console.log('❌ Not found in leads table');
    }

    // Check if this is a client ID
    console.log('\n2️⃣ Checking if this is a client ID...');
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, lead_id, organization_id')
      .eq('id', urlId)
      .single();

    if (client) {
      console.log('✅ Found as client:', client);
    } else {
      console.log('❌ Not found in clients table');
    }

    // Now let's check what payments exist for David
    console.log('\n3️⃣ Checking all payments for David Wrightson...');

    // First find David by name
    const { data: davidClients } = await supabase
      .from('clients')
      .select('id, name')
      .ilike('name', '%david%wrightson%');

    if (davidClients && davidClients.length > 0) {
      for (const david of davidClients) {
        console.log(`\nPayments for ${david.name} (ID: ${david.id}):`);

        // Check transactions
        const { data: transactions } = await supabase
          .from('transactions')
          .select('id, amount, type, created_at')
          .eq('client_id', david.id)
          .eq('type', 'payment')
          .order('created_at', { ascending: false })
          .limit(10);

        console.log(`  Transactions: ${transactions?.length || 0} found`);
        if (transactions && transactions.length > 0) {
          transactions.forEach(t => {
            console.log(`    - £${(t.amount/100).toFixed(2)} on ${new Date(t.created_at).toLocaleDateString()}`);
          });
        }

        // Check payments table
        const { data: payments } = await supabase
          .from('payments')
          .select('id, amount, payment_date, payment_status')
          .eq('client_id', david.id)
          .order('payment_date', { ascending: false })
          .limit(10);

        console.log(`  Payments: ${payments?.length || 0} found`);
        if (payments && payments.length > 0) {
          payments.forEach(p => {
            console.log(`    - £${(p.amount/100).toFixed(2)} on ${new Date(p.payment_date).toLocaleDateString()} (${p.payment_status})`);
          });
        }
      }
    }

    // Check if payments might be under the wrong ID
    console.log('\n4️⃣ Checking if payments might be assigned to wrong IDs...');

    // Find all Davids in both tables
    const { data: davidLeads } = await supabase
      .from('leads')
      .select('id, name, client_id')
      .ilike('name', '%david%wrightson%');

    if (davidLeads && davidLeads.length > 0) {
      console.log('David found in leads:');
      davidLeads.forEach(l => {
        console.log(`  - Lead ID: ${l.id}, Client ID: ${l.client_id}`);
      });
    }

    // Check payment allocation patterns
    console.log('\n5️⃣ Checking recent imported payments...');
    const { data: recentPayments } = await supabase
      .from('payments')
      .select('client_id, amount, payment_date, organization_id')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentPayments && recentPayments.length > 0) {
      console.log(`Found ${recentPayments.length} recent payments in organization`);

      // Check if any client_ids are actually lead IDs
      const clientIds = [...new Set(recentPayments.map(p => p.client_id))];
      console.log(`Unique client_ids in recent payments: ${clientIds.length}`);

      for (const clientId of clientIds.slice(0, 5)) {
        // Check if this ID exists in clients table
        const { data: clientCheck } = await supabase
          .from('clients')
          .select('id, name')
          .eq('id', clientId)
          .single();

        if (!clientCheck) {
          // Check if it's a lead ID
          const { data: leadCheck } = await supabase
            .from('leads')
            .select('id, name')
            .eq('id', clientId)
            .single();

          if (leadCheck) {
            console.log(`  ⚠️ Payment assigned to lead ID ${clientId} (${leadCheck.name})`);
          } else {
            console.log(`  ❌ Payment assigned to non-existent ID ${clientId}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugPaymentDisplay();