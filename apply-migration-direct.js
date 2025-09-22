const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Use the direct database URL from .env
const DATABASE_URL = "postgres://postgres.lzlrojoaxrqvmhempnkn:OGFYlxSChyYLgQxn@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres";

async function applyMigration() {
  console.log('🔧 Applying password authentication database migration directly...');
  console.log('==================================================');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250922_add_client_password.sql');

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration SQL:');
    console.log(migrationSQL);

    // Execute the migration
    console.log('\n🔨 Executing migration...');
    const result = await pool.query(migrationSQL);

    console.log('✅ Migration executed successfully!');
    console.log('Result:', result);

    // Test that the columns exist
    console.log('\n🔍 Testing if columns were created...');
    const testQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'clients'
        AND column_name IN ('password_hash', 'password_set_at', 'password_reset_token', 'password_reset_expires')
      ORDER BY column_name;
    `;

    const testResult = await pool.query(testQuery);

    if (testResult.rows.length > 0) {
      console.log('✅ Password columns verified:');
      testResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('❌ No password columns found');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
applyMigration();