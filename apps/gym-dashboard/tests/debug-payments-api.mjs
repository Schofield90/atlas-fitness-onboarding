/**
 * Direct API test to debug GoCardless payments issue
 *
 * This script calls the payments API endpoint directly using admin client
 * to see what data is being returned for Rich Young's profile.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Try multiple env files
dotenv.config({ path: resolve(__dirname, '../../../.env.local') });
dotenv.config({ path: resolve(__dirname, '../../../.env.development.local') });
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CUSTOMER_ID = '88aa70f1-13b8-4e6d-bac8-d81775abdf3c'; // Rich Young

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'Found' : 'Missing');
  console.error('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'Found' : 'Missing');
  console.error('\nPlease ensure .env.local exists with:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=your_url');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

console.log('🔍 Debugging Payments Issue for Rich Young\n');
console.log('Customer ID:', CUSTOMER_ID);
console.log('Expected: 4 x £110 GoCardless + 1 x £1 Stripe');
console.log('─'.repeat(60), '\n');

async function debugPayments() {
  // Create admin client (bypasses RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('📊 Querying payment_transactions table...');
  const { data: paymentTransactions, error: ptError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('customer_id', CUSTOMER_ID)
    .order('created_at', { ascending: false });

  if (ptError) {
    console.error('❌ Payment transactions error:', ptError);
  } else {
    console.log(`✅ Found ${paymentTransactions?.length || 0} payment_transactions\n`);
  }

  console.log('📊 Querying payments table (imported payments)...');
  const { data: importedPayments, error: ipError } = await supabase
    .from('payments')
    .select('*')
    .eq('client_id', CUSTOMER_ID)
    .order('payment_date', { ascending: false });

  if (ipError) {
    console.error('❌ Imported payments error:', ipError);
  } else {
    console.log(`✅ Found ${importedPayments?.length || 0} imported payments\n`);
  }

  console.log('📊 Querying transactions table...');
  const { data: transactions, error: tError } = await supabase
    .from('transactions')
    .select('*')
    .eq('client_id', CUSTOMER_ID)
    .eq('type', 'payment')
    .order('created_at', { ascending: false });

  if (tError) {
    console.error('❌ Transactions error:', tError);
  } else {
    console.log(`✅ Found ${transactions?.length || 0} transactions\n`);
  }

  // Analyze imported payments
  if (importedPayments && importedPayments.length > 0) {
    console.log('═'.repeat(60));
    console.log('📋 IMPORTED PAYMENTS ANALYSIS');
    console.log('═'.repeat(60), '\n');

    const stripePayments = importedPayments.filter(p => p.payment_provider === 'stripe');
    const gocardlessPayments = importedPayments.filter(p => p.payment_provider === 'gocardless');

    console.log(`Stripe Payments: ${stripePayments.length}`);
    console.log(`GoCardless Payments: ${gocardlessPayments.length}\n`);

    if (stripePayments.length > 0) {
      console.log('💳 STRIPE PAYMENTS:');
      stripePayments.forEach((p, i) => {
        console.log(`  ${i + 1}. £${(p.amount / 100).toFixed(2)} | ${p.payment_date} | ${p.payment_status}`);
        console.log(`     Provider ID: ${p.provider_payment_id}`);
        console.log(`     Client ID: ${p.client_id}\n`);
      });
    }

    if (gocardlessPayments.length > 0) {
      console.log('🏦 GOCARDLESS PAYMENTS:');
      gocardlessPayments.forEach((p, i) => {
        console.log(`  ${i + 1}. £${(p.amount / 100).toFixed(2)} | ${p.payment_date} | ${p.payment_status}`);
        console.log(`     Provider ID: ${p.provider_payment_id}`);
        console.log(`     Client ID: ${p.client_id}\n`);
      });
    } else {
      console.log('❌ NO GOCARDLESS PAYMENTS FOUND\n');
      console.log('🔍 Possible causes:');
      console.log('   1. GoCardless payments not imported');
      console.log('   2. GoCardless payments have wrong client_id');
      console.log('   3. GoCardless payments filtered by different query\n');
    }
  } else {
    console.log('⚠️  NO IMPORTED PAYMENTS FOUND AT ALL\n');
  }

  // Now check if GoCardless payments exist for ANY client_id
  console.log('═'.repeat(60));
  console.log('🔍 CHECKING ALL GOCARDLESS PAYMENTS IN DATABASE');
  console.log('═'.repeat(60), '\n');

  const { data: allGCPayments, error: gcError } = await supabase
    .from('payments')
    .select('*')
    .eq('payment_provider', 'gocardless')
    .order('payment_date', { ascending: false })
    .limit(10);

  if (gcError) {
    console.error('❌ Error querying GoCardless payments:', gcError);
  } else {
    console.log(`Found ${allGCPayments?.length || 0} GoCardless payments (showing first 10):\n`);
    if (allGCPayments && allGCPayments.length > 0) {
      allGCPayments.forEach((p, i) => {
        console.log(`  ${i + 1}. £${(p.amount / 100).toFixed(2)} | ${p.payment_date}`);
        console.log(`     Client ID: ${p.client_id || 'NULL ⚠️'}`);
        console.log(`     Provider ID: ${p.provider_payment_id}\n`);
      });

      // Check if any have NULL client_id
      const nullClientPayments = allGCPayments.filter(p => !p.client_id);
      if (nullClientPayments.length > 0) {
        console.log(`⚠️  ${nullClientPayments.length} payments have NULL client_id!`);
        console.log('This means payments were imported but not linked to clients.\n');
      }
    }
  }

  // Check the customer/client record
  console.log('═'.repeat(60));
  console.log('👤 CUSTOMER RECORD');
  console.log('═'.repeat(60), '\n');

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email')
    .eq('id', CUSTOMER_ID)
    .single();

  if (clientError) {
    console.error('❌ Error fetching client:', clientError);
  } else {
    console.log('Customer:', client?.first_name, client?.last_name);
    console.log('Email:', client?.email);
    console.log('ID:', client?.id, '\n');
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('📝 SUMMARY');
  console.log('═'.repeat(60), '\n');

  const totalPayments = (importedPayments?.length || 0) +
                        (paymentTransactions?.length || 0) +
                        (transactions?.length || 0);

  console.log(`Total payments for Rich Young: ${totalPayments}`);
  console.log(`  - Payment Transactions: ${paymentTransactions?.length || 0}`);
  console.log(`  - Imported Payments: ${importedPayments?.length || 0}`);
  console.log(`  - Transactions: ${transactions?.length || 0}\n`);

  if (importedPayments && importedPayments.length > 0) {
    const stripe = importedPayments.filter(p => p.payment_provider === 'stripe').length;
    const gocardless = importedPayments.filter(p => p.payment_provider === 'gocardless').length;

    console.log(`Breakdown of imported payments:`);
    console.log(`  - Stripe: ${stripe}`);
    console.log(`  - GoCardless: ${gocardless}\n`);

    if (gocardless === 0 && allGCPayments && allGCPayments.length > 0) {
      console.log('🎯 ROOT CAUSE IDENTIFIED:');
      console.log('   GoCardless payments exist in database BUT not linked to this customer.');
      console.log('   Check client_id mapping in payments table.\n');
    } else if (gocardless === 0) {
      console.log('🎯 ROOT CAUSE IDENTIFIED:');
      console.log('   No GoCardless payments in database at all.');
      console.log('   Import may have failed or not been run.\n');
    }
  }
}

debugPayments().catch(console.error);
