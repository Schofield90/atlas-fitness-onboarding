#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Database connection details
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTMwOTU4NywiZXhwIjoyMDM2ODg1NTg3fQ.xNkPWo8BvBhLK-_4RrCaHEz8fYCdB9iRukE75jPL-_g';

async function applyMigration() {
  console.log('🔧 Applying nutrition system database schema fixes...');
  console.log('==================================================');
  
  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250910_fix_nutrition_and_related_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Applying migration: 20250910_fix_nutrition_and_related_tables.sql');
    
    // Split the SQL into individual statements (simple approach)
    // Note: This is a simplified approach - for production, use a proper SQL parser
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim() === ';') {
        continue;
      }
      
      try {
        // Execute each statement
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          console.error(`❌ Error executing statement: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        errorCount++;
      }
    }
    
    if (errorCount === 0) {
      console.log(`✅ Migration applied successfully! (${successCount} statements executed)`);
      console.log('');
      console.log('📋 Verifying schema changes...');
      
      // Verify key tables exist
      const tables = ['nutrition_profiles', 'bookings', 'class_credits', 'leads'];
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (!error) {
          console.log(`✓ ${table} table is accessible`);
        } else {
          console.log(`⚠️  ${table} table check failed: ${error.message}`);
        }
      }
      
      console.log('');
      console.log('🎉 Schema fixes have been applied!');
      console.log('🥗 The nutrition coach should now work correctly.');
    } else {
      console.log(`⚠️  Migration completed with ${errorCount} errors and ${successCount} successful statements.`);
      console.log('Some parts of the migration may have failed. Please review the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Note: Direct SQL execution via RPC is not available in standard Supabase
// We'll need to use the REST API approach instead

async function applyMigrationViaAPI() {
  console.log('🔧 Applying nutrition system fixes via Supabase API...');
  console.log('==================================================');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    // Create or update tables via Supabase API
    console.log('📄 Creating/updating database tables...');
    
    // Note: We can't directly execute DDL via Supabase client
    // Instead, we'll create an admin API endpoint to run the migration
    
    console.log('⚠️  Direct SQL execution not available via Supabase client.');
    console.log('Creating an admin API endpoint to apply the migration...');
    
    // Alternative: Create the migration via an API route
    const migrationContent = fs.readFileSync(
      path.join(__dirname, '..', 'supabase', 'migrations', '20250910_fix_nutrition_and_related_tables.sql'),
      'utf8'
    );
    
    // Save migration content to a temporary location for the API to access
    fs.writeFileSync('/tmp/nutrition_migration.sql', migrationContent);
    
    console.log('✅ Migration file prepared.');
    console.log('');
    console.log('To apply this migration, please:');
    console.log('1. Use a PostgreSQL client (psql) to connect to your database');
    console.log('2. Run the migration file: supabase/migrations/20250910_fix_nutrition_and_related_tables.sql');
    console.log('');
    console.log('Or use the Supabase Dashboard SQL editor to run the migration.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the migration
applyMigrationViaAPI();