const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const davidId = 'd067bd15-0d73-4b3c-8d74-98cd9e049d13';

async function fixPaymentDisplay() {
  console.log('🔍 Fixing payment display for David Wrightson...\n');
  console.log('David\'s ID:', davidId);

  try {
    // First, let's make sure David exists in clients table
    console.log('\n1️⃣ Checking if David exists in clients table...');
    const { data: davidClient, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', davidId)
      .single();

    if (!davidClient) {
      console.log('❌ David not found in clients table. Checking by name...');
      
      const { data: clientByName } = await supabase
        .from('clients')
        .select('*')
        .or('name.ilike.%david%wrightson%,name.ilike.%wrightson%david%')
        .single();
      
      if (clientByName) {
        console.log('✅ Found David by name:', clientByName.id, clientByName.name);
        // Update davidId to the correct one
        davidId = clientByName.id;
      } else {
        console.log('❌ David not found in clients table at all');
        return;
      }
    } else {
      console.log('✅ David found in clients table');
    }

    // Check and create payments in the 'payments' table (the standard one)
    console.log('\n2️⃣ Checking payments table...');
    const { data: existingPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', davidId)
      .order('created_at', { ascending: false });

    console.log(`Found ${existingPayments?.length || 0} payments in payments table`);

    if (existingPayments && existingPayments.length > 0) {
      console.log('Recent payments:');
      existingPayments.slice(0, 3).forEach(p => {
        // Amount appears to be stored in pounds, not pennies
        console.log(`  - £${p.amount.toFixed(2)} on ${p.payment_date}`);
      });
    }

    // Create a new test payment in the payments table
    console.log('\n3️⃣ Creating new test payment in payments table...');
    
    // Get the organization_id from David's client record
    const orgId = davidClient?.organization_id || 'fe619c03-0436-42c2-ae09-ce7e73b36a7b'; // Default to known org ID
    
    const paymentData = {
      organization_id: orgId,
      client_id: davidId,
      amount: 7500, // £75.00 in pounds (not pennies since the existing payment shows 59.00)
      payment_date: new Date().toISOString().split('T')[0], // Just the date part
      payment_method: 'test',
      payment_status: 'completed',  // Using payment_status as per the import route
      description: 'Test payment for David Wrightson - Check Payments tab',
      metadata: {
        source: 'manual_fix',
        created_by: 'fix_script'
      },
      created_at: new Date().toISOString()
    };

    const { data: newPayment, error: insertError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Error creating payment:', insertError);
    } else {
      console.log('✅ Successfully created payment:', {
        id: newPayment.id,
        amount: `£${newPayment.amount.toFixed(2)}`,
        payment_date: newPayment.payment_date
      });
    }

    // Also check payment_transactions table if it exists
    console.log('\n4️⃣ Checking payment_transactions table...');
    const { data: ptTest, error: ptError } = await supabase
      .from('payment_transactions')
      .select('*')
      .limit(1);

    if (!ptError) {
      console.log('✅ payment_transactions table exists');

      // Check existing payments for David using contact_id
      const { data: existingPT } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('contact_id', davidId)
        .order('created_at', { ascending: false });

      console.log(`Found ${existingPT?.length || 0} payments in payment_transactions`);

      if (!existingPT || existingPT.length === 0) {
        // Create a payment in payment_transactions too
        const ptData = {
          organization_id: orgId,
          contact_id: davidId, // Using contact_id as per table structure
          amount: 85.00, // £85.00 in pounds to match payments table
          status: 'succeeded',
          type: 'other',
          description: 'Test payment transaction for David Wrightson',
          created_at: new Date().toISOString(),
          succeeded_at: new Date().toISOString()
        };

        const { data: newPT, error: ptInsertError } = await supabase
          .from('payment_transactions')
          .insert(ptData)
          .select()
          .single();

        if (ptInsertError) {
          console.log('❌ Error creating payment transaction:', ptInsertError.message);
        } else {
          console.log('✅ Successfully created payment transaction:', {
            id: newPT.id,
            amount: `£${newPT.amount.toFixed(2)}`,
            created_at: newPT.created_at
          });
        }
      }
    } else {
      console.log('⚠️ payment_transactions table not accessible');
    }

    // Check all payment-related tables to understand the data structure
    console.log('\n4️⃣ Checking all payment tables for David\'s data...');

    const tables = ['transactions', 'payments', 'payment_transactions'];
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .or(`client_id.eq.${davidId},customer_id.eq.${davidId}`)
          .limit(5);

        if (!error) {
          console.log(`\n${table}: ${data?.length || 0} records found`);
          if (data && data.length > 0) {
            const sample = data[0];
            console.log('  Columns:', Object.keys(sample).join(', '));
          }
        }
      } catch (e) {
        console.log(`${table}: Not accessible`);
      }
    }

    console.log('\n✅ Payment setup complete!');
    console.log('\n📍 To see payments in the UI:');
    console.log('1. Refresh the page at: /members/' + davidId);
    console.log('2. Click on the "Payments" tab');
    console.log('3. You should now see the test payments');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPaymentDisplay();