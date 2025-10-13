import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const orgId = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';

async function generateFuturePayments() {
  console.log('🔄 Fetching active memberships...\n');

  const { data: memberships, error: membershipError } = await supabase
    .from('customer_memberships')
    .select(`
      id,
      client_id,
      membership_plan_id,
      start_date,
      next_billing_date,
      payment_provider,
      membership_plans!inner(id, name, price, price_pennies, billing_period)
    `)
    .eq('organization_id', orgId)
    .eq('status', 'active');

  if (membershipError) {
    console.error('❌ Error fetching memberships:', membershipError);
    return;
  }

  console.log(`Found ${memberships.length} active memberships\n`);

  const paymentsToCreate = [];
  const monthsAhead = 3;

  memberships.forEach((membership) => {
    const plan = membership.membership_plans;
    
    if (plan.billing_period === 'one_time') {
      return;
    }

    const startDate = membership.next_billing_date || membership.start_date;
    const baseDate = new Date(startDate);

    for (let i = 1; i <= monthsAhead; i++) {
      const paymentDate = new Date(baseDate);
      
      switch (plan.billing_period) {
        case 'monthly':
          paymentDate.setMonth(paymentDate.getMonth() + i);
          break;
        case 'annual':
        case 'yearly':
          paymentDate.setFullYear(paymentDate.getFullYear() + i);
          break;
        case 'weekly':
          paymentDate.setDate(paymentDate.getDate() + (i * 7));
          break;
        default:
          paymentDate.setMonth(paymentDate.getMonth() + i);
      }

      paymentsToCreate.push({
        organization_id: orgId,
        client_id: membership.client_id,
        amount: plan.price,
        amount_pennies: plan.price_pennies,
        payment_provider: membership.payment_provider || 'stripe',
        payment_status: 'scheduled',
        scheduled_date: paymentDate.toISOString().split('T')[0],
        payment_date: paymentDate.toISOString().split('T')[0],
        metadata: {
          membership_id: membership.id,
          membership_plan_id: membership.membership_plan_id,
          plan_name: plan.name,
          scheduled_payment: true,
          generated_at: new Date().toISOString()
        }
      });
    }
  });

  console.log(`💳 Creating ${paymentsToCreate.length} future payments...\n`);

  const batchSize = 100;
  let created = 0;

  for (let i = 0; i < paymentsToCreate.length; i += batchSize) {
    const batch = paymentsToCreate.slice(i, i + batchSize);
    const { error } = await supabase.from('payments').insert(batch);
    
    if (error) {
      console.error('❌ Error inserting batch:', error);
      continue;
    }
    
    created += batch.length;
  }

  console.log(`✅ Created ${created} scheduled payments successfully!\n`);
  
  const breakdown = {};
  paymentsToCreate.forEach(p => {
    const month = p.payment_date.substring(0, 7);
    breakdown[month] = (breakdown[month] || 0) + p.amount;
  });

  console.log('📊 Projected Revenue:');
  Object.entries(breakdown).sort().forEach(([month, amount]) => {
    console.log(`  ${month}: £${amount.toFixed(2)}`);
  });
  
  const totalRevenue = Object.values(breakdown).reduce((sum, amt) => sum + amt, 0);
  console.log(`\n💰 Total 3-Month Projection: £${totalRevenue.toFixed(2)}`);
}

generateFuturePayments().catch(console.error);
