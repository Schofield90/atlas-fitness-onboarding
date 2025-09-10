#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const connectionString = 'postgresql://postgres:@Aa80236661@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres';

async function runMigration() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250910_fix_nutrition_and_related_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Running migration: 20250910_fix_nutrition_and_related_tables.sql');
    console.log('This will fix:');
    console.log('  - Missing tables (bookings, class_credits, leads)');
    console.log('  - nutrition_profiles column issues');
    console.log('  - organization_staff missing columns');
    console.log('');

    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration executed successfully!');
    
    // Verify tables exist
    console.log('\n📋 Verifying tables...');
    
    const tables = ['bookings', 'class_credits', 'leads', 'nutrition_profiles'];
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table} LIMIT 1`);
        console.log(`  ✅ Table '${table}' exists`);
      } catch (err) {
        console.log(`  ❌ Table '${table}' check failed: ${err.message}`);
      }
    }
    
    // Check nutrition_profiles columns
    console.log('\n📋 Checking nutrition_profiles columns...');
    try {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' 
        AND column_name IN ('client_id', 'lead_id')
      `);
      
      for (const row of result.rows) {
        console.log(`  ✅ Column '${row.column_name}' exists`);
      }
    } catch (err) {
      console.log(`  ❌ Column check failed: ${err.message}`);
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('🥗 The nutrition coach should now work correctly.');
    console.log('\nProduction URLs:');
    console.log('  - Main app: https://atlas-fitness-onboarding.vercel.app');
    console.log('  - Test page: https://atlas-fitness-onboarding.vercel.app/test-nutrition');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
runMigration();