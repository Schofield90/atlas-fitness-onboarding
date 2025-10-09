#!/usr/bin/env node

/**
 * Demo Account Setup Script
 * Creates a complete demo environment for Atlas Fitness CRM
 *
 * Setup:
 * - Demo organization "Demo Fitness Studio"
 * - Test user: test@test.co.uk / Test123
 * - 50 realistic clients with diverse profiles
 * - 5 membership tiers (Trial, Basic, Premium, Elite, VIP)
 * - 8 class types (Yoga, HIIT, Strength, Spin, Boxing, Pilates, CrossFit, Zumba)
 * - 4 weeks of class schedule (5 classes/day)
 * - Realistic bookings and attendance (80% attendance rate, 5% no-shows)
 * - 6 months of payment history
 * - Failed payments for 10% of clients
 * - AI-relevant metadata (lead scores, engagement)
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

const FIRST_NAMES = [
  'James', 'Emma', 'Oliver', 'Sophia', 'William', 'Ava', 'Noah', 'Isabella',
  'Liam', 'Mia', 'Mason', 'Charlotte', 'Ethan', 'Amelia', 'Lucas', 'Harper',
  'Logan', 'Evelyn', 'Alexander', 'Abigail', 'Jacob', 'Emily', 'Michael', 'Elizabeth',
  'Benjamin', 'Sofia', 'Elijah', 'Avery', 'Daniel', 'Ella', 'Matthew', 'Scarlett',
  'Henry', 'Grace', 'Jackson', 'Chloe', 'Sebastian', 'Victoria', 'Aiden', 'Riley',
  'Samuel', 'Aria', 'David', 'Lily', 'Joseph', 'Aubrey', 'Carter', 'Zoey', 'Owen', 'Penelope'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
  'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen',
  'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
  'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Phillips'
];

const CLASS_TYPES = [
  { name: 'Yoga Flow', description: 'Vinyasa-style flowing yoga', duration: 60, capacity: 20 },
  { name: 'HIIT Training', description: 'High-intensity interval training', duration: 45, capacity: 15 },
  { name: 'Strength & Conditioning', description: 'Weight training and conditioning', duration: 60, capacity: 12 },
  { name: 'Spin Class', description: 'Indoor cycling workout', duration: 45, capacity: 20 },
  { name: 'Boxing Fundamentals', description: 'Boxing techniques and cardio', duration: 60, capacity: 15 },
  { name: 'Pilates Core', description: 'Core-focused Pilates', duration: 50, capacity: 18 },
  { name: 'CrossFit WOD', description: 'Workout of the day', duration: 60, capacity: 12 },
  { name: 'Zumba Dance', description: 'Dance fitness party', duration: 45, capacity: 25 }
];

const MEMBERSHIP_PLANS = [
  { name: 'Trial Pass', description: '1-week trial membership', price: 20, billing_period: 'one_time', category: 'trial' },
  { name: 'Basic Monthly', description: '4 classes per month', price: 49, billing_period: 'monthly', category: 'basic' },
  { name: 'Premium Monthly', description: '12 classes per month', price: 89, billing_period: 'monthly', category: 'premium' },
  { name: 'Elite Unlimited', description: 'Unlimited classes', price: 129, billing_period: 'monthly', category: 'elite' },
  { name: 'VIP Annual', description: 'Unlimited classes + PT sessions', price: 1200, billing_period: 'yearly', category: 'vip' }
];

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generatePhone() {
  return `07${randomInt(100000000, 999999999)}`;
}

function generateEmail(firstName, lastName) {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomElement(domains)}`;
}

// ============================================================================
// MAIN SETUP FUNCTIONS
// ============================================================================

async function createDemoOrganization() {
  console.log('\n🏢 Creating demo organization...');

  const { data: org, error } = await supabase
    .from('organizations')
    .insert({
      name: 'Demo Fitness Studio',
      slug: 'demo-fitness',
      email: 'info@demofitness.com',
      phone: '020 1234 5678',
      address: '123 Demo Street, London, SW1A 1AA',
      settings: {
        timezone: 'Europe/London',
        currency: 'GBP',
        features: {
          ai_agents: true,
          automations: true,
          payments: true
        }
      }
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create organization:', error.message);
    process.exit(1);
  }

  console.log('✅ Created organization:', org.name, `(${org.id})`);
  return org;
}

async function createDemoUser(organizationId) {
  console.log('\n👤 Creating test user account...');

  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: 'test@test.co.uk',
    password: 'Test123',
    email_confirm: true,
    user_metadata: {
      first_name: 'Test',
      last_name: 'User'
    }
  });

  if (authError) {
    console.error('❌ Failed to create auth user:', authError.message);
    process.exit(1);
  }

  // Link to organization
  const { error: linkError } = await supabase
    .from('user_organizations')
    .insert({
      user_id: authUser.user.id,
      organization_id: organizationId,
      role: 'admin'
    });

  if (linkError) {
    console.error('❌ Failed to link user to organization:', linkError.message);
  }

  // Create staff record
  const { error: staffError } = await supabase
    .from('organization_staff')
    .insert({
      user_id: authUser.user.id,
      organization_id: organizationId,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@test.co.uk',
      role: 'admin',
      permissions: { all: true }
    });

  if (staffError) {
    console.error('⚠️  Failed to create staff record:', staffError.message);
  }

  console.log('✅ Created test user: test@test.co.uk / Test123');
  return authUser.user;
}

async function createMembershipPlans(organizationId) {
  console.log('\n💳 Creating membership plans...');

  const plans = [];
  for (const plan of MEMBERSHIP_PLANS) {
    const { data, error } = await supabase
      .from('membership_plans')
      .insert({
        organization_id: organizationId,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        billing_period: plan.billing_period,
        category: plan.category,
        payment_provider: 'stripe',
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to create plan ${plan.name}:`, error.message);
    } else {
      plans.push(data);
      console.log(`✅ Created: ${plan.name} - £${plan.price}/${plan.billing_period}`);
    }
  }

  return plans;
}

async function createClassTypes(organizationId) {
  console.log('\n🏋️ Creating class types...');

  const classTypes = [];
  for (const classType of CLASS_TYPES) {
    const { data, error } = await supabase
      .from('class_types')
      .insert({
        organization_id: organizationId,
        name: classType.name,
        description: classType.description,
        duration_minutes: classType.duration,
        default_capacity: classType.capacity,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to create class ${classType.name}:`, error.message);
    } else {
      classTypes.push(data);
      console.log(`✅ Created: ${classType.name} (${classType.duration}min, capacity: ${classType.capacity})`);
    }
  }

  return classTypes;
}

async function createClients(organizationId, membershipPlans) {
  console.log('\n👥 Creating 50 demo clients...');

  const clients = [];
  const now = new Date();

  for (let i = 0; i < 50; i++) {
    const firstName = randomElement(FIRST_NAMES);
    const lastName = randomElement(LAST_NAMES);
    const email = generateEmail(firstName, lastName);

    // Determine status: 85% active, 10% inactive, 5% archived
    const rand = Math.random();
    let status;
    if (rand < 0.85) status = 'active';
    else if (rand < 0.95) status = 'inactive';
    else status = 'archived';

    // Only active clients get memberships
    const hasMembership = status === 'active';

    // Lead score: active clients 60-95, inactive 30-60, archived 10-40
    let leadScore;
    if (status === 'active') leadScore = randomInt(60, 95);
    else if (status === 'inactive') leadScore = randomInt(30, 60);
    else leadScore = randomInt(10, 40);

    // Join date: random within last 12 months
    const joinedDate = randomDate(
      new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
      now
    );

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        organization_id: organizationId,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: generatePhone(),
        status: status,
        source: 'demo_data',
        tags: hasMembership ? ['member', 'active'] : ['lead'],
        metadata: {
          lead_score: leadScore,
          engagement_level: leadScore > 70 ? 'high' : leadScore > 40 ? 'medium' : 'low',
          joined_date: joinedDate.toISOString(),
          demo_account: true
        }
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to create client ${firstName} ${lastName}:`, error.message);
    } else {
      clients.push({ ...client, hasMembership });
      if ((i + 1) % 10 === 0) {
        console.log(`✅ Created ${i + 1}/50 clients...`);
      }
    }
  }

  console.log(`✅ Created ${clients.length} clients total`);
  return clients;
}

async function assignMemberships(organizationId, clients, membershipPlans) {
  console.log('\n🎫 Assigning memberships to active clients...');

  const activeClients = clients.filter(c => c.hasMembership);
  const memberships = [];

  // Distribution: Trial 10%, Basic 30%, Premium 40%, Elite 15%, VIP 5%
  const planDistribution = [
    { plan: membershipPlans[0], weight: 0.10 }, // Trial
    { plan: membershipPlans[1], weight: 0.30 }, // Basic
    { plan: membershipPlans[2], weight: 0.40 }, // Premium
    { plan: membershipPlans[3], weight: 0.15 }, // Elite
    { plan: membershipPlans[4], weight: 0.05 }  // VIP
  ];

  for (const client of activeClients) {
    // Weighted random selection
    const rand = Math.random();
    let cumulative = 0;
    let selectedPlan = planDistribution[0].plan;

    for (const item of planDistribution) {
      cumulative += item.weight;
      if (rand <= cumulative) {
        selectedPlan = item.plan;
        break;
      }
    }

    const startDate = new Date(client.metadata.joined_date);
    const status = Math.random() > 0.05 ? 'active' : 'cancelled'; // 5% cancelled

    const { data, error } = await supabase
      .from('customer_memberships')
      .insert({
        organization_id: organizationId,
        client_id: client.id,
        plan_id: selectedPlan.id,
        status: status,
        start_date: startDate.toISOString().split('T')[0],
        billing_period: selectedPlan.billing_period,
        payment_provider: 'stripe'
      })
      .select()
      .single();

    if (!error) {
      memberships.push(data);
    }
  }

  console.log(`✅ Assigned ${memberships.length} memberships`);
  return memberships;
}

async function createClassSchedule(organizationId, classTypes) {
  console.log('\n📅 Creating 4 weeks of class schedule...');

  const sessions = [];
  const now = new Date();
  const instructors = ['Sarah Johnson', 'Mike Chen', 'Emma Wilson', 'Tom Davies', 'Lisa Martinez'];

  // Create 4 weeks of classes (28 days)
  for (let day = -7; day < 21; day++) {
    const sessionDate = new Date(now);
    sessionDate.setDate(now.getDate() + day);
    sessionDate.setHours(0, 0, 0, 0);

    // Skip Sundays
    if (sessionDate.getDay() === 0) continue;

    // 5 classes per day at different times
    const times = ['06:00', '09:00', '12:00', '17:00', '19:00'];

    for (const time of times) {
      const classType = randomElement(classTypes);
      const [hours, minutes] = time.split(':');
      const startTime = new Date(sessionDate);
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + classType.duration_minutes);

      const { data, error } = await supabase
        .from('class_sessions')
        .insert({
          organization_id: organizationId,
          class_type_id: classType.id,
          name: classType.name,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          instructor_name: randomElement(instructors),
          location: 'Main Studio',
          max_capacity: classType.default_capacity,
          status: day < 0 ? 'completed' : 'scheduled'
        })
        .select()
        .single();

      if (!error) {
        sessions.push(data);
      }
    }
  }

  console.log(`✅ Created ${sessions.length} class sessions (4 weeks)`);
  return sessions;
}

async function createBookingsAndAttendance(organizationId, clients, sessions) {
  console.log('\n📝 Creating bookings and attendance records...');

  const activeClients = clients.filter(c => c.hasMembership);
  const bookings = [];
  const now = new Date();

  // Only create bookings for past and near-future sessions
  const bookableSessions = sessions.filter(s => {
    const sessionDate = new Date(s.start_time);
    const daysFromNow = (sessionDate - now) / (1000 * 60 * 60 * 24);
    return daysFromNow < 7; // Only book up to 7 days in future
  });

  for (const session of bookableSessions) {
    const sessionDate = new Date(session.start_time);
    const isPast = sessionDate < now;

    // Each session gets 60-90% capacity bookings
    const numBookings = randomInt(
      Math.floor(session.max_capacity * 0.6),
      Math.floor(session.max_capacity * 0.9)
    );

    const shuffled = [...activeClients].sort(() => 0.5 - Math.random());
    const selectedClients = shuffled.slice(0, numBookings);

    for (const client of selectedClients) {
      let status;

      if (isPast) {
        // Past sessions: 80% attended, 5% no-show, 15% cancelled
        const rand = Math.random();
        if (rand < 0.80) status = 'attended';
        else if (rand < 0.85) status = 'no_show';
        else status = 'cancelled';
      } else {
        status = 'confirmed';
      }

      const { data, error } = await supabase
        .from('class_bookings')
        .insert({
          organization_id: organizationId,
          client_id: client.id,
          class_session_id: session.id,
          booking_status: status,
          booking_date: new Date(sessionDate.getTime() - 24 * 60 * 60 * 1000).toISOString() // Booked 1 day before
        })
        .select()
        .single();

      if (!error) {
        bookings.push(data);
      }
    }
  }

  console.log(`✅ Created ${bookings.length} bookings`);

  const attended = bookings.filter(b => b.booking_status === 'attended').length;
  const noShows = bookings.filter(b => b.booking_status === 'no_show').length;
  const cancelled = bookings.filter(b => b.booking_status === 'cancelled').length;
  console.log(`   - Attended: ${attended}`);
  console.log(`   - No-shows: ${noShows}`);
  console.log(`   - Cancelled: ${cancelled}`);

  return bookings;
}

async function createPaymentHistory(organizationId, clients, memberships) {
  console.log('\n💰 Creating 6 months of payment history...');

  const payments = [];
  const now = new Date();

  // Create payments for each active membership
  const activeMemberships = memberships.filter(m => m.status === 'active');

  for (const membership of activeMemberships) {
    const client = clients.find(c => c.id === membership.client_id);
    if (!client) continue;

    const startDate = new Date(membership.start_date);
    const monthsActive = Math.floor((now - startDate) / (1000 * 60 * 60 * 24 * 30));
    const numPayments = Math.min(monthsActive, 6); // Up to 6 months

    // Determine if this client has payment issues (10% chance)
    const hasPaymentIssues = Math.random() < 0.10;

    for (let i = 0; i < numPayments; i++) {
      const paymentDate = new Date(startDate);
      paymentDate.setMonth(paymentDate.getMonth() + i);

      // Payment status
      let status;
      if (i === numPayments - 1 && hasPaymentIssues) {
        // Most recent payment failed for problem clients
        status = 'failed';
      } else if (hasPaymentIssues && Math.random() < 0.3) {
        // 30% of past payments failed for problem clients
        status = 'failed';
      } else {
        status = 'paid_out';
      }

      // Get plan price
      const { data: plan } = await supabase
        .from('membership_plans')
        .select('price')
        .eq('id', membership.plan_id)
        .single();

      const amount = plan?.price || 50;

      const { data, error } = await supabase
        .from('payments')
        .insert({
          organization_id: organizationId,
          client_id: client.id,
          amount: amount,
          currency: 'GBP',
          payment_status: status,
          payment_date: paymentDate.toISOString().split('T')[0],
          payment_provider: 'stripe',
          provider_payment_id: `demo_${crypto.randomUUID()}`,
          description: `${membership.billing_period} membership payment`,
          metadata: {
            membership_id: membership.id,
            demo_data: true
          }
        })
        .select()
        .single();

      if (!error) {
        payments.push(data);
      }
    }
  }

  console.log(`✅ Created ${payments.length} payment records`);

  const successful = payments.filter(p => p.payment_status === 'paid_out').length;
  const failed = payments.filter(p => p.payment_status === 'failed').length;
  console.log(`   - Successful: ${successful}`);
  console.log(`   - Failed: ${failed}`);

  return payments;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🚀 Starting demo account setup...\n');
  console.log('This will create:');
  console.log('- Demo organization "Demo Fitness Studio"');
  console.log('- Test user: test@test.co.uk / Test123');
  console.log('- 50 realistic clients');
  console.log('- 5 membership plans');
  console.log('- 8 class types');
  console.log('- 4 weeks of class schedule');
  console.log('- Realistic bookings and attendance');
  console.log('- 6 months of payment history');
  console.log('- Failed payments and no-shows');
  console.log('\n⏱️  This may take 2-3 minutes...\n');

  try {
    // Create organization
    const organization = await createDemoOrganization();

    // Create test user
    const user = await createDemoUser(organization.id);

    // Create membership plans
    const membershipPlans = await createMembershipPlans(organization.id);

    // Create class types
    const classTypes = await createClassTypes(organization.id);

    // Create clients
    const clients = await createClients(organization.id, membershipPlans);

    // Assign memberships
    const memberships = await assignMemberships(organization.id, clients, membershipPlans);

    // Create class schedule
    const sessions = await createClassSchedule(organization.id, classTypes);

    // Create bookings and attendance
    const bookings = await createBookingsAndAttendance(organization.id, clients, sessions);

    // Create payment history
    const payments = await createPaymentHistory(organization.id, clients, memberships);

    console.log('\n' + '='.repeat(60));
    console.log('✅ DEMO ACCOUNT SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Organization: ${organization.name} (${organization.slug})`);
    console.log(`   Clients: ${clients.length} (${clients.filter(c => c.hasMembership).length} active members)`);
    console.log(`   Membership Plans: ${membershipPlans.length}`);
    console.log(`   Class Types: ${classTypes.length}`);
    console.log(`   Class Sessions: ${sessions.length} (4 weeks)`);
    console.log(`   Bookings: ${bookings.length}`);
    console.log(`   Payments: ${payments.length} (6 months history)`);
    console.log('\n🔐 Login Details:');
    console.log('   URL: https://login.gymleadhub.co.uk');
    console.log('   Email: test@test.co.uk');
    console.log('   Password: Test123');
    console.log('\n💡 This demo showcases:');
    console.log('   ✓ Active members with various membership tiers');
    console.log('   ✓ Realistic class schedule and bookings');
    console.log('   ✓ Payment history with some failures');
    console.log('   ✓ No-show tracking for classes');
    console.log('   ✓ AI-ready data (lead scores, engagement metrics)');
    console.log('   ✓ Diverse client profiles for testing');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
