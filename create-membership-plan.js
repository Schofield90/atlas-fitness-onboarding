const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createMembershipPlan() {
  // First check if any plans exist
  const { data: existingPlans, error: checkError } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('organization_id', 'eac9a158-d3c7-4140-9620-91a5554a6fe8');

  console.log('Existing plans:', {
    count: existingPlans?.length || 0,
    plans: existingPlans?.map(p => ({ name: p.name, price: p.price_pennies }))
  });

  // Create a few membership plans
  const plans = [
    {
      organization_id: 'eac9a158-d3c7-4140-9620-91a5554a6fe8',
      name: 'Basic Monthly',
      description: 'Basic gym access',
      price: 30,
      price_pennies: 2999,
      billing_period: 'monthly',
      is_active: true
    },
    {
      organization_id: 'eac9a158-d3c7-4140-9620-91a5554a6fe8',
      name: 'Premium Monthly',
      description: 'Premium gym access with classes',
      price: 50,
      price_pennies: 4999,
      billing_period: 'monthly',
      is_active: true
    },
    {
      organization_id: 'eac9a158-d3c7-4140-9620-91a5554a6fe8',
      name: 'Annual Membership',
      description: 'Full year access - best value',
      price: 300,
      price_pennies: 29999,
      billing_period: 'yearly',
      is_active: true
    }
  ];

  // Insert the plans
  const { data, error } = await supabase
    .from('membership_plans')
    .insert(plans)
    .select();

  if (error) {
    console.error('Error creating membership plans:', error);
  } else {
    console.log('Created membership plans:', data?.map(p => p.name));
  }

  // Verify they were created
  const { data: allPlans } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('organization_id', 'eac9a158-d3c7-4140-9620-91a5554a6fe8')
    .eq('is_active', true);

  console.log('\nAll active plans for organization:', {
    count: allPlans?.length || 0,
    plans: allPlans?.map(p => ({
      name: p.name,
      price: p.price_pennies / 100,
      billing: p.billing_period
    }))
  });
}

createMembershipPlan().catch(console.error);