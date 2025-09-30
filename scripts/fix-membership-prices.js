const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMembershipPrices() {
  const organizationId = 'eac9a158-d3c7-4140-9620-91a5554a6fe8';
  
  console.log('Fixing membership prices for organization:', organizationId);
  
  // Get current membership plans
  const { data: plans, error: fetchError } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('organization_id', organizationId);
    
  if (fetchError) {
    console.error('Error fetching plans:', fetchError);
    return;
  }
  
  console.log('\nCurrent plans:');
  plans.forEach(plan => {
    console.log(`- ${plan.name}: £${plan.price / 100} (stored as ${plan.price} pence)`);
  });
  
  // Update prices - multiply by 100 to convert from pounds to pence
  // Assuming you wanted £50 for Premium and £30 for Basic
  const updates = [
    { name: 'Premium Monthly', newPrice: 5000 }, // £50.00
    { name: 'Basic Monthly', newPrice: 3000 }     // £30.00
  ];
  
  console.log('\n🔧 Updating prices...');
  
  for (const update of updates) {
    const plan = plans.find(p => p.name === update.name);
    if (plan) {
      const { error: updateError } = await supabase
        .from('membership_plans')
        .update({ price: update.newPrice })
        .eq('id', plan.id);
        
      if (updateError) {
        console.error(`❌ Error updating ${update.name}:`, updateError);
      } else {
        console.log(`✅ Updated ${update.name} to £${update.newPrice / 100}`);
      }
    } else {
      console.log(`⚠️  Plan "${update.name}" not found`);
    }
  }
  
  // Verify the updates
  const { data: updatedPlans } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('organization_id', organizationId);
    
  console.log('\n✅ Updated plans:');
  updatedPlans.forEach(plan => {
    console.log(`- ${plan.name}: £${plan.price / 100} (stored as ${plan.price} pence)`);
  });
}

// Run the fix
fixMembershipPrices().catch(console.error);