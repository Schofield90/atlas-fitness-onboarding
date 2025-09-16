const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const davidId = 'd067bd15-0d73-4b3c-8d74-98cd9e049d13';
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function createPaymentTransaction() {
  console.log('💳 Creating payment transaction for David Wrightson...\n');

  try {
    // First, let's see what columns payment_transactions actually has
    console.log('1️⃣ Checking payment_transactions structure with organization_id...');

    const testPayment = {
      customer_id: davidId,
      organization_id: organizationId,
      total_amount: 9500, // Try with total_amount
      created_at: new Date().toISOString()
    };

    console.log('Attempting to create with:', testPayment);

    const { data: payment1, error: error1 } = await supabase
      .from('payment_transactions')
      .insert(testPayment)
      .select()
      .single();

    if (error1) {
      console.log('❌ Error with total_amount:', error1.message);

      // Try with different column names
      console.log('\n2️⃣ Trying with amount column...');
      const testPayment2 = {
        customer_id: davidId,
        organization_id: organizationId,
        amount: 9500,
        created_at: new Date().toISOString()
      };

      const { data: payment2, error: error2 } = await supabase
        .from('payment_transactions')
        .insert(testPayment2)
        .select()
        .single();

      if (error2) {
        console.log('❌ Error with amount:', error2.message);

        // Try with transaction_amount
        console.log('\n3️⃣ Trying with transaction_amount column...');
        const testPayment3 = {
          customer_id: davidId,
          organization_id: organizationId,
          transaction_amount: 9500,
          created_at: new Date().toISOString()
        };

        const { data: payment3, error: error3 } = await supabase
          .from('payment_transactions')
          .insert(testPayment3)
          .select()
          .single();

        if (error3) {
          console.log('❌ Error with transaction_amount:', error3.message);
        } else {
          console.log('✅ Created with transaction_amount!');
          console.log('Payment record:', payment3);
        }
      } else {
        console.log('✅ Created with amount!');
        console.log('Payment record:', payment2);
      }
    } else {
      console.log('✅ Created with total_amount!');
      console.log('Payment record:', payment1);
    }

    // Check what was created
    console.log('\n4️⃣ Checking all payment_transactions for David...');
    const { data: allPayments, error: fetchError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('customer_id', davidId)
      .order('created_at', { ascending: false });

    if (!fetchError && allPayments) {
      console.log(`Found ${allPayments.length} payment transactions`);
      if (allPayments.length > 0) {
        console.log('\nColumns in payment_transactions:', Object.keys(allPayments[0]).join(', '));
        console.log('\nPayments:');
        allPayments.forEach(p => {
          const amount = p.total_amount || p.amount || p.transaction_amount || 0;
          console.log(`  - £${(amount/100).toFixed(2)} on ${new Date(p.created_at).toLocaleDateString()}`);
        });
      }
    }

    console.log('\n✅ Payment transaction created!');
    console.log('\n📍 To see the payment:');
    console.log('1. Go to: /members/' + davidId);
    console.log('2. Click on the "Payments" tab');
    console.log('3. The payment should now be visible');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createPaymentTransaction();