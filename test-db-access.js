#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Using the new password you provided
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Check nutrition_plans table
    const { data: nutritionPlans, error: nutritionError } = await supabase
      .from('nutrition_plans')
      .select('id, client_id, created_at')
      .limit(5);
    
    if (nutritionError) {
      console.error('Error accessing nutrition_plans:', nutritionError);
    } else {
      console.log('\n✅ Successfully accessed nutrition_plans table');
      console.log(`Found ${nutritionPlans?.length || 0} nutrition plans`);
    }

    // Test 2: Check clients table
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email')
      .limit(5);
    
    if (clientsError) {
      console.error('Error accessing clients:', clientsError);
    } else {
      console.log('\n✅ Successfully accessed clients table');
      console.log(`Found ${clients?.length || 0} clients`);
    }

    // Test 3: Check organizations table
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(5);
    
    if (orgsError) {
      console.error('Error accessing organizations:', orgsError);
    } else {
      console.log('\n✅ Successfully accessed organizations table');
      console.log(`Found ${orgs?.length || 0} organizations`);
    }

    // Test 4: Check nutrition-related tables structure
    const { data: mealPlans, error: mealError } = await supabase
      .from('meal_plans')
      .select('*')
      .limit(1);
    
    if (mealError) {
      console.log('\n⚠️  meal_plans table might not exist yet:', mealError.message);
    } else {
      console.log('\n✅ meal_plans table exists');
    }

    const { data: macros, error: macrosError } = await supabase
      .from('macro_tracking')
      .select('*')
      .limit(1);
    
    if (macrosError) {
      console.log('⚠️  macro_tracking table might not exist yet:', macrosError.message);
    } else {
      console.log('✅ macro_tracking table exists');
    }

    console.log('\n🎉 Database connection test completed!');
    
  } catch (error) {
    console.error('Connection test failed:', error);
  }
}

testConnection();