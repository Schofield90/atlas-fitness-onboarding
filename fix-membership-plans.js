const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMembershipPlans() {
  // Get existing plans
  const { data: plans, error: fetchError } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('organization_id', 'eac9a158-d3c7-4140-9620-91a5554a6fe8');

  console.log('Found plans:', plans?.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    price_pennies: p.price_pennies,
    is_active: p.is_active
  })));

  if (plans && plans.length > 0) {
    // Update the first plan with proper pricing
    const { data: updated1, error: error1 } = await supabase
      .from('membership_plans')
      .update({
        name: 'Basic Monthly',
        price: 30,
        price_pennies: 2999,
        description: 'Basic monthly gym membership',
        billing_period: 'monthly',
        is_active: true
      })
      .eq('id', plans[0].id)
      .select();

    if (error1) {
      console.log('Error updating plan 1:', error1);
    } else {
      console.log('Updated plan 1:', updated1?.[0]?.name, 'Price:', updated1?.[0]?.price_pennies);
    }

    // Update the second plan if it exists
    if (plans.length > 1) {
      const { data: updated2, error: error2 } = await supabase
        .from('membership_plans')
        .update({
          name: 'Premium Monthly',
          price: 50,
          price_pennies: 4999,
          description: 'Premium monthly gym membership with classes',
          billing_period: 'monthly',
          is_active: true
        })
        .eq('id', plans[1].id)
        .select();

      if (error2) {
        console.log('Error updating plan 2:', error2);
      } else {
        console.log('Updated plan 2:', updated2?.[0]?.name, 'Price:', updated2?.[0]?.price_pennies);
      }
    }
  }

  // Verify the updates
  const { data: finalPlans } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('organization_id', 'eac9a158-d3c7-4140-9620-91a5554a6fe8')
    .eq('is_active', true)
    .order('price_pennies', { ascending: true });

  console.log('\nFinal active plans:', finalPlans?.map(p => ({
    name: p.name,
    price: `£${(p.price_pennies / 100).toFixed(2)}`,
    is_active: p.is_active
  })));
}

fixMembershipPlans().catch(console.error);