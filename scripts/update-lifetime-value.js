const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateLifetimeValue() {
  const davidId = 'd067bd15-0d73-4b3c-8d74-98cd9e049d13';

  console.log('Checking lifetime value update issue...\n');

  // 1. Check what table the customer data is in
  const { data: customer1 } = await supabase
    .from('customers')
    .select('id, lifetime_value')
    .eq('id', davidId)
    .single();

  const { data: customer2 } = await supabase
    .from('clients')
    .select('id, lifetime_value')
    .eq('id', davidId)
    .single();

  console.log('customers table:', customer1 ? `Found (lifetime_value: ${customer1.lifetime_value})` : 'Not found');
  console.log('clients table:', customer2 ? `Found (lifetime_value: ${customer2.lifetime_value || 'null'})` : 'Not found');

  // Check if lifetime_value column exists in clients table
  if (customer2 && customer2.lifetime_value === undefined) {
    console.log('\n⚠️  clients table does not have lifetime_value column');
    console.log('The UI is likely reading from clients table but lifetime_value is not stored there');
  }

  // Update the correct table
  if (customer2) {
    console.log('\nUpdating lifetime_value in clients table...');
    const { error } = await supabase
      .from('clients')
      .update({ lifetime_value: 5900 })
      .eq('id', davidId);

    if (!error) {
      console.log('✅ Updated lifetime_value to £59.00 in clients table');
    } else {
      console.log('Error updating clients:', error.message);

      // If column doesn't exist, we might need to add it
      if (error.message.includes('column') || error.message.includes('lifetime_value')) {
        console.log('\n❌ The clients table does not have a lifetime_value column');
        console.log('This needs to be added to the database schema');
      }
    }
  }

  if (customer1) {
    console.log('\nAlso updating customers table...');
    const { error } = await supabase
      .from('customers')
      .update({ lifetime_value: 5900 })
      .eq('id', davidId);

    if (!error) {
      console.log('✅ Updated lifetime_value to £59.00 in customers table');
    } else {
      console.log('Error updating customers:', error.message);
    }
  }

  // Check where the UI is actually reading from
  console.log('\n📍 The members page is likely reading from the "customers" table');
  console.log('Let me check if David exists there...');

  const { data: checkCustomers } = await supabase
    .from('customers')
    .select('*')
    .ilike('email', '%dave.wrightson%');

  if (checkCustomers && checkCustomers.length > 0) {
    console.log('Found in customers table:', checkCustomers[0].id);
  } else {
    console.log('Not found in customers table by email');
  }
}

updateLifetimeValue();