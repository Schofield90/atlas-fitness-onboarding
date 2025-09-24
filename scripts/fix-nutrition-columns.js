#!/usr/bin/env node

const { Client } = require('pg');

// Database connection
const connectionString = 'postgresql://postgres:${DB_PASSWORD}@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres';

async function fixColumns() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Fix 1: Make height and weight columns nullable in nutrition_profiles
    console.log('📄 Fixing nutrition_profiles columns...');
    
    const nutritionQuery = `
      -- Make height and weight columns nullable
      ALTER TABLE nutrition_profiles 
      ALTER COLUMN height DROP NOT NULL;
      
      ALTER TABLE nutrition_profiles 
      ALTER COLUMN weight DROP NOT NULL;
      
      -- Add height_cm and weight_kg columns if they don't exist
      ALTER TABLE nutrition_profiles 
      ADD COLUMN IF NOT EXISTS height_cm DECIMAL(10,2);
      
      ALTER TABLE nutrition_profiles 
      ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10,2);
      
      -- Add target_weight_kg if it doesn't exist
      ALTER TABLE nutrition_profiles 
      ADD COLUMN IF NOT EXISTS target_weight_kg DECIMAL(10,2);
    `;
    
    await client.query(nutritionQuery);
    console.log('✅ Fixed nutrition_profiles columns');
    
    // Fix 2: Add missing columns to organization_staff
    console.log('\n📄 Fixing organization_staff columns...');
    
    const staffQuery = `
      -- Add missing columns to organization_staff
      ALTER TABLE organization_staff 
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
      
      ALTER TABLE organization_staff 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
      
      ALTER TABLE organization_staff 
      ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
      
      ALTER TABLE organization_staff 
      ADD COLUMN IF NOT EXISTS system_mode TEXT DEFAULT 'full';
      
      ALTER TABLE organization_staff 
      ADD COLUMN IF NOT EXISTS visible_systems TEXT[] DEFAULT ARRAY['dashboard', 'leads', 'booking', 'settings'];
    `;
    
    await client.query(staffQuery);
    console.log('✅ Fixed organization_staff columns');
    
    // Verify the changes
    console.log('\n📋 Verifying nutrition_profiles columns:');
    const nutritionCheck = `
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'nutrition_profiles' 
      AND column_name IN ('height', 'weight', 'height_cm', 'weight_kg', 'target_weight_kg', 'sex')
      ORDER BY column_name
    `;
    
    const nutritionResult = await client.query(nutritionCheck);
    nutritionResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}, nullable: ${row.is_nullable}`);
    });
    
    console.log('\n📋 Verifying organization_staff columns:');
    const staffCheck = `
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'organization_staff' 
      AND column_name IN ('role', 'is_active', 'permissions', 'system_mode', 'visible_systems')
      ORDER BY column_name
    `;
    
    const staffResult = await client.query(staffCheck);
    staffResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n🎉 All fixes applied successfully!');
    console.log('The nutrition coach should now work without errors.');
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the fix
fixColumns();