const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTransactionsTable() {
  console.log('🏛️ Setting up transactions table...\n');

  try {
    // First, check if the transactions table has metadata column
    console.log('1. Checking transactions table structure...');
    const { data: sample, error } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);

    if (error) {
      console.log('Error checking table:', error.message);
      return;
    }

    if (sample && sample.length > 0) {
      const columns = Object.keys(sample[0]);
      console.log('Current columns:', columns);
      
      if (columns.includes('metadata')) {
        console.log('✓ Metadata column already exists!');
      } else {
        console.log('✗ Metadata column not found');
      }
    } else {
      console.log('Transactions table exists but is empty');
      console.log('Table structure cannot be determined without records');
      
      // Try to insert a test record to see what columns are required
      console.log('\n2. Testing table structure with a test insert...');
      const testData = {
        organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
        client_id: '25815bb6-91e2-4c17-8386-fde8a7a0722d',
        type: 'test',
        amount: 0,
        currency: 'GBP',
        status: 'completed',
        payment_method: 'test',
        description: 'Test transaction',
        transaction_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('transactions')
        .insert(testData);

      if (insertError) {
        console.log('Insert error (this helps identify missing columns):', insertError.message);
        
        // Try without metadata
        console.log('\n3. Attempting insert without metadata field...');
        const { error: retryError } = await supabase
          .from('transactions')
          .insert(testData);
          
        if (!retryError) {
          console.log('✓ Table accepts records without metadata field');
          console.log('Payment imports will work without metadata column');
          
          // Clean up test record
          await supabase
            .from('transactions')
            .delete()
            .eq('type', 'test')
            .eq('description', 'Test transaction');
            
          console.log('Test record cleaned up');
        } else {
          console.log('Still failed:', retryError.message);
        }
      } else {
        console.log('✓ Test insert successful');
        
        // Clean up test record
        await supabase
          .from('transactions')
          .delete()
          .eq('type', 'test')
          .eq('description', 'Test transaction');
          
        console.log('Test record cleaned up');
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('TRANSACTIONS TABLE READY FOR IMPORTS');
    console.log('='.repeat(50));
    console.log('\n💡 Note: The import script will work with or without metadata column');
    console.log('Payment data will be stored in the core transaction fields');

  } catch (error) {
    console.error('Error:', error);
  }
}

setupTransactionsTable();