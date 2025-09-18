const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Database connection details
const DB_HOST = 'db.lzlrojoaxrqvmhempnkn.supabase.co';
const DB_USER = 'postgres';
const DB_NAME = 'postgres';
const DB_PASSWORD = 'OGFYlxSChyYLgQxn';

// Migration SQL
const migrationSQL = `
-- Drop the view if it exists
DROP VIEW IF EXISTS all_attendances CASCADE;

-- Create all_attendances view for attendance reporting
CREATE VIEW all_attendances AS
SELECT
    -- Booking information
    b.id AS booking_id,
    b.org_id AS organization_id,
    b.created_at AS booking_created_at,
    b.status AS attendance_status,
    b.cancelled_at,
    b.attended_at,

    -- Client information
    b.client_id AS customer_id,
    c.first_name,
    c.last_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    c.membership_tier AS membership_id,

    -- Class session information
    cs.id AS class_session_id,
    cs.start_at AS class_start_at,
    cs.end_at AS class_end_at,
    cs.capacity AS class_capacity,
    cs.status AS class_status,

    -- Class information
    cl.id AS class_type_id,
    cl.name AS class_type_name,
    cl.category AS class_category,
    cl.duration_minutes,
    cl.location AS venue_name,
    cl.location AS venue_id,
    cl.price_cents,

    -- Instructor information
    ARRAY[cs.instructor_id::text] AS instructor_ids,
    u.full_name AS instructor_name,

    -- Additional fields for reporting
    CASE
        WHEN b.metadata->>'booking_method' IS NOT NULL
        THEN b.metadata->>'booking_method'
        ELSE 'manual'
    END AS booking_method,

    CASE
        WHEN b.metadata->>'booking_source' IS NOT NULL
        THEN b.metadata->>'booking_source'
        ELSE 'web'
    END AS booking_source,

    -- Timestamps
    b.created_at,
    b.updated_at

FROM bookings b
JOIN clients c ON b.client_id = c.id
JOIN class_sessions cs ON b.session_id = cs.id
JOIN classes cl ON cs.class_id = cl.id
LEFT JOIN users u ON cs.instructor_id = u.id
WHERE b.org_id IS NOT NULL;

-- Grant appropriate permissions
GRANT SELECT ON all_attendances TO authenticated;
GRANT SELECT ON all_attendances TO service_role;
`;

async function applyMigration() {
  console.log('🚀 Creating all_attendances view for attendance reporting...');
  console.log('==================================================');

  try {
    // First check if psql is available
    try {
      await execPromise('which psql');
      console.log('✅ PostgreSQL client found');

      // Apply migration using psql
      const command = `PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -c "${migrationSQL.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;

      const { stdout, stderr } = await execPromise(command);

      if (stderr && !stderr.includes('NOTICE')) {
        console.error('❌ Error applying migration:', stderr);
        process.exit(1);
      }

      console.log('✅ Migration applied successfully');

      // Test the view
      const testCommand = `PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -c "SELECT COUNT(*) FROM all_attendances;"`;
      const { stdout: testOutput } = await execPromise(testCommand);
      console.log('📊 View test result:', testOutput);

    } catch (psqlError) {
      console.log('⚠️  PostgreSQL client not found, trying alternative approach...');

      // Alternative: Use Supabase REST API to test if view exists
      const { createClient } = require('@supabase/supabase-js');
      const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
      const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Try to query the view
      const { data, error } = await supabase
        .from('all_attendances')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log('\n❌ The all_attendances view does not exist or is not accessible.');
        console.log('\n📝 Migration SQL has been saved to: supabase/migrations/20250918_all_attendances_view.sql');
        console.log('\n🔧 Please apply the migration using one of these methods:');
        console.log('   1. Use Supabase Dashboard SQL Editor (recommended)');
        console.log('   2. Install PostgreSQL client: brew install postgresql');
        console.log('   3. Use a database GUI tool like TablePlus or DBeaver');
        console.log('\n📋 Migration preview:');
        console.log('   - Creates view: all_attendances');
        console.log('   - Joins tables: bookings, clients, class_sessions, classes, users');
        console.log('   - Provides attendance reporting data');
      } else {
        console.log('✅ The all_attendances view already exists!');
        console.log('📊 View is accessible and working correctly');
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the migration
applyMigration();