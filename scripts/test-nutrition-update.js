const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testNutritionUpdate() {
  try {
    console.log('Testing nutrition fields update...\n');
    
    // Get a client to test with
    const { data: clients, error: fetchError } = await supabase
      .from('clients')
      .select('id, first_name, last_name, height_cm, weight_kg, fitness_goal')
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching client:', fetchError);
      return;
    }
    
    if (!clients || clients.length === 0) {
      console.log('No clients found to test with');
      return;
    }
    
    const testClient = clients[0];
    console.log('Testing with client:', testClient.first_name, testClient.last_name);
    console.log('Current nutrition data:', {
      height_cm: testClient.height_cm,
      weight_kg: testClient.weight_kg,
      fitness_goal: testClient.fitness_goal
    });
    
    // Test updating nutrition fields
    const testData = {
      height_cm: 175,
      weight_kg: 75.5,
      fitness_goal: 'maintain',
      activity_level: 'moderately_active',
      dietary_type: 'balanced',
      allergies: ['nuts', 'dairy'],
      cooking_time: 'moderate',
      meals_per_day: 3,
      target_calories: 2500,
      protein_grams: 150,
      carbs_grams: 280,
      fat_grams: 85,
      bmr: 1750.5,
      tdee: 2712.5,
      bmi: 24.7,
      nutrition_profile_completed: true
    };
    
    console.log('\nUpdating with test nutrition data...');
    const { error: updateError } = await supabase
      .from('clients')
      .update(testData)
      .eq('id', testClient.id);
    
    if (updateError) {
      console.error('❌ Error updating nutrition fields:', updateError);
      return;
    }
    
    console.log('✅ Successfully updated nutrition fields!');
    
    // Verify the update
    const { data: updatedClient, error: verifyError } = await supabase
      .from('clients')
      .select('height_cm, weight_kg, fitness_goal, activity_level, dietary_type, allergies, cooking_time, meals_per_day, target_calories, protein_grams, carbs_grams, fat_grams, bmr, tdee, bmi, nutrition_profile_completed')
      .eq('id', testClient.id)
      .single();
    
    if (verifyError) {
      console.error('Error verifying update:', verifyError);
      return;
    }
    
    console.log('\n✅ Verified updated data:');
    console.log(JSON.stringify(updatedClient, null, 2));
    
    console.log('\n🎉 All nutrition fields are working correctly!');
    console.log('The profile page should now save all nutrition data without errors.');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testNutritionUpdate();