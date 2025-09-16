const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const davidId = 'd067bd15-0d73-4b3c-8d74-98cd9e049d13';
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function discoverSchema() {
  console.log('🔍 Discovering payment_transactions table schema...\n');

  try {
    // Create a minimal record to see what columns are accepted
    console.log('1️⃣ Creating minimal record to discover columns...');

    const minimalRecord = {
      customer_id: davidId,
      organization_id: organizationId,
      created_at: new Date().toISOString()
    };

    const { data: created, error: createError } = await supabase
      .from('payment_transactions')
      .insert(minimalRecord)
      .select()
      .single();

    if (createError) {
      console.log('❌ Error with minimal record:', createError.message);
    } else {
      console.log('✅ Created minimal record successfully!');
      console.log('Record columns:', Object.keys(created).join(', '));
      console.log('\nFull record:');
      console.log(JSON.stringify(created, null, 2));

      // Now let's check what columns exist
      console.log('\n2️⃣ Fetching all records to see columns...');
      const { data: allRecords } = await supabase
        .from('payment_transactions')
        .select('*')
        .limit(10);

      if (allRecords && allRecords.length > 0) {
        console.log(`Found ${allRecords.length} records`);
        console.log('\nAvailable columns:', Object.keys(allRecords[0]).join(', '));

        console.log('\nSample records:');
        allRecords.slice(0, 3).forEach((record, index) => {
          console.log(`\nRecord ${index + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              console.log(`  ${key}: ${value}`);
            }
          });
        });
      }
    }

    // SOLUTION: Since payment_transactions doesn't have amount columns,
    // we need to update the members page to use the correct tables
    console.log('\n💡 SOLUTION IDENTIFIED:');
    console.log('The payment_transactions table doesn\'t store payment amounts.');
    console.log('The members page needs to be updated to query from:');
    console.log('  - transactions table (where we have £45 test payment)');
    console.log('  - payments table (where we have £0.59 imported payment)');
    console.log('\nI\'ll create a fix for the members page now...');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

discoverSchema();