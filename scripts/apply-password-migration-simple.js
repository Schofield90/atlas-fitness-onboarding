const { createClient } = require('@supabase/supabase-js');

// Database connection
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

async function applyMigration() {
  console.log('🔧 Applying password authentication database migration...');
  console.log('==================================================');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Define the exact SQL statements to execute
  const migrations = [
    {
      name: "Add password fields to clients table",
      sql: `ALTER TABLE clients
        ADD COLUMN IF NOT EXISTS password_hash TEXT,
        ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
        ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;`
    },
    {
      name: "Create index for password reset tokens",
      sql: `CREATE INDEX IF NOT EXISTS idx_clients_password_reset_token
        ON clients(password_reset_token)
        WHERE password_reset_token IS NOT NULL;`
    }
  ];

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    console.log(`\n[${i + 1}/${migrations.length}] ${migration.name}...`);

    try {
      // Try using a PostgreSQL client directly via Supabase
      const { error } = await supabase.rpc('execute_sql', {
        query: migration.sql
      });

      if (error) {
        throw error;
      }

      successCount++;
      console.log('✅ Success');
    } catch (error) {
      errorCount++;
      console.error('❌ Error:', error.message);
      errors.push({
        name: migration.name,
        error: error.message
      });

      // For migration that adds columns, we can continue even if column already exists
      if (error.message && error.message.includes('already exists')) {
        console.log('ℹ️  Already exists, continuing...');
        errorCount--;
        successCount++;
      }
    }
  }

  console.log('\n==================================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful migrations: ${successCount}`);
  console.log(`   ❌ Failed migrations: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach((e, idx) => {
      console.log(`   ${idx + 1}. ${e.name}`);
      console.log(`      Error: ${e.error}`);
    });
  }

  if (errorCount === 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('🔒 Password authentication is now available for clients.');

    // Test if the columns exist
    console.log('\n🔍 Testing if columns were created...');
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, password_hash, password_set_at')
        .limit(1);

      if (error) {
        console.log('⚠️  Could not verify columns:', error.message);
      } else {
        console.log('✅ Columns verified successfully!');
      }
    } catch (testError) {
      console.log('⚠️  Column verification failed:', testError.message);
    }
  } else {
    console.log('\n⚠️  Migration completed with errors.');
    console.log('   Please review the errors above and fix any issues.');
  }
}

// Run the migration
applyMigration().catch(console.error);