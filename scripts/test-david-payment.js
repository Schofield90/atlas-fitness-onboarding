const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestPayment() {
  console.log('🔍 Finding David Wrightson in the database...\n');

  try {
    // Find David Wrightson
    const { data: clients, error: searchError } = await supabase
      .from('clients')
      .select('id, name, email, organization_id, lead_id')
      .ilike('name', '%david%wrightson%');

    if (searchError) {
      console.error('Error searching for David:', searchError);
      return;
    }

    if (!clients || clients.length === 0) {
      console.log('❌ David Wrightson not found in clients table');

      // Try to find in leads table
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, email, client_id')
        .ilike('name', '%david%wrightson%');

      if (leads && leads.length > 0) {
        console.log('Found in leads table:', leads);
      }
      return;
    }

    const david = clients[0];
    console.log('✅ Found David Wrightson:');
    console.log('  ID:', david.id);
    console.log('  Name:', david.name);
    console.log('  Email:', david.email);
    console.log('  Organization:', david.organization_id);
    console.log('  Lead ID:', david.lead_id);

    // Check existing payments for David
    console.log('\n📊 Checking existing payments...');

    // Check transactions table
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('client_id', david.id)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`Found ${existingTransactions?.length || 0} transactions in transactions table`);
    if (existingTransactions && existingTransactions.length > 0) {
      console.log('Latest transaction:', {
        amount: existingTransactions[0].amount,
        type: existingTransactions[0].type,
        created_at: existingTransactions[0].created_at
      });
    }

    // Check payments table
    const { data: existingPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', david.id)
      .order('payment_date', { ascending: false })
      .limit(5);

    console.log(`Found ${existingPayments?.length || 0} payments in payments table`);
    if (existingPayments && existingPayments.length > 0) {
      console.log('Latest payment:', {
        amount: existingPayments[0].amount,
        payment_date: existingPayments[0].payment_date,
        status: existingPayments[0].payment_status
      });
    }

    // Create a test payment in transactions table
    console.log('\n💳 Creating test payment in transactions table...');

    const testPayment = {
      client_id: david.id,
      type: 'payment',
      amount: 4500, // £45.00 in pennies
      created_at: new Date().toISOString()
    };

    const { data: newTransaction, error: transactionError } = await supabase
      .from('transactions')
      .insert(testPayment)
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
    } else {
      console.log('✅ Created test transaction:', {
        id: newTransaction.id,
        amount: newTransaction.amount,
        created_at: newTransaction.created_at
      });
    }

    // Also create in payments table for testing
    console.log('\n💳 Creating test payment in payments table...');

    const testPayment2 = {
      client_id: david.id,
      amount: 5500, // £55.00 in pennies
      payment_date: new Date().toISOString(),
      payment_method: 'Test Payment',
      payment_status: 'completed',
      description: 'Test payment for David Wrightson',
      currency: 'GBP',
      organization_id: david.organization_id
    };

    const { data: newPayment, error: paymentError } = await supabase
      .from('payments')
      .insert(testPayment2)
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
    } else {
      console.log('✅ Created test payment:', {
        id: newPayment.id,
        amount: newPayment.amount,
        payment_date: newPayment.payment_date
      });
    }

    // Check if David has a linked lead
    if (david.lead_id) {
      console.log('\n🔗 David has a linked lead_id:', david.lead_id);

      // Check if the lead has client_id pointing back
      const { data: lead } = await supabase
        .from('leads')
        .select('id, client_id')
        .eq('id', david.lead_id)
        .single();

      if (lead) {
        console.log('Lead client_id:', lead.client_id);
        if (lead.client_id !== david.id) {
          console.log('⚠️  Lead client_id does not match David\'s ID - this could cause issues');
        }
      }
    }

    console.log('\n✅ Test payments created successfully!');
    console.log('Check the UI at: /members/' + david.id);
    console.log('Or if using lead ID: /leads/' + david.lead_id);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestPayment();