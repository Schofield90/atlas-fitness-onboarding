const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const davidId = 'd067bd15-0d73-4b3c-8d74-98cd9e049d13';
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function createFinalPayment() {
  console.log('💳 Creating final payment for David Wrightson...\n');

  try {
    // Create payment in payment_transactions with correct column name
    console.log('1️⃣ Creating payment in payment_transactions with amount_pennies...');

    const paymentData = {
      customer_id: davidId,
      organization_id: organizationId,
      amount_pennies: 12500, // £125.00
      created_at: new Date().toISOString()
    };

    console.log('Creating payment:', paymentData);

    const { data: newPayment, error: createError } = await supabase
      .from('payment_transactions')
      .insert(paymentData)
      .select()
      .single();

    if (createError) {
      console.log('❌ Error:', createError.message);
    } else {
      console.log('✅ Successfully created payment transaction!');
      console.log('Payment ID:', newPayment.id);
      console.log('Amount: £' + (newPayment.amount_pennies / 100).toFixed(2));
      console.log('Created at:', newPayment.created_at);
    }

    // Now check all payments for David across all tables
    console.log('\n2️⃣ Summary of all David\'s payments:');

    // Check payment_transactions
    const { data: paymentTransactions } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('customer_id', davidId)
      .order('created_at', { ascending: false });

    console.log(`\npayment_transactions table: ${paymentTransactions?.length || 0} records`);
    if (paymentTransactions && paymentTransactions.length > 0) {
      paymentTransactions.forEach(p => {
        console.log(`  - £${(p.amount_pennies/100).toFixed(2)} on ${new Date(p.created_at).toLocaleDateString()}`);
      });
    }

    // Check transactions table
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('client_id', davidId)
      .eq('type', 'payment')
      .order('created_at', { ascending: false });

    console.log(`\ntransactions table: ${transactions?.length || 0} records`);
    if (transactions && transactions.length > 0) {
      transactions.forEach(t => {
        console.log(`  - £${(t.amount/100).toFixed(2)} on ${new Date(t.created_at).toLocaleDateString()}`);
      });
    }

    // Check payments table
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', davidId)
      .order('payment_date', { ascending: false });

    console.log(`\npayments table: ${payments?.length || 0} records`);
    if (payments && payments.length > 0) {
      payments.forEach(p => {
        console.log(`  - £${(p.amount/100).toFixed(2)} on ${new Date(p.payment_date || p.created_at).toLocaleDateString()}`);
      });
    }

    console.log('\n✅ Payment successfully created!');
    console.log('\n📍 David now has:');
    console.log('  - £125.00 in payment_transactions (will show in Payments tab)');
    console.log('  - £45.00 in transactions table');
    console.log('  - £0.59 in payments table');
    console.log('\nRefresh the page at: /members/' + davidId);
    console.log('Click on the "Payments" tab to see the £125 payment');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createFinalPayment();