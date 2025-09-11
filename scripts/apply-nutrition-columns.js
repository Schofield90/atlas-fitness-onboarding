const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndAddColumns() {
  try {
    console.log('Checking clients table structure...');
    
    // Try to select a client with the new columns
    const { data, error } = await supabase
      .from('clients')
      .select('id, height_cm, weight_kg, activity_level, dietary_type')
      .limit(1);
    
    if (error) {
      console.log('Some columns are missing, will add them...');
      console.log('Error details:', error.message);
      
      // The columns don't exist, we need to add them via SQL
      // Since we can't run raw SQL directly, we'll need to use Supabase dashboard
      console.log('\n⚠️  IMPORTANT: The nutrition columns need to be added to the clients table.');
      console.log('\nPlease run this SQL in your Supabase dashboard SQL editor:\n');
      
      const sql = `
-- Add nutrition and fitness fields to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fitness_goal TEXT CHECK (fitness_goal IN ('lose_weight', 'maintain', 'gain_muscle', 'improve_fitness', 'athletic_performance')),
ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
ADD COLUMN IF NOT EXISTS dietary_type TEXT CHECK (dietary_type IN ('balanced', 'vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean', 'low_carb', 'high_protein')),
ADD COLUMN IF NOT EXISTS allergies TEXT[],
ADD COLUMN IF NOT EXISTS cooking_time TEXT CHECK (cooking_time IN ('minimal', 'moderate', 'extensive')),
ADD COLUMN IF NOT EXISTS meals_per_day INTEGER DEFAULT 3 CHECK (meals_per_day BETWEEN 2 AND 6),
ADD COLUMN IF NOT EXISTS target_calories INTEGER,
ADD COLUMN IF NOT EXISTS protein_grams INTEGER,
ADD COLUMN IF NOT EXISTS carbs_grams INTEGER,
ADD COLUMN IF NOT EXISTS fat_grams INTEGER,
ADD COLUMN IF NOT EXISTS bmr DECIMAL(7,2),
ADD COLUMN IF NOT EXISTS tdee DECIMAL(7,2),
ADD COLUMN IF NOT EXISTS bmi DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS nutrition_profile_completed BOOLEAN DEFAULT FALSE;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_nutrition_completed ON public.clients(nutrition_profile_completed);
`;
      
      console.log(sql);
      console.log('\n📋 Copy the SQL above and run it in: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql/new');
      
    } else {
      console.log('✅ All nutrition columns exist in the clients table!');
      
      // Check if we can update a client with these fields
      const testClient = data && data[0];
      if (testClient) {
        console.log('\nTesting update with nutrition fields...');
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            activity_level: 'moderately_active',
            dietary_type: 'balanced',
            meals_per_day: 3
          })
          .eq('id', testClient.id);
        
        if (updateError) {
          console.log('❌ Error updating client:', updateError);
        } else {
          console.log('✅ Successfully tested update with nutrition fields!');
        }
      }
    }
    
  } catch (error) {
    console.error('Error checking columns:', error);
  }
}

checkAndAddColumns();