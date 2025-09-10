#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNutritionTables() {
  console.log('Checking nutrition system tables...\n');
  
  const tables = [
    'nutrition_profiles',
    'nutrition_preferences',
    'meal_plans',
    'meal_plan_meals',
    'meal_ingredients',
    'meal_feedback',
    'meal_substitutions',
    'shopping_lists',
    'nutrition_logs'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Table exists`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  console.log('\nChecking if migration was applied...');
  
  // Check schema_migrations table
  const { data: migrations, error: migError } = await supabase
    .from('schema_migrations')
    .select('*')
    .like('filename', '%nutrition%')
    .order('filename', { ascending: false });
  
  if (migError) {
    console.log('Could not check schema_migrations:', migError.message);
  } else if (migrations && migrations.length > 0) {
    console.log('\nNutrition-related migrations found:');
    migrations.forEach(m => console.log(`  - ${m.filename}`));
  } else {
    console.log('No nutrition migrations found in schema_migrations');
  }
}

checkNutritionTables();