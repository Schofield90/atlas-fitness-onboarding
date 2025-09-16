const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function createRemainingMemberships() {
  console.log('🎆 Creating remaining membership plans and linking clients...\n');

  try {
    // 1. Get clients that don't have memberships linked yet
    console.log('1. Finding clients without linked memberships...');
    
    // Get all clients with metadata active_membership
    const { data: allClients } = await supabase
      .from('clients')
      .select('id, name, metadata')
      .eq('organization_id', organizationId)
      .eq('source', 'migration')
      .not('metadata->active_membership', 'is', null);

    // Get clients that already have customer_memberships
    const { data: linkedClients } = await supabase
      .from('customer_memberships')
      .select('client_id')
      .eq('organization_id', organizationId)
      .not('client_id', 'is', null);

    const linkedClientIds = new Set(linkedClients?.map(c => c.client_id) || []);
    const unlinkedClients = allClients?.filter(c => !linkedClientIds.has(c.id)) || [];

    console.log(`Found ${unlinkedClients.length} clients without linked memberships`);

    // 2. Get unique membership combinations from unlinked clients
    const uniqueMemberships = new Map();
    unlinkedClients.forEach(client => {
      const membership = client.metadata?.active_membership;
      if (membership) {
        uniqueMemberships.set(membership, (uniqueMemberships.get(membership) || 0) + 1);
      }
    });

    console.log('\n2. Unique membership combinations to handle:');
    uniqueMemberships.forEach((count, membership) => {
      console.log(`  - "${membership}": ${count} clients`);
    });

    // 3. Handle multi-membership clients by using their primary membership
    console.log('\n3. Creating simplified memberships for complex combinations...');
    
    for (const client of unlinkedClients) {
      const fullMembership = client.metadata?.active_membership;
      if (!fullMembership) continue;

      // Extract primary membership (first one if multiple)
      let primaryMembership = fullMembership;
      if (fullMembership.includes(',')) {
        primaryMembership = fullMembership.split(',')[0].trim();
      }

      // Check if this membership plan exists
      const { data: existingPlan } = await supabase
        .from('membership_plans')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', primaryMembership)
        .single();

      let planId = existingPlan?.id;

      // If not, create it
      if (!planId) {
        // Determine price and billing period based on name
        let price_pennies = 5000; // Default £50
        let billing_period = 'monthly';
        
        if (primaryMembership.toLowerCase().includes('life time') || 
            primaryMembership.toLowerCase().includes('lifetime')) {
          price_pennies = 0;
          billing_period = 'lifetime';
        } else if (primaryMembership.toLowerCase().includes('6 week')) {
          price_pennies = 19900;
          billing_period = 'one_time';
        } else if (primaryMembership.toLowerCase().includes('28 day') || 
                   primaryMembership.toLowerCase().includes('4 week')) {
          price_pennies = 14900;
          billing_period = 'one_time';
        } else if (primaryMembership.toLowerCase().includes('weekly')) {
          price_pennies = 1500;
          billing_period = 'weekly';
        } else if (primaryMembership.toLowerCase().includes('12 month')) {
          price_pennies = 4500;
          billing_period = 'monthly';
        } else if (primaryMembership.toLowerCase().includes('6 month')) {
          price_pennies = 4000;
          billing_period = 'monthly';
        } else if (primaryMembership.toLowerCase().includes('black friday')) {
          price_pennies = 3500;
          billing_period = 'monthly';
        } else if (primaryMembership.toLowerCase().includes('trial')) {
          price_pennies = 0;
          billing_period = 'one_time';
        } else if (primaryMembership.toLowerCase().includes('hyrox')) {
          price_pennies = 2500;
          billing_period = 'one_time';
        } else if (primaryMembership.toLowerCase().includes('hybrid')) {
          price_pennies = 7500;
          billing_period = 'monthly';
        }

        const { data: newPlan, error: createError } = await supabase
          .from('membership_plans')
          .insert({
            organization_id: organizationId,
            name: primaryMembership,
            description: `Imported: ${primaryMembership}`,
            price: price_pennies,
            price_pennies: price_pennies,
            billing_period: billing_period,
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

        if (!createError && newPlan) {
          planId = newPlan.id;
          console.log(`  ✓ Created plan: ${primaryMembership}`);
        } else if (createError) {
          console.log(`  ✗ Failed to create plan: ${primaryMembership}`);
        }
      }

      // Link the client to the membership plan
      if (planId) {
        const { error: linkError } = await supabase
          .from('customer_memberships')
          .insert({
            organization_id: organizationId,
            client_id: client.id,
            membership_plan_id: planId,
            status: 'active',
            start_date: client.metadata?.join_date || new Date().toISOString().split('T')[0],
            notes: fullMembership.includes(',') ? `Full membership: ${fullMembership}` : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (!linkError) {
          console.log(`  ✓ Linked: ${client.name} → ${primaryMembership}`);
        } else {
          console.log(`  ✗ Failed to link: ${client.name}`);
        }
      }
    }

    // 4. Final summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ FINAL MEMBERSHIP SETUP COMPLETE!');
    console.log('='.repeat(50));

    // Get final counts
    const { count: totalMemberships } = await supabase
      .from('customer_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const { count: totalPlans } = await supabase
      .from('membership_plans')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const { data: finalLinkedClients } = await supabase
      .from('customer_memberships')
      .select('client_id')
      .eq('organization_id', organizationId)
      .not('client_id', 'is', null);

    const finalLinkedCount = new Set(finalLinkedClients?.map(c => c.client_id) || []).size;

    console.log(`📊 Total membership plans: ${totalPlans || 0}`);
    console.log(`👥 Total clients imported: 206`);
    console.log(`🆗 Clients with memberships linked: ${finalLinkedCount}`);
    console.log(`📝 Total membership records: ${totalMemberships || 0}`);
    console.log(`✅ Success rate: ${Math.round(finalLinkedCount / 206 * 100)}%`);

  } catch (error) {
    console.error('Error:', error);
  }
}

createRemainingMemberships();