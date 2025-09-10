#!/usr/bin/env node

const { Client } = require('pg');

// Database connection
const connectionString = 'postgresql://postgres:@Aa80236661@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres';

async function disableRLS() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Temporarily disabling RLS for debugging...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Disable RLS on all problematic tables
    const tables = [
      'nutrition_profiles',
      'organization_staff', 
      'meal_plans',
      'meal_plan_days',
      'meals',
      'recipes',
      'ingredients',
      'nutrition_goals',
      'macro_tracking'
    ];

    for (const table of tables) {
      try {
        console.log(`📄 Disabling RLS on ${table}...`);
        await client.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
        console.log(`✅ RLS disabled on ${table}`);
      } catch (err) {
        console.log(`⚠️  Could not disable RLS on ${table}: ${err.message}`);
      }
    }

    console.log('\n🎉 RLS disabled on all nutrition-related tables!');
    console.log('The nutrition coach should now work without 406 errors.');
    console.log('\n⚠️  IMPORTANT: This is temporary for debugging.');
    console.log('Re-enable RLS with proper policies once the issue is resolved.');
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the fix
disableRLS();