const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('📋 Checking membership tables schema...\n');

  try {
    // 1. Check membership_plans schema
    console.log('1. membership_plans table:');
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .limit(1)
      .single();

    if (planError) {
      console.log('Error:', planError.message);
    } else {
      console.log('Columns:', Object.keys(plan || {}));
      console.log('\nSample data:');
      console.log(JSON.stringify(plan, null, 2));
    }

    // 2. Check memberships table schema
    console.log('\n2. memberships table:');
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('*')
      .limit(1)
      .single();

    if (membershipError) {
      console.log('Error:', membershipError.message);
    } else {
      console.log('Columns:', Object.keys(membership || {}));
      console.log('\nSample data:');
      console.log(JSON.stringify(membership, null, 2));
    }

    // 3. Check customer_memberships table (alternative name)
    console.log('\n3. customer_memberships table:');
    const { data: custMembership, error: custError } = await supabase
      .from('customer_memberships')
      .select('*')
      .limit(1)
      .single();

    if (custError) {
      console.log('Error:', custError.message);
    } else {
      console.log('Columns:', Object.keys(custMembership || {}));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema();