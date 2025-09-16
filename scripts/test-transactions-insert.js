const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTransactionInsert() {
  console.log('🧪 Testing minimal transaction insert...\n');

  try {
    // Start with absolute minimum fields
    console.log('1. Testing with minimal fields...');
    let testData = {
      client_id: '25815bb6-91e2-4c17-8386-fde8a7a0722d',
      amount: 5000, // 50.00 in pennies
      created_at: new Date().toISOString()
    };

    let { error } = await supabase
      .from('transactions')
      .insert(testData);

    if (error) {
      console.log('Minimal insert failed:', error.message);
      
      // Try adding more fields
      console.log('\n2. Adding type field...');
      testData.type = 'payment';
      
      ({ error } = await supabase
        .from('transactions')
        .insert(testData));
        
      if (error) {
        console.log('With type failed:', error.message);
        
        // Try adding status
        console.log('\n3. Adding status field...');
        testData.status = 'completed';
        
        ({ error } = await supabase
          .from('transactions')
          .insert(testData));
          
        if (error) {
          console.log('With status failed:', error.message);
          
          // Try adding currency
          console.log('\n4. Adding currency field...');
          testData.currency = 'GBP';
          
          ({ error } = await supabase
            .from('transactions')
            .insert(testData));
            
          if (error) {
            console.log('With currency failed:', error.message);
            
            // Try adding description
            console.log('\n5. Adding description field...');
            testData.description = 'Test payment';
            
            ({ error } = await supabase
              .from('transactions')
              .insert(testData));
              
            if (error) {
              console.log('With description failed:', error.message);
              
              // Try with different minimal fields
              console.log('\n6. Trying completely different approach...');
              const alternativeData = {
                amount: 5000,
                type: 'payment',
                status: 'completed'
              };
              
              ({ error } = await supabase
                .from('transactions')
                .insert(alternativeData));
                
              if (error) {
                console.log('Alternative approach failed:', error.message);
              } else {
                console.log('✓ Alternative approach succeeded!');
                console.log('Required fields: amount, type, status');
                
                // Clean up
                await supabase
                  .from('transactions')
                  .delete()
                  .eq('amount', 5000)
                  .eq('type', 'payment');
              }
            } else {
              console.log('✓ Insert succeeded with description!');
              console.log('Working fields:', Object.keys(testData));
              
              // Clean up
              await supabase
                .from('transactions')
                .delete()
                .eq('client_id', testData.client_id)
                .eq('amount', testData.amount);
            }
          } else {
            console.log('✓ Insert succeeded with currency!');
            console.log('Working fields:', Object.keys(testData));
            
            // Clean up
            await supabase
              .from('transactions')
              .delete()
              .eq('client_id', testData.client_id)
              .eq('amount', testData.amount);
          }
        } else {
          console.log('✓ Insert succeeded with status!');
          console.log('Working fields:', Object.keys(testData));
          
          // Clean up
          await supabase
            .from('transactions')
            .delete()
            .eq('client_id', testData.client_id)
            .eq('amount', testData.amount);
        }
      } else {
        console.log('✓ Insert succeeded with type!');
        console.log('Working fields:', Object.keys(testData));
        
        // Clean up
        await supabase
          .from('transactions')
          .delete()
          .eq('client_id', testData.client_id)
          .eq('amount', testData.amount);
      }
    } else {
      console.log('✓ Minimal insert succeeded!');
      console.log('Working fields:', Object.keys(testData));
      
      // Clean up
      await supabase
        .from('transactions')
        .delete()
        .eq('client_id', testData.client_id)
        .eq('amount', testData.amount);
    }

    // Now test what fields we can read
    console.log('\n7. Checking readable fields...');
    const { data: readTest } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);
      
    if (readTest && readTest.length > 0) {
      console.log('Readable columns:', Object.keys(readTest[0]));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testTransactionInsert();