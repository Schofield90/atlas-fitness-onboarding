#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const connectionConfig = {
  host: 'db.lzlrojoaxrqvmhempnkn.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'OGFYlxSChyYLgQxn',
  ssl: { rejectUnauthorized: false }
};

async function applyMigration() {
  const client = new Client(connectionConfig);
  
  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250110_add_client_id_to_nutrition_profiles.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Applying migration to add client_id support...');
    
    // Execute the entire migration as a single transaction
    await client.query('BEGIN');
    
    try {
      await client.query(migrationSQL);
      await client.query('COMMIT');
      console.log('✅ Migration applied successfully!');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
    // Verify the table structure
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'nutrition_profiles' 
      AND column_name IN ('client_id', 'lead_id', 'sex', 'gender', 'height', 'height_cm', 'current_weight', 'weight_kg')
      ORDER BY column_name;
    `;
    
    const { rows: columns } = await client.query(columnsQuery);
    console.log('\n📊 Current nutrition_profiles columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check constraints
    const constraintsQuery = `
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'nutrition_profiles'
      AND constraint_type IN ('CHECK', 'UNIQUE')
      ORDER BY constraint_name;
    `;
    
    const { rows: constraints } = await client.query(constraintsQuery);
    console.log('\n🔒 Table constraints:');
    constraints.forEach(con => {
      console.log(`  - ${con.constraint_name}: ${con.constraint_type}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔚 Database connection closed');
  }
}

// Run the migration
console.log('🚀 Starting nutrition profiles client_id migration...\n');
applyMigration().catch(console.error);