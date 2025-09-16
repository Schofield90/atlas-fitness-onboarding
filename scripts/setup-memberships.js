const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function setupMemberships() {
  console.log('📋 Setting up membership plans and linking clients...\n');

  try {
    // 1. Check existing membership plans
    console.log('1. Checking existing membership plans...');
    const { data: existingPlans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', organizationId);

    if (plansError) {
      console.log('Note: membership_plans table might not exist or have different structure');
      console.log('Error:', plansError.message);
    } else {
      console.log(`Found ${existingPlans?.length || 0} existing plans`);
      existingPlans?.forEach(plan => {
        console.log(`  - ${plan.name}: £${plan.price}`);
      });
    }

    // 2. Get all unique membership types from imported clients
    console.log('\n2. Analyzing imported membership types...');
    const { data: clients } = await supabase
      .from('clients')
      .select('name, metadata')
      .eq('organization_id', organizationId)
      .eq('source', 'migration')
      .not('metadata->active_membership', 'is', null);

    const membershipTypes = new Map();

    clients?.forEach(client => {
      const membership = client.metadata?.active_membership;
      if (membership) {
        membershipTypes.set(membership, (membershipTypes.get(membership) || 0) + 1);
      }
    });

    console.log('\nUnique membership types found:');
    const sortedMemberships = Array.from(membershipTypes.entries()).sort((a, b) => b[1] - a[1]);
    sortedMemberships.forEach(([type, count]) => {
      console.log(`  ${type}: ${count} members`);
    });

    // 3. Create membership plans for the most common types
    console.log('\n3. Creating membership plans...');
    const plansToCreate = [
      { name: 'Full Member (York)', price: 50, billing_period: 'monthly', description: 'Full access to York facility' },
      { name: 'Full Member', price: 50, billing_period: 'monthly', description: 'Full membership access' },
      { name: '12 Month Programme', price: 45, billing_period: 'monthly', description: '12 month commitment' },
      { name: 'Life time membership', price: 0, billing_period: 'lifetime', description: 'Lifetime access' },
      { name: 'Month To Month Programme', price: 55, billing_period: 'monthly', description: 'No contract, monthly rolling' },
      { name: '6 Week Transformation Programme', price: 199, billing_period: 'one_time', description: '6 week transformation program' },
      { name: '28 Day Transformation Programme', price: 149, billing_period: 'one_time', description: '28 day transformation program' },
      { name: 'Block of 10 Sessions', price: 350, billing_period: 'one_time', description: '10 personal training sessions' },
      { name: 'No contract training (weekly)', price: 15, billing_period: 'weekly', description: 'Pay as you go weekly' },
      { name: '3 Months DD', price: 40, billing_period: 'monthly', description: '3 month commitment' },
    ];

    for (const planData of plansToCreate) {
      const { data: existingPlan } = await supabase
        .from('membership_plans')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', planData.name)
        .single();

      if (!existingPlan) {
        const { data: newPlan, error: createError } = await supabase
          .from('membership_plans')
          .insert({
            organization_id: organizationId,
            ...planData,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.log(`  ✗ Failed to create ${planData.name}: ${createError.message}`);
        } else {
          console.log(`  ✅ Created plan: ${planData.name}`);
        }
      } else {
        console.log(`  ↺ Plan already exists: ${planData.name}`);
      }
    }

    // 4. Link clients to their membership plans
    console.log('\n4. Creating membership records for clients...');

    // Get all plans
    const { data: allPlans } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', organizationId);

    const planMap = {};
    allPlans?.forEach(plan => {
      planMap[plan.name] = plan.id;
    });

    // Process clients with memberships
    let linkedCount = 0;
    let failedCount = 0;

    for (const client of clients || []) {
      const membershipName = client.metadata?.active_membership;
      if (membershipName && planMap[membershipName]) {
        // Check if membership record already exists
        const { data: existingMembership } = await supabase
          .from('memberships')
          .select('id')
          .eq('client_id', client.id)
          .eq('membership_plan_id', planMap[membershipName])
          .single();

        if (!existingMembership) {
          const { error: membershipError } = await supabase
            .from('memberships')
            .insert({
              client_id: client.id,
              customer_id: client.id, // Some systems use customer_id
              membership_plan_id: planMap[membershipName],
              organization_id: organizationId,
              status: 'active',
              start_date: client.metadata?.join_date || new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (membershipError) {
            console.log(`  ✗ Failed to link ${client.name}: ${membershipError.message}`);
            failedCount++;
          } else {
            linkedCount++;
            if (linkedCount <= 5) {
              console.log(`  ✅ Linked ${client.name} to ${membershipName}`);
            }
          }
        }
      }
    }

    console.log(`\n✅ Linked ${linkedCount} clients to their membership plans`);
    if (failedCount > 0) {
      console.log(`❌ Failed to link ${failedCount} clients`);
    }

    // 5. Summary
    console.log('\n📊 Summary:');
    console.log(`Total membership plans: ${allPlans?.length || 0}`);
    console.log(`Clients with active memberships: ${clients?.length || 0}`);
    console.log(`Successfully linked: ${linkedCount}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

setupMemberships();