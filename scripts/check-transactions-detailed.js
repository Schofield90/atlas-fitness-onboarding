const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function checkTransactionsDetailed() {
  console.log('💳 Checking transactions table in detail...\n');

  try {
    // 1. Get sample transaction
    console.log('1. Transactions table structure:');
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .limit(3);

    if (error) {
      console.log('Error:', error.message);
      
      // If transactions doesn't exist, let's create it
      console.log('\nTransactions table might not exist. Checking if we need to create it...');
    } else if (transactions && transactions.length > 0) {
      console.log('Columns:', Object.keys(transactions[0]));
      console.log('\nSample transaction:');
      console.log(JSON.stringify(transactions[0], null, 2));
    } else {
      console.log('Transactions table exists but is empty');
      console.log('\nTable ready for payment imports!');
    }

    // 2. Check payments table
    console.log('\n2. Checking for payments table:');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .limit(1);

    if (!paymentsError && payments) {
      console.log('Payments table exists');
      if (payments.length > 0) {
        console.log('Columns:', Object.keys(payments[0]));
      }
    } else {
      console.log('Payments table not found:', paymentsError?.message);
    }

    // 3. Check what payment data might be stored in metadata
    console.log('\n3. Checking client metadata for payment info:');
    const { data: clientsWithMetadata } = await supabase
      .from('clients')
      .select('id, name, metadata')
      .eq('organization_id', organizationId)
      .not('metadata', 'is', null)
      .limit(5);

    let hasPaymentData = false;
    clientsWithMetadata?.forEach(client => {
      if (client.metadata?.last_payment_amount || client.metadata?.last_payment_date) {
        if (!hasPaymentData) {
          console.log('\nFound payment data in client metadata:');
          hasPaymentData = true;
        }
        console.log(`  ${client.name}:`);
        if (client.metadata.last_payment_amount) {
          console.log(`    Last payment: £${client.metadata.last_payment_amount}`);
        }
        if (client.metadata.last_payment_date) {
          console.log(`    Last payment date: ${client.metadata.last_payment_date}`);
        }
      }
    });

    if (!hasPaymentData) {
      console.log('No payment data found in client metadata');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTransactionsDetailed();