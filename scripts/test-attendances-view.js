const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAttendancesView() {
  console.log('🧪 Testing all_attendances view...\n');

  try {
    // 1. Test if view exists and is accessible
    console.log('1️⃣ Testing view accessibility...');
    const { data: viewTest, error: viewError } = await supabase
      .from('all_attendances')
      .select('*', { count: 'exact', head: true });

    if (viewError) {
      console.error('❌ View is not accessible:', viewError.message);
      return;
    }
    console.log('✅ View is accessible\n');

    // 2. Get total count of records
    console.log('2️⃣ Checking total records...');
    const { count } = await supabase
      .from('all_attendances')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total records in view: ${count || 0}\n`);

    // 3. Get sample data
    if (count > 0) {
      console.log('3️⃣ Fetching sample data...');
      const { data: sampleData, error: sampleError } = await supabase
        .from('all_attendances')
        .select('*')
        .limit(5);

      if (sampleError) {
        console.error('❌ Error fetching sample data:', sampleError.message);
      } else if (sampleData && sampleData.length > 0) {
        console.log(`✅ Retrieved ${sampleData.length} sample records`);
        console.log('\n📋 Sample record structure:');
        const firstRecord = sampleData[0];
        Object.keys(firstRecord).forEach(key => {
          const value = firstRecord[key];
          const displayValue = value === null ? 'null' :
                              typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' :
                              String(value).substring(0, 50);
          console.log(`   ${key}: ${displayValue}`);
        });
      }
    } else {
      console.log('⚠️  No records found in the view\n');

      // 4. Check underlying tables
      console.log('4️⃣ Checking underlying tables for data...');

      // Check bookings table
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });
      console.log(`   📚 Bookings table: ${bookingsCount || 0} records`);

      // Check clients table
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      console.log(`   👥 Clients table: ${clientsCount || 0} records`);

      // Check class_sessions table
      const { count: sessionsCount } = await supabase
        .from('class_sessions')
        .select('*', { count: 'exact', head: true });
      console.log(`   📅 Class sessions table: ${sessionsCount || 0} records`);

      // Check classes table
      const { count: classesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true });
      console.log(`   🏋️ Classes table: ${classesCount || 0} records`);

      console.log('\n💡 Diagnosis:');
      if (bookingsCount === 0) {
        console.log('   ❌ No bookings exist - this is why attendance report is empty');
        console.log('   📝 Solution: Create some test bookings first');
      } else if (clientsCount === 0) {
        console.log('   ❌ No clients exist - bookings need clients');
        console.log('   📝 Solution: Create some test clients first');
      } else if (sessionsCount === 0) {
        console.log('   ❌ No class sessions exist - bookings need sessions');
        console.log('   📝 Solution: Create some class sessions first');
      } else if (classesCount === 0) {
        console.log('   ❌ No classes exist - sessions need classes');
        console.log('   📝 Solution: Create some classes first');
      } else {
        console.log('   ⚠️  Data exists but view might have join issues');
        console.log('   📝 Solution: Check that bookings have valid foreign keys');
      }
    }

    // 5. Test with a specific organization if we have data
    console.log('\n5️⃣ Testing organization filtering...');
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1)
      .single();

    if (orgData) {
      console.log(`   Testing with org: ${orgData.name} (${orgData.id})`);
      const { data: orgAttendances, count: orgCount } = await supabase
        .from('all_attendances')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgData.id)
        .limit(5);

      console.log(`   📊 Records for this org: ${orgCount || 0}`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }

  console.log('\n✅ Test completed');
}

// Run the test
testAttendancesView();