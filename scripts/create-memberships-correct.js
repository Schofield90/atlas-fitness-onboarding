const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function createMembershipsCorrect() {
  console.log('🎯 Creating membership plans and linking clients (with correct schema)...\n');

  try {
    // 1. Define membership plans based on imported data
    console.log('1. Creating membership plans...');
    const plansToCreate = [
      { name: 'Full Member (York)', price_pennies: 5000, billing_period: 'monthly', description: 'Full access to York facility' },
      { name: 'Full Member', price_pennies: 5000, billing_period: 'monthly', description: 'Full membership access' },
      { name: '12 month', price_pennies: 4500, billing_period: 'monthly', description: '12 month commitment' },
      { name: '12 Month Programme', price_pennies: 4500, billing_period: 'monthly', description: '12 month programme' },
      { name: 'Life time membership', price_pennies: 0, billing_period: 'lifetime', description: 'Lifetime access' },
      { name: 'Month To Month Programme', price_pennies: 5500, billing_period: 'monthly', description: 'No contract, monthly rolling' },
      { name: '6 Week Transformation Programme', price_pennies: 19900, billing_period: 'one_time', description: '6 week transformation' },
      { name: '6 week transformation programme', price_pennies: 19900, billing_period: 'one_time', description: '6 week transformation' },
      { name: '28 Day Transformation Programme (Harrogate)', price_pennies: 14900, billing_period: 'one_time', description: '28 day transformation' },
      { name: '28 Day Transformation Programme Women', price_pennies: 14900, billing_period: 'one_time', description: '28 day transformation for women' },
      { name: 'Block of 10 Sessions', price_pennies: 35000, billing_period: 'one_time', description: '10 personal training sessions' },
      { name: 'No contract training (weekly)', price_pennies: 1500, billing_period: 'weekly', description: 'Pay as you go weekly' },
      { name: '3 Months DD', price_pennies: 4000, billing_period: 'monthly', description: '3 month commitment' },
      { name: '12 months (paid weekly)', price_pennies: 1125, billing_period: 'weekly', description: '12 month commitment, paid weekly' },
      { name: 'Larger group 12 month programme', price_pennies: 3500, billing_period: 'monthly', description: 'Group training 12 months' },
      { name: '6 Week Transformation Programme [York]', price_pennies: 19900, billing_period: 'one_time', description: '6 week transformation York' },
      { name: 'Free Trial Day', price_pennies: 0, billing_period: 'one_time', description: 'Free trial day' },
      { name: '1 session per week', price_pennies: 3000, billing_period: 'monthly', description: 'One session per week' },
      { name: '6 Month upfront', price_pennies: 24000, billing_period: 'one_time', description: '6 months paid upfront' },
      { name: '12 months paid up front', price_pennies: 48000, billing_period: 'one_time', description: '12 months paid upfront' },
    ];

    let createdCount = 0;
    let existingCount = 0;

    for (const planData of plansToCreate) {
      // Check if plan already exists
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
            name: planData.name,
            description: planData.description,
            price: planData.price_pennies, // Using price field
            price_pennies: planData.price_pennies,
            billing_period: planData.billing_period,
            is_active: true,
            features: [],
            trial_days: 0,
            trial_period_days: 0,
            signup_fee_pennies: 0,
            cancellation_fee_pennies: 0,
            cancellation_notice_days: 30,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.log(`  ✗ Failed: ${planData.name} - ${createError.message}`);
        } else {
          console.log(`  ✅ Created: ${planData.name}`);
          createdCount++;
        }
      } else {
        existingCount++;
      }
    }

    console.log(`\nCreated ${createdCount} new plans, ${existingCount} already existed`);

    // 2. Get all membership plans
    console.log('\n2. Loading all membership plans...');
    const { data: allPlans } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', organizationId);

    const planMap = {};
    allPlans?.forEach(plan => {
      planMap[plan.name.trim()] = plan.id;
    });

    console.log(`Loaded ${Object.keys(planMap).length} membership plans`);

    // 3. Link clients to their membership plans
    console.log('\n3. Creating customer_memberships for imported clients...');

    // Get all imported clients with membership data
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('source', 'migration')
      .not('metadata->active_membership', 'is', null);

    console.log(`Found ${clients?.length || 0} clients with active memberships`);

    let linkedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const notFoundPlans = new Set();

    for (const client of clients || []) {
      const membershipName = client.metadata?.active_membership?.trim();

      if (membershipName) {
        const planId = planMap[membershipName];

        if (planId) {
          // Check if membership already exists
          const { data: existingMembership } = await supabase
            .from('customer_memberships')
            .select('id')
            .eq('customer_id', client.id)
            .eq('membership_plan_id', planId)
            .single();

          if (!existingMembership) {
            const { error: membershipError } = await supabase
              .from('customer_memberships')
              .insert({
                organization_id: organizationId,
                customer_id: client.id,
                client_id: client.id, // Both fields for compatibility
                membership_plan_id: planId,
                status: 'active',
                start_date: client.metadata?.join_date || new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (membershipError) {
              console.log(`  ✗ Failed: ${client.name} - ${membershipError.message.substring(0, 50)}`);
              failedCount++;
            } else {
              linkedCount++;
              if (linkedCount <= 10) {
                console.log(`  ✅ Linked: ${client.name} → ${membershipName}`);
              }
            }
          } else {
            skippedCount++;
          }
        } else {
          notFoundPlans.add(membershipName);
        }
      }
    }

    console.log(`\n✅ Successfully linked ${linkedCount} clients to memberships`);
    console.log(`↺ Skipped ${skippedCount} (already linked)`);

    if (failedCount > 0) {
      console.log(`❌ Failed ${failedCount}`);
    }

    if (notFoundPlans.size > 0) {
      console.log('\n⚠️  Membership plans not found (need manual creation):');
      notFoundPlans.forEach(plan => {
        console.log(`  - ${plan}`);
      });
    }

    // 4. Show summary
    console.log('\n📊 Final Summary:');
    const { count: totalMemberships } = await supabase
      .from('customer_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    console.log(`Total customer memberships in system: ${totalMemberships || 0}`);

    // Show sample linked memberships
    console.log('\nSample linked memberships:');
    const { data: sampleMemberships } = await supabase
      .from('customer_memberships')
      .select(`
        *,
        clients!customer_memberships_customer_id_fkey(name, email),
        membership_plans!customer_memberships_membership_plan_id_fkey(name, price)
      `)
      .eq('organization_id', organizationId)
      .limit(5);

    sampleMemberships?.forEach(m => {
      console.log(`  ${m.clients?.name}: ${m.membership_plans?.name} (£${(m.membership_plans?.price || 0) / 100})`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

createMembershipsCorrect();