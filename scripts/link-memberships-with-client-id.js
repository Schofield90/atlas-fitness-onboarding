const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function linkMembershipsWithClientId() {
  console.log('🎯 Linking clients to membership plans using client_id...\n');

  try {
    // 1. Get all membership plans
    console.log('1. Loading membership plans...');
    const { data: allPlans } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', organizationId);

    const planMap = {};
    allPlans?.forEach(plan => {
      planMap[plan.name.trim()] = plan.id;
    });

    console.log(`Found ${Object.keys(planMap).length} membership plans`);

    // 2. Get all imported clients with membership data
    console.log('\n2. Loading imported clients with memberships...');
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('source', 'migration')
      .not('metadata->active_membership', 'is', null);

    console.log(`Found ${clients?.length || 0} clients with active memberships`);

    // 3. Create customer_memberships using client_id (not customer_id)
    console.log('\n3. Creating customer_memberships...\n');
    let linkedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const notFoundPlans = new Set();
    const errors = new Map();

    for (const client of clients || []) {
      const membershipName = client.metadata?.active_membership?.trim();

      if (membershipName) {
        const planId = planMap[membershipName];

        if (planId) {
          // Check if membership already exists (using client_id)
          const { data: existingMembership } = await supabase
            .from('customer_memberships')
            .select('id')
            .eq('client_id', client.id)
            .eq('membership_plan_id', planId)
            .single();

          if (!existingMembership) {
            // Create membership using ONLY client_id (not customer_id)
            const membershipData = {
              organization_id: organizationId,
              client_id: client.id,  // Use client_id ONLY
              // customer_id: null,   // Explicitly exclude customer_id
              membership_plan_id: planId,
              status: 'active',
              start_date: client.metadata?.join_date || new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const { error: membershipError } = await supabase
              .from('customer_memberships')
              .insert(membershipData);

            if (membershipError) {
              failedCount++;
              const errorMsg = membershipError.message.substring(0, 100);
              errors.set(errorMsg, (errors.get(errorMsg) || 0) + 1);
              
              if (failedCount <= 3) {
                console.log(`  ✗ Failed: ${client.name}`);
                console.log(`    Error: ${errorMsg}`);
              }
            } else {
              linkedCount++;
              if (linkedCount <= 10) {
                console.log(`  ✓ Linked: ${client.name} → ${membershipName}`);
              } else if (linkedCount % 20 === 0) {
                console.log(`  ... ${linkedCount} linked so far`);
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

    // 4. Show results
    console.log('\n' + '='.repeat(50));
    console.log('✅ MEMBERSHIP LINKING COMPLETE!');
    console.log('='.repeat(50));
    console.log(`✅ Successfully linked: ${linkedCount}`);
    console.log(`↺ Skipped (already linked): ${skippedCount}`);
    console.log(`❌ Failed: ${failedCount}`);

    if (errors.size > 0) {
      console.log('\n⚠️  Error Summary:');
      errors.forEach((count, error) => {
        console.log(`  - ${error}... (${count} times)`);
      });
    }

    if (notFoundPlans.size > 0) {
      console.log('\n⚠️  Membership plans not found:');
      notFoundPlans.forEach(plan => {
        console.log(`  - ${plan}`);
      });
    }

    // 5. Show total customer memberships
    const { count: totalMemberships } = await supabase
      .from('customer_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    console.log(`\n📊 Total customer memberships in system: ${totalMemberships || 0}`);

    // 6. Show sample linked memberships
    if (linkedCount > 0) {
      console.log('\n📖 Sample linked memberships:');
      const { data: sampleMemberships } = await supabase
        .from('customer_memberships')
        .select(`
          *,
          clients!customer_memberships_client_id_fkey(name, email),
          membership_plans!customer_memberships_membership_plan_id_fkey(name, price)
        `)
        .eq('organization_id', organizationId)
        .not('client_id', 'is', null)
        .limit(5);

      sampleMemberships?.forEach(m => {
        const price = (m.membership_plans?.price || 0) / 100;
        console.log(`  ${m.clients?.name}: ${m.membership_plans?.name} (£${price})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

linkMembershipsWithClientId();