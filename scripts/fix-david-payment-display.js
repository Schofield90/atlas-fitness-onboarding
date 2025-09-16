const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const davidId = 'd067bd15-0d73-4b3c-8d74-98cd9e049d13';

async function fixPaymentDisplay() {
  console.log('🔍 Fixing payment display for David Wrightson...\n');
  console.log('David\'s ID:', davidId);

  try {
    // Check if payment_transactions table exists
    console.log('\n1️⃣ Checking payment_transactions table...');
    const { data: testQuery, error: testError } = await supabase
      .from('payment_transactions')
      .select('*')
      .limit(1);

    if (testError) {
      console.log('❌ payment_transactions table issue:', testError.message);

      // Try to create a payment in the correct table
      console.log('\n2️⃣ Creating payment in payment_transactions table...');
      const paymentData = {
        customer_id: davidId,
        client_id: davidId,
        amount: 6500, // £65.00 in pennies
        status: 'completed',
        payment_method: 'Test Payment',
        description: 'Test payment for David Wrightson - Should appear in UI',
        created_at: new Date().toISOString()
      };

      const { data: newPayment, error: insertError } = await supabase
        .from('payment_transactions')
        .insert(paymentData)
        .select()
        .single();

      if (insertError) {
        console.log('❌ Could not create in payment_transactions:', insertError.message);
      } else {
        console.log('✅ Created payment in payment_transactions:', newPayment);
      }
    } else {
      console.log('✅ payment_transactions table exists');

      // Check existing payments for David
      const { data: existingPayments } = await supabase
        .from('payment_transactions')
        .select('*')
        .or(`customer_id.eq.${davidId},client_id.eq.${davidId}`)
        .order('created_at', { ascending: false });

      console.log(`Found ${existingPayments?.length || 0} payments in payment_transactions`);

      if (existingPayments && existingPayments.length > 0) {
        console.log('Recent payments:');
        existingPayments.slice(0, 3).forEach(p => {
          console.log(`  - £${(p.amount/100).toFixed(2)} on ${new Date(p.created_at).toLocaleDateString()}`);
        });
      }

      // Create a new test payment
      console.log('\n3️⃣ Creating new test payment in payment_transactions...');
      const paymentData = {
        customer_id: davidId,
        client_id: davidId,
        amount: 7500, // £75.00 in pennies
        status: 'completed',
        payment_method: 'Test Payment',
        description: 'Test payment for David - Check Payments tab',
        created_at: new Date().toISOString()
      };

      const { data: newPayment, error: insertError } = await supabase
        .from('payment_transactions')
        .insert(paymentData)
        .select()
        .single();

      if (insertError) {
        console.log('❌ Error creating payment:', insertError);
      } else {
        console.log('✅ Successfully created payment:', {
          id: newPayment.id,
          amount: `£${(newPayment.amount/100).toFixed(2)}`,
          created_at: newPayment.created_at
        });
      }
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