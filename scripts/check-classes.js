const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkClassesAndPrograms() {
  console.log('🔍 Checking class sessions and programs...\n');
  
  try {
    // Check if there are any programs
    const { data: programs, error: programError } = await supabase
      .from('programs')
      .select('id, name, organization_id, max_capacity, default_capacity')
      .limit(10);

    if (programError) {
      console.error('Error fetching programs:', programError);
    } else {
      console.log(`📚 Found ${programs?.length || 0} programs`);
      if (programs && programs.length > 0) {
        console.log('Sample programs:');
        programs.forEach(p => {
          console.log(`  - ${p.name} (Org: ${p.organization_id}, Capacity: ${p.max_capacity || p.default_capacity || 'Not set'})`);
        });
      }
    }

    console.log('\n');

    // Check if there are any class_sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('class_sessions')
      .select('id, start_time, organization_id, program_id, max_capacity, capacity, instructor_name')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(10);

    if (sessionError) {
      console.error('Error fetching class sessions:', sessionError);
    } else {
      console.log(`📅 Found ${sessions?.length || 0} upcoming class sessions`);
      if (sessions && sessions.length > 0) {
        console.log('Upcoming classes:');
        sessions.forEach(s => {
          const date = new Date(s.start_time);
          console.log(`  - ${date.toLocaleDateString()} ${date.toLocaleTimeString()} - Instructor: ${s.instructor_name || 'N/A'}, Capacity: ${s.max_capacity || s.capacity || 'Not set'}`);
        });
      }
    }

    console.log('\n');

    // Check organizations
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(5);

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
    } else {
      console.log(`🏢 Found ${orgs?.length || 0} organizations`);
      if (orgs && orgs.length > 0) {
        console.log('Organizations:');
        orgs.forEach(o => {
          console.log(`  - ${o.name} (${o.id})`);
        });
      }
    }

    // Check if capacity columns exist
    console.log('\n📊 Checking column structure...');
    const { data: testCapacity, error: capacityError } = await supabase
      .from('class_sessions')
      .select('id, max_capacity, capacity')
      .limit(1);

    if (capacityError) {
      if (capacityError.message.includes('max_capacity') || capacityError.message.includes('capacity')) {
        console.log('❌ Capacity columns may not exist. Run this SQL:');
        console.log('```sql');
        console.log('ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 20;');
        console.log('ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 20;');
        console.log('ALTER TABLE programs ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 20;');
        console.log('ALTER TABLE programs ADD COLUMN IF NOT EXISTS default_capacity INTEGER DEFAULT 20;');
        console.log('```');
      } else {
        console.error('Error checking capacity columns:', capacityError);
      }
    } else {
      console.log('✅ Capacity columns exist');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkClassesAndPrograms();