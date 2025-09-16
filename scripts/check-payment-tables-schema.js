const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const davidId = 'd067bd15-0d73-4b3c-8d74-98cd9e049d13';

async function checkPaymentTablesSchema() {
  console.log('🔍 Checking payment tables schema...\n');

  try {
    // Check payment_transactions table structure
    console.log('1️⃣ payment_transactions table:');
    const { data: samplePT, error: ptError } = await supabase
      .from('payment_transactions')
      .select('*')
      .limit(1);

    if (!ptError && samplePT && samplePT.length > 0) {
      console.log('Columns:', Object.keys(samplePT[0]).join(', '));
      console.log('\nSample record:');
      console.log(JSON.stringify(samplePT[0], null, 2));
    } else if (ptError) {
      console.log('Error:', ptError.message);
    } else {
      console.log('Table is empty, trying to insert test data...');

      // Try different column combinations
      const testVariations = [
        // Variation 1: total_amount instead of amount
        {
          customer_id: davidId,
          client_id: davidId,
          total_amount: 8500,
          status: 'completed',
          payment_method: 'Test',
          created_at: new Date().toISOString()
        },
        // Variation 2: transaction_amount
        {
          customer_id: davidId,
          client_id: davidId,
          transaction_amount: 8500,
          status: 'completed',
          created_at: new Date().toISOString()
        },
        // Variation 3: minimal fields
        {
          customer_id: davidId,
          created_at: new Date().toISOString()
        }
      ];

      for (let i = 0; i < testVariations.length; i++) {
        console.log(`\nTrying variation ${i + 1}...`);
        const { data, error } = await supabase
          .from('payment_transactions')
          .insert(testVariations[i])
          .select();

        if (!error) {
          console.log('✅ Success! Created with columns:', Object.keys(data[0]).join(', '));
          console.log('Record:', JSON.stringify(data[0], null, 2));
          break;
        } else {
          console.log(`❌ Failed: ${error.message}`);
        }
      }
    }

    // Check the transactions table we successfully created in
    console.log('\n2️⃣ transactions table (where we successfully created):');
    const { data: davidTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('client_id', davidId)
      .order('created_at', { ascending: false });

    console.log(`Found ${davidTransactions?.length || 0} transactions for David`);
    if (davidTransactions && davidTransactions.length > 0) {
      davidTransactions.forEach(t => {
        console.log(`  - £${(t.amount/100).toFixed(2)} on ${new Date(t.created_at).toLocaleDateString()}`);
      });
    }

    // Check the payments table
    console.log('\n3️⃣ payments table:');
    const { data: davidPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', davidId)
      .order('payment_date', { ascending: false });

    console.log(`Found ${davidPayments?.length || 0} payments for David`);
    if (davidPayments && davidPayments.length > 0) {
      davidPayments.forEach(p => {
        console.log(`  - £${(p.amount/100).toFixed(2)} on ${new Date(p.payment_date || p.created_at).toLocaleDateString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPaymentTablesSchema();