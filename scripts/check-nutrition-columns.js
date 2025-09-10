#!/usr/bin/env node

const { Client } = require('pg');

// Database connection
const connectionString = 'postgresql://postgres:@Aa80236661@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres';

async function checkColumns() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('📋 Checking ALL nutrition_profiles columns:');
    const nutritionCheck = `
      SELECT column_name, is_nullable, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'nutrition_profiles' 
      ORDER BY ordinal_position
    `;
    
    const nutritionResult = await client.query(nutritionCheck);
    nutritionResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}, nullable: ${row.is_nullable}, default: ${row.column_default || 'none'}`);
    });
    
    console.log('\n📋 Checking ALL organization_staff columns:');
    const staffCheck = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'organization_staff' 
      ORDER BY ordinal_position
    `;
    
    const staffResult = await client.query(staffCheck);
    staffResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}, nullable: ${row.is_nullable}`);
    });
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the check
checkColumns();