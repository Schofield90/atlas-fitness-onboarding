const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function checkConstraints() {
  console.log('🔍 Checking customer_memberships table constraints...\n');

  try {
    // 1. Try to get a sample record to see structure
    console.log('1. Checking existing customer_memberships records:');
    const { data: existing, error: existingError } = await supabase
      .from('customer_memberships')
      .select('*')
      .limit(1)
      .single();

    if (existing) {
      console.log('Sample record columns:', Object.keys(existing));
      console.log('Sample data:', JSON.stringify(existing, null, 2));
    } else if (existingError) {
      console.log('No existing records or error:', existingError.message);
    }

    // 2. Try different status values to see what's allowed
    console.log('\n2. Testing status field constraints:');
    const testStatuses = ['active', 'pending', 'cancelled', 'expired', 'paused'];
    
    // Get a sample client and membership plan
    const { data: sampleClient } = await supabase
      .from('clients')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1)
      .single();

    const { data: samplePlan } = await supabase
      .from('membership_plans')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1)
      .single();

    if (sampleClient && samplePlan) {
      for (const status of testStatuses) {
        const testData = {
          organization_id: organizationId,
          customer_id: sampleClient.id,
          membership_plan_id: samplePlan.id,
          status: status,
          start_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('customer_memberships')
          .insert(testData);

        if (error) {
          console.log(`  ✗ Status '${status}': ${error.message.substring(0, 100)}`);
        } else {
          console.log(`  ✓ Status '${status}': Valid`);
          
          // Clean up test record
          await supabase
            .from('customer_memberships')
            .delete()
            .eq('customer_id', sampleClient.id)
            .eq('membership_plan_id', samplePlan.id)
            .eq('status', status);
        }
      }
    }

    // 3. Try with minimal fields to see what's required
    console.log('\n3. Testing required fields:');
    if (sampleClient && samplePlan) {
      const minimalData = {
        customer_id: sampleClient.id,
        membership_plan_id: samplePlan.id,
        status: 'active'
      };

      const { error: minimalError } = await supabase
        .from('customer_memberships')
        .insert(minimalData);

      if (minimalError) {
        console.log('Minimal insert failed:', minimalError.message);
        console.log('\nTrying with organization_id...');
        
        const withOrgData = {
          ...minimalData,
          organization_id: organizationId
        };

        const { error: orgError } = await supabase
          .from('customer_memberships')
          .insert(withOrgData);

        if (orgError) {
          console.log('With org_id failed:', orgError.message);
        } else {
          console.log('✓ Minimal insert with organization_id succeeded');
          
          // Clean up
          await supabase
            .from('customer_memberships')
            .delete()
            .eq('customer_id', sampleClient.id)
            .eq('membership_plan_id', samplePlan.id);
        }
      } else {
        console.log('✓ Minimal insert succeeded without organization_id');
        
        // Clean up
        await supabase
          .from('customer_memberships')
          .delete()
          .eq('customer_id', sampleClient.id)
          .eq('membership_plan_id', samplePlan.id);
      }
    }

    // 4. Check if both client_id and customer_id are needed
    console.log('\n4. Testing client_id vs customer_id:');
    if (sampleClient && samplePlan) {
      const withBothIds = {
        organization_id: organizationId,
        customer_id: sampleClient.id,
        client_id: sampleClient.id,
        membership_plan_id: samplePlan.id,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0]
      };

      const { error: bothError } = await supabase
        .from('customer_memberships')
        .insert(withBothIds);

      if (bothError) {
        console.log('With both IDs failed:', bothError.message);
      } else {
        console.log('✓ Insert with both client_id and customer_id succeeded');
        
        // Clean up
        await supabase
          .from('customer_memberships')
          .delete()
          .eq('customer_id', sampleClient.id)
          .eq('membership_plan_id', samplePlan.id);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkConstraints();