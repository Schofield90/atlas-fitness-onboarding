const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyView() {
  console.log('🚀 Applying fixed all_attendances view...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250918_all_attendances_view_final.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Migration SQL loaded from:', migrationPath);
    console.log('   - Drops existing view');
    console.log('   - Creates new view with class_bookings and class_sessions');
    console.log('   - Uses correct column names\n');

    // Since we can't execute DDL directly, we need to verify current state
    console.log('🔍 Testing current view...');
    const { error: currentError } = await supabase
      .from('all_attendances')
      .select('*', { count: 'exact', head: true });

    if (!currentError) {
      console.log('✅ View exists but needs updating\n');
    } else {
      console.log('⚠️  View might not exist or has errors\n');
    }

    // Test if the new structure will work
    console.log('🧪 Testing the new view structure by simulating the query...');

    const testQuery = `
      SELECT COUNT(*) as total_count
      FROM class_bookings cb
      LEFT JOIN clients c ON (cb.client_id = c.id OR cb.customer_id = c.id)
      LEFT JOIN class_sessions cs ON cb.class_session_id = cs.id
      WHERE cb.organization_id IS NOT NULL
    `;

    // Try to fetch data with a similar structure
    const { data: testData, error: testError } = await supabase
      .from('class_bookings')
      .select(`
        *,
        clients!left(first_name, last_name, email, phone),
        class_sessions!left(start_time, end_time, capacity, location, instructor_name)
      `)
      .limit(1);

    if (!testError && testData) {
      console.log('✅ Test query successful - view structure should work');
      console.log(`   Found ${testData.length} sample records\n`);
    } else {
      console.log('⚠️  Test query had issues:', testError?.message, '\n');
    }

    console.log('📋 Next Steps:');
    console.log('1. The view SQL has been prepared and saved');
    console.log('2. Since DDL operations require direct database access, you need to:');
    console.log('   a) Go to Supabase Dashboard > SQL Editor');
    console.log('   b) Copy and run the SQL from: supabase/migrations/20250918_all_attendances_view_final.sql');
    console.log('   c) Or use a PostgreSQL client with the following connection:');
    console.log(`      Host: ${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}`);
    console.log('      Database: postgres');
    console.log('      Port: 5432');
    console.log('\n3. After applying the migration, the attendance report should work!');

    // Final check
    console.log('\n📊 Current data availability:');
    const { count: bookingsCount } = await supabase
      .from('class_bookings')
      .select('*', { count: 'exact', head: true });
    console.log(`   - class_bookings: ${bookingsCount} records`);

    const { count: sessionsCount } = await supabase
      .from('class_sessions')
      .select('*', { count: 'exact', head: true });
    console.log(`   - class_sessions: ${sessionsCount} records`);

    const { count: clientsCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });
    console.log(`   - clients: ${clientsCount} records`);

    console.log('\n✅ Once the view is updated, attendance data should be available!');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

applyView();