import { createClient } from '@supabase/supabase-js';

// This script sets up the booking system quickly for testing

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function quickSetup() {
  console.log('🚀 Quick setup for booking system...\n');

  // First, let's create sample programs via API endpoint
  const programs = [
    {
      name: 'Morning HIIT',
      description: 'High-intensity interval training to start your day',
      price_pennies: 1500,
      max_participants: 15,
      program_type: 'ongoing'
    },
    {
      name: 'Strength Training',
      description: 'Build muscle and strength with expert guidance',
      price_pennies: 2000,
      max_participants: 10,
      program_type: 'ongoing'
    },
    {
      name: 'Yoga Flow',
      description: 'Relaxing yoga session for all levels',
      price_pennies: 1200,
      max_participants: 20,
      program_type: 'ongoing'
    }
  ];

  console.log('Creating programs...');
  
  // Get organization
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id')
    .limit(1);

  if (!orgs || orgs.length === 0) {
    console.log('❌ No organization found. Please login first.');
    return;
  }

  const orgId = orgs[0].id;

  // Create programs
  for (const program of programs) {
    const { error } = await supabase
      .from('programs')
      .insert({
        ...program,
        organization_id: orgId,
        is_active: true
      });

    if (!error) {
      console.log(`✅ Created program: ${program.name}`);
    }
  }

  console.log('\n✨ Quick setup complete!');
  console.log('\nNext steps:');
  console.log('1. Navigate to http://localhost:3000/booking/admin');
  console.log('2. Add some class sessions using the admin interface');
  console.log('3. Go to http://localhost:3000/booking to book classes');
}

quickSetup().catch(console.error);