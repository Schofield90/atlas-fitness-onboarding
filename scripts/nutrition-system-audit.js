#!/usr/bin/env node

const { Client } = require('pg');

// Database connection
const connectionString = 'postgresql://postgres:@Aa80236661@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres';

async function auditNutritionSystem() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const issues = [];
  const warnings = [];
  const successes = [];

  try {
    console.log('🔍 COMPREHENSIVE NUTRITION SYSTEM AUDIT\n');
    console.log('=' .repeat(50));
    await client.connect();
    
    // 1. Check all required tables
    console.log('\n📊 CHECKING REQUIRED TABLES:');
    const requiredTables = [
      'nutrition_profiles',
      'meal_plans', 
      'meal_plan_days',
      'meals',
      'recipes',
      'ingredients',
      'nutrition_goals',
      'macro_tracking',
      'leads',
      'clients',
      'customers',
      'organizations',
      'organization_staff',
      'bookings',
      'class_credits'
    ];
    
    for (const table of requiredTables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        successes.push(`✅ Table '${table}' exists`);
      } else {
        issues.push(`❌ Table '${table}' is MISSING`);
      }
    }
    
    // 2. Check nutrition_profiles columns
    console.log('\n📋 CHECKING NUTRITION_PROFILES COLUMNS:');
    const requiredColumns = [
      'height', 'current_weight', 'goal_weight', 'sex', 'gender',
      'client_id', 'lead_id', 'organization_id', 'age',
      'bmr', 'tdee', 'target_calories', 'protein_grams', 'carbs_grams', 'fat_grams'
    ];
    
    const colResult = await client.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns 
      WHERE table_name = 'nutrition_profiles'
    `);
    
    const existingColumns = colResult.rows.map(r => r.column_name);
    
    for (const col of requiredColumns) {
      if (existingColumns.includes(col)) {
        const colInfo = colResult.rows.find(r => r.column_name === col);
        if (colInfo.is_nullable === 'NO' && ['height', 'current_weight', 'sex'].includes(col)) {
          warnings.push(`⚠️  Column '${col}' is NOT NULL - may cause insert errors`);
        } else {
          successes.push(`✅ Column '${col}' exists and configured properly`);
        }
      } else {
        issues.push(`❌ Column '${col}' is MISSING from nutrition_profiles`);
      }
    }
    
    // 3. Check organization_staff columns for 406 error
    console.log('\n🔧 CHECKING ORGANIZATION_STAFF COLUMNS:');
    const staffColumns = ['role', 'is_active', 'permissions', 'system_mode', 'visible_systems'];
    
    const staffResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'organization_staff'
    `);
    
    const staffExisting = staffResult.rows.map(r => r.column_name);
    
    for (const col of staffColumns) {
      if (staffExisting.includes(col)) {
        successes.push(`✅ organization_staff.${col} exists`);
      } else {
        issues.push(`❌ organization_staff.${col} is MISSING (causes 406 error)`);
      }
    }
    
    // 4. Check RLS policies
    console.log('\n🔒 CHECKING ROW LEVEL SECURITY:');
    const rlsTables = ['nutrition_profiles', 'meal_plans', 'organization_staff'];
    
    for (const table of rlsTables) {
      const rlsResult = await client.query(`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = $1
      `, [table]);
      
      if (rlsResult.rows.length > 0 && rlsResult.rows[0].relrowsecurity) {
        // Check if there are any policies
        const policyResult = await client.query(`
          SELECT COUNT(*) as policy_count
          FROM pg_policies 
          WHERE tablename = $1
        `, [table]);
        
        const policyCount = parseInt(policyResult.rows[0].policy_count);
        if (policyCount > 0) {
          successes.push(`✅ Table '${table}' has RLS enabled with ${policyCount} policies`);
        } else {
          warnings.push(`⚠️  Table '${table}' has RLS enabled but NO policies (will block all access)`);
        }
      } else {
        warnings.push(`⚠️  Table '${table}' has NO RLS enabled (security risk)`);
      }
    }
    
    // 5. Check for test data
    console.log('\n📊 CHECKING FOR EXISTING DATA:');
    const dataChecks = [
      { table: 'nutrition_profiles', name: 'Nutrition profiles' },
      { table: 'meal_plans', name: 'Meal plans' },
      { table: 'recipes', name: 'Recipes' },
      { table: 'ingredients', name: 'Ingredients' }
    ];
    
    for (const check of dataChecks) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${check.table}`);
        const count = parseInt(countResult.rows[0].count);
        if (count > 0) {
          successes.push(`✅ ${check.name}: ${count} records found`);
        } else {
          warnings.push(`⚠️  ${check.name}: No data found (table empty)`);
        }
      } catch (err) {
        // Table doesn't exist
        issues.push(`❌ Cannot count ${check.name} - table missing`);
      }
    }
    
    // 6. Check specific constraint issues
    console.log('\n⚙️  CHECKING CONSTRAINTS:');
    const constraintResult = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name IN ('nutrition_profiles', 'meal_plans', 'organization_staff')
        AND tc.constraint_type IN ('FOREIGN KEY', 'CHECK')
    `);
    
    const fkCount = constraintResult.rows.filter(r => r.constraint_type === 'FOREIGN KEY').length;
    const checkCount = constraintResult.rows.filter(r => r.constraint_type === 'CHECK').length;
    
    successes.push(`✅ Found ${fkCount} foreign key constraints`);
    if (checkCount > 0) {
      warnings.push(`⚠️  Found ${checkCount} CHECK constraints that may cause insert failures`);
    }
    
    // SUMMARY
    console.log('\n' + '=' .repeat(50));
    console.log('📊 AUDIT SUMMARY:\n');
    
    if (issues.length === 0) {
      console.log('🎉 NO CRITICAL ISSUES FOUND!');
    } else {
      console.log(`❌ CRITICAL ISSUES (${issues.length}):`);
      issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    if (warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
      warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    console.log(`\n✅ SUCCESSES (${successes.length}):`);
    successes.slice(0, 5).forEach(success => console.log(`   ${success}`));
    if (successes.length > 5) {
      console.log(`   ... and ${successes.length - 5} more`);
    }
    
    // RECOMMENDATIONS
    console.log('\n💡 RECOMMENDATIONS:');
    if (issues.some(i => i.includes('meal_plans') || i.includes('recipes'))) {
      console.log('1. Create missing meal/recipe tables for AI meal planning');
    }
    if (warnings.some(w => w.includes('RLS'))) {
      console.log('2. Review RLS policies to ensure proper access control');
    }
    if (warnings.some(w => w.includes('No data found'))) {
      console.log('3. Consider seeding initial recipe/ingredient data');
    }
    if (issues.some(i => i.includes('organization_staff'))) {
      console.log('4. Fix organization_staff columns to resolve 406 errors');
    }
    
    // Check environment variables
    console.log('\n🔑 ENVIRONMENT VARIABLES CHECK:');
    console.log('   Note: Cannot check from database, but ensure these are set in Vercel:');
    console.log('   - ANTHROPIC_API_KEY (for AI meal generation)');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL');
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY');
    
  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the audit
auditNutritionSystem();