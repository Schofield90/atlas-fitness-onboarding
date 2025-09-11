const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFix() {
  try {
    console.log('Testing meal_plans table structure...');
    
    // Try to query the table to see what columns exist
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Current error:', error);
    } else {
      console.log('Table is accessible, columns exist:', data ? Object.keys(data[0] || {}) : 'No data');
    }
    
    // For now, let's just update our API to use the correct column names
    console.log('\nThe table uses these column names:');
    console.log('- nutrition_profile_id (not profile_id)');
    console.log('- Use daily_calories, daily_protein, daily_carbs, daily_fat');
    console.log('\nWe need to update the API to match the existing schema.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

applyFix();