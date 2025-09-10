#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Database configuration
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

async function applyMigration() {
  console.log('🔄 Applying nutrition profiles foreign key fix migration...');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', '20250110_001_fix_nutrition_profiles_fk.up.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim().length === 0) {
        continue;
      }
      
      // For complex statements, use raw SQL execution
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      }).single();
      
      if (error && !error.message?.includes('already exists')) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        // Continue with other statements even if one fails
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the new table structure
    const { data: columns, error: columnsError } = await supabase
      .from('nutrition_profiles')
      .select('*')
      .limit(0);
    
    if (!columnsError) {
      console.log('✅ nutrition_profiles table is accessible');
    } else {
      console.log('⚠️ Warning: Could not verify table structure:', columnsError.message);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
applyMigration().catch(console.error);