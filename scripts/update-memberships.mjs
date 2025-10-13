import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const orgId = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';

async function updateMemberships() {
  console.log('🔄 Fetching membership plans...\n');

  const { data: plans, error: plansError } = await supabase
    .from('membership_plans')
    .select('id, name, price')
    .eq('organization_id', orgId);

  if (plansError) {
    console.error('❌ Error fetching plans:', plansError);
    return;
  }

  console.log(`Found ${plans.length} plans:`, plans.map(p => p.name).join(', '));

  const planMap = {
    trial: plans.find(p => p.name === 'Trial Pass'),
    basic: plans.find(p => p.name === 'Basic Monthly'),
    premium: plans.find(p => p.name === 'Premium Monthly'),
    elite: plans.find(p => p.name === 'Elite Unlimited'),
    vip: plans.find(p => p.name === 'VIP Annual')
  };

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, first_name, last_name')
    .eq('org_id', orgId)
    .order('created_at')
    .limit(50);

  if (clientsError) {
    console.error('❌ Error fetching clients:', clientsError);
    return;
  }

  console.log(`\n📊 Distributing ${clients.length} members across tiers...\n`);

  const clientIds = clients.map(c => c.id);
  await supabase
    .from('customer_memberships')
    .delete()
    .in('client_id', clientIds);

  const memberships = [];
  const distribution = { trial: 0, basic: 0, premium: 0, elite: 0, vip: 0 };

  clients.forEach((client, index) => {
    const memberIndex = index + 1;
    let plan, startOffset, tier;

    if (memberIndex <= 2) {
      tier = 'trial';
      plan = planMap.trial;
      startOffset = 180 - Math.floor(Math.random() * 30);
    } else if (memberIndex <= 5) {
      tier = 'basic';
      plan = planMap.basic;
      startOffset = 160 - Math.floor(Math.random() * 20);
    } else if (memberIndex <= 9) {
      tier = 'basic';
      plan = planMap.basic;
      startOffset = 120 - Math.floor(Math.random() * 15);
    } else if (memberIndex <= 13) {
      tier = 'premium';
      plan = planMap.premium;
      startOffset = 110 - Math.floor(Math.random() * 15);
    } else if (memberIndex <= 19) {
      tier = 'premium';
      plan = planMap.premium;
      startOffset = 90 - Math.floor(Math.random() * 15);
    } else if (memberIndex <= 25) {
      tier = 'elite';
      plan = planMap.elite;
      startOffset = 80 - Math.floor(Math.random() * 15);
    } else if (memberIndex <= 30) {
      tier = 'basic';
      plan = planMap.basic;
      startOffset = 60 - Math.floor(Math.random() * 15);
    } else if (memberIndex <= 35) {
      tier = 'premium';
      plan = planMap.premium;
      startOffset = 55 - Math.floor(Math.random() * 15);
    } else if (memberIndex <= 40) {
      tier = 'elite';
      plan = planMap.elite;
      startOffset = 50 - Math.floor(Math.random() * 15);
    } else if (memberIndex <= 44) {
      tier = 'premium';
      plan = planMap.premium;
      startOffset = 30 - Math.floor(Math.random() * 15);
    } else if (memberIndex <= 48) {
      tier = 'elite';
      plan = planMap.elite;
      startOffset = 20 - Math.floor(Math.random() * 10);
    } else {
      tier = 'vip';
      plan = planMap.vip;
      startOffset = 15 - Math.floor(Math.random() * 10);
    }

    distribution[tier]++;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - startOffset);

    memberships.push({
      client_id: client.id,
      organization_id: orgId,
      membership_plan_id: plan.id,
      status: 'active',
      start_date: startDate.toISOString().split('T')[0],
      payment_provider: 'stripe'
    });
  });

  const { error } = await supabase
    .from('customer_memberships')
    .insert(memberships);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('✅ Memberships updated successfully!\n');
  console.log('📈 Distribution:');
  console.log(`  Trial Pass (£20):       ${distribution.trial} members`);
  console.log(`  Basic Monthly (£49):    ${distribution.basic} members`);
  console.log(`  Premium Monthly (£89):  ${distribution.premium} members`);
  console.log(`  Elite Unlimited (£129): ${distribution.elite} members`);
  console.log(`  VIP Annual (£1200):     ${distribution.vip} members`);
  const monthlyRev = (distribution.basic * 49) + (distribution.premium * 89) + (distribution.elite * 129) + (distribution.vip * 100);
  console.log(`\n💰 Expected Monthly Revenue: £${monthlyRev}`);
}

updateMemberships().catch(console.error);
