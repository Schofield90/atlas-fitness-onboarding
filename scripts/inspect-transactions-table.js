const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function inspectTransactions() {
  console.log('💳 Inspecting transactions table structure...\n');

  try {
    // 1. Get a sample transaction
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .limit(3);

    if (error) {
      console.log('Error fetching transactions:', error.message);
      
      // Try to create a sample transaction to see the structure
      console.log('\nAttempting to understand table structure...');
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          organization_id: organizationId,
          client_id: '00000000-0000-0000-0000-000000000000',
          amount: 0,
          type: 'test',
          status: 'pending'
        });
      
      if (insertError) {
        console.log('Insert error (helps show required fields):', insertError.message);
      }
      return;
    }

    if (transactions && transactions.length > 0) {
      console.log('1. Transaction table columns:');
      console.log(Object.keys(transactions[0]));
      
      console.log('\n2. Sample transactions:');
      transactions.forEach((txn, index) => {
        console.log(`\nTransaction ${index + 1}:`);
        console.log(JSON.stringify(txn, null, 2));
      });
    } else {
      console.log('No transactions found in the table.');
      
      // Show the structure we can insert
      console.log('\nTrying to insert a test transaction to discover structure...');
      const testTransaction = {
        id: require('crypto').randomUUID(),
        organization_id: organizationId,
        client_id: null,
        customer_id: null,
        amount: 5000, // in pennies
        currency: 'GBP',
        type: 'payment',
        payment_method: 'card',
        status: 'completed',
        description: 'Test payment import',
        reference: 'TEST-001',
        transaction_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          source: 'import',
          import_date: new Date().toISOString()
        }
      };

      const { data: newTxn, error: createError } = await supabase
        .from('transactions')
        .insert(testTransaction)
        .select()
        .single();

      if (createError) {
        console.log('\nError creating test transaction:');
        console.log(createError.message);
        console.log('\nThis tells us about the table constraints.');
      } else if (newTxn) {
        console.log('\nSuccessfully created test transaction!');
        console.log('Transaction structure:');
        console.log(JSON.stringify(newTxn, null, 2));
        
        // Clean up test transaction
        await supabase
          .from('transactions')
          .delete()
          .eq('id', newTxn.id);
        console.log('\nTest transaction cleaned up.');
      }
    }

    // 3. Check for any existing payment data
    console.log('\n3. Checking for existing payment records:');
    const { count: txnCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    
    console.log(`Total transactions for organization: ${txnCount || 0}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

inspectTransactions();