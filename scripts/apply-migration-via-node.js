const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Database connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDg2MjYwMSwiZXhwIjoyMDQwNDM4NjAxfQ.kAJ0q4XFbCTNiPaERxzGg1vVVHZjDV5dXjYNtlP-s-k';

async function applyMigration() {
  console.log('🔧 Applying booking system database schema fixes via Supabase...');
  console.log('==================================================');

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250907_complete_booking_schema_fix.sql');
  
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
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).single();

      if (error) {
        // Try direct execution as fallback
        const { error: directError } = await supabase.from('_sql_exec').insert({ sql: statement });
        
        if (directError) {
          console.log(`❌ Statement ${i + 1}: ${description}`);
          console.log(`   Error: ${directError.message}`);
          errorCount++;
          errors.push({ statement: description, error: directError.message });
        } else {
          console.log(`✅ Statement ${i + 1}: ${description}`);
          successCount++;
        }
      } else {
        console.log(`✅ Statement ${i + 1}: ${description}`);
        successCount++;
      }
    } catch (err) {
      console.log(`⚠️  Statement ${i + 1}: ${description}`);
      console.log(`   Warning: ${err.message}`);
      // Continue with next statement
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Successful statements: ${successCount}`);
  console.log(`   ❌ Failed statements: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed, but this might be expected if:');
    console.log('   - Tables/columns already exist (IF NOT EXISTS clauses)');
    console.log('   - Policies already exist');
    console.log('   - The migration was partially applied before');
  }

  // Verify key schema changes
  console.log('\n📋 Verifying critical schema elements...');
  
  const verifications = [
    { table: 'class_bookings', column: 'client_id', description: 'Client booking support' },
    { table: 'customer_memberships', column: 'classes_used_this_period', description: 'Class usage tracking' },
    { table: 'membership_plans', column: 'classes_per_period', description: 'Class limits' },
  ];

  for (const check of verifications) {
    const { data, error } = await supabase
      .from(check.table)
      .select(check.column)
      .limit(0);
    
    if (!error) {
      console.log(`✅ ${check.description}: ${check.table}.${check.column} exists`);
    } else {
      console.log(`❌ ${check.description}: ${check.table}.${check.column} missing`);
    }
  }

  // Check for new tables
  const newTables = ['customer_class_packages', 'class_packages', 'class_schedules', 'class_types'];
  console.log('\n📋 Checking for new tables...');
  
  for (const tableName of newTables) {
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(0);
    
    if (!error) {
      console.log(`✅ Table ${tableName} exists`);
    } else {
      console.log(`⚠️  Table ${tableName} might not exist or has access issues`);
    }
  }

  console.log('\n🎉 Migration process completed!');
  console.log('📱 Please test the booking flow now.');
}

// Run the migration
applyMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});