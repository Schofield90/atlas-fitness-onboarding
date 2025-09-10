#!/usr/bin/env node

const { Client } = require('pg');

// Database connection
const connectionString = 'postgresql://postgres:@Aa80236661@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres';

async function fixSexColumn() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('📄 Fixing sex column constraint...');
    
    // Make sex column nullable
    const query = `
      -- Make sex column nullable (it's currently NOT NULL which is causing the error)
      ALTER TABLE nutrition_profiles 
      ALTER COLUMN sex DROP NOT NULL;
      
      -- Also ensure gender column accepts the values we're sending
      ALTER TABLE nutrition_profiles 
      ALTER COLUMN gender TYPE TEXT;
    `;
    
    await client.query(query);
    console.log('✅ Fixed sex column - now nullable');
    
    // Verify the change
    const checkQuery = `
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'nutrition_profiles' 
      AND column_name IN ('sex', 'gender')
    `;
    
    const result = await client.query(checkQuery);
    console.log('\n📋 Column status:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}, nullable: ${row.is_nullable}`);
    });
    
    console.log('\n🎉 Fix applied successfully!');
    console.log('The nutrition profile should now save without errors.');
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the fix
fixSexColumn();