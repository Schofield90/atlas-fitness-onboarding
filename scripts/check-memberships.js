const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMemberships() {
  try {
    console.log('Checking membership plans in database...\n');
    
    // Check membership_plans table
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .order('created_at', { ascending: false });
    
    if (plansError) {
      console.error('Error fetching membership plans:', plansError);
    } else {
      console.log(`Found ${plans?.length || 0} membership plans:`);
      if (plans && plans.length > 0) {
        plans.forEach(plan => {
          console.log(`\n- ${plan.name}`);
          console.log(`  Price: £${(plan.price_pennies / 100).toFixed(2)}/${plan.billing_period}`);
          console.log(`  Status: ${plan.is_active ? 'Active' : 'Inactive'}`);
          console.log(`  Created: ${new Date(plan.created_at).toLocaleDateString()}`);
        });
      }
    }
    
    console.log('\n-----------------------------------\n');
    
    // Check active memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from('memberships')
      .select(`
        *,
        users (email, name),
        membership_plans (name, price_pennies, billing_period)
      `)
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .eq('status', 'active')
      .limit(10);
    
    if (membershipsError) {
      console.error('Error fetching active memberships:', membershipsError);
    } else {
      console.log(`Found ${memberships?.length || 0} active memberships:`);
      if (memberships && memberships.length > 0) {
        memberships.forEach(membership => {
          console.log(`\n- ${membership.users?.name || membership.users?.email}`);
          console.log(`  Plan: ${membership.membership_plans?.name}`);
          console.log(`  Started: ${new Date(membership.start_date).toLocaleDateString()}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkMemberships();