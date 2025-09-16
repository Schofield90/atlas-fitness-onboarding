const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function checkPaymentSchema() {
  console.log('🔍 Checking payment and transaction tables...\n');

  try {
    // 1. Check for payment-related tables
    console.log('1. Looking for payment tables:');
    const paymentTables = [
      'payments',
      'transactions',
      'payment_history',
      'client_payments',
      'customer_payments',
      'payment_records',
      'invoices',
      'billing_history'
    ];

    const existingTables = [];
    
    for (const table of paymentTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (!error) {
        existingTables.push(table);
        console.log(`  ✓ ${table} exists`);
        if (data && data.length > 0) {
          console.log(`    Columns: ${Object.keys(data[0]).slice(0, 8).join(', ')}...`);
        }
      }
    }

    // 2. Check payments table in detail if it exists
    if (existingTables.includes('payments')) {
      console.log('\n2. Payments table structure:');
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .limit(1)
        .single();

      if (payment) {
        console.log('All columns:', Object.keys(payment));
        console.log('\nSample payment data:');
        console.log(JSON.stringify(payment, null, 2));
      }
    }

    // 3. Check transactions table if it exists
    if (existingTables.includes('transactions')) {
      console.log('\n3. Transactions table structure:');
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .limit(1)
        .single();

      if (transaction) {
        console.log('All columns:', Object.keys(transaction));
        console.log('\nSample transaction data:');
        console.log(JSON.stringify(transaction, null, 2));
      }
    }

    // 4. Check if clients table has payment-related fields
    console.log('\n4. Client payment fields:');
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(1)
      .single();

    if (client) {
      const paymentFields = Object.keys(client).filter(key => 
        key.includes('payment') || 
        key.includes('balance') || 
        key.includes('amount') ||
        key.includes('invoice') ||
        key.includes('billing')
      );
      
      if (paymentFields.length > 0) {
        console.log('Payment-related fields in clients table:');
        paymentFields.forEach(field => {
          console.log(`  - ${field}: ${client[field]}`);
        });
      } else {
        console.log('No payment-related fields found in clients table');
      }
    }

    // 5. Check membership payments
    console.log('\n5. Checking customer_memberships for payment data:');
    const { data: membership } = await supabase
      .from('customer_memberships')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(1)
      .single();

    if (membership) {
      const paymentFields = Object.keys(membership).filter(key => 
        key.includes('payment') || 
        key.includes('stripe') || 
        key.includes('billing') ||
        key.includes('price')
      );
      
      if (paymentFields.length > 0) {
        console.log('Payment-related fields in customer_memberships:');
        paymentFields.forEach(field => {
          console.log(`  - ${field}: ${membership[field]}`);
        });
      }
    }

    // 6. Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    if (existingTables.length > 0) {
      console.log('Found payment tables:', existingTables.join(', '));
    } else {
      console.log('No dedicated payment tables found.');
      console.log('We may need to create a payments table for importing payment data.');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkPaymentSchema();