const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Database connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

async function applyMigration() {
  console.log('🔧 Applying password authentication database migration...');
  console.log('==================================================');

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250922_add_client_password.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Split migration into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`📄 Executing ${statements.length} SQL statements...`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip pure comment lines
    if (statement.trim().startsWith('--')) continue;

    // Extract a description from the statement
    const firstLine = statement.split('\n')[0];
    const description = firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;

    console.log(`\n[${i + 1}/${statements.length}] Executing: ${description}`);

    try {
      // Skip comment statements as they don't work with Supabase API
      if (statement.trim().toUpperCase().startsWith('COMMENT ON')) {
        console.log('⏭️  Skipping comment statement');
        continue;
      }

      // Use the raw SQL execution approach
      const { data, error } = await supabase.rpc('execute_sql', {
        query: statement
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
        statement: description,
        error: error.message
      });

      // For migration that adds columns, we can continue even if column already exists
      if (error.message && error.message.includes('already exists')) {
        console.log('ℹ️  Column already exists, continuing...');
        errorCount--;
        successCount++;
      }
    }
  }

  console.log('\n==================================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful statements: ${successCount}`);
  console.log(`   ❌ Failed statements: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach((e, idx) => {
      console.log(`   ${idx + 1}. ${e.statement}`);
      console.log(`      Error: ${e.error}`);
    });
  }

  if (errorCount === 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('🔒 Password authentication is now available for clients.');
  } else {
    console.log('\n⚠️  Migration completed with errors.');
    console.log('   Please review the errors above and fix any issues.');
  }
}

// Run the migration
applyMigration().catch(console.error);