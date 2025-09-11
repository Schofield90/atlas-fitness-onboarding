const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createRecipesTable() {
  try {
    console.log('🔧 Creating recipes table in Supabase...');
    
    // First check if table exists
    const { data: checkData, error: checkError } = await supabase
      .from('recipes')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      // Get first row to see structure
      const { data: sample, error: sampleError } = await supabase
        .from('recipes')
        .select('*')
        .limit(1);
      
      console.log('Table structure:', sample);
      
      const { count } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true });
      
      console.log(`✅ Recipes table already exists with ${count} recipes`);
      
      if (count === 0) {
        // Create a sample recipe
        const { data, error } = await supabase
          .from('recipes')
          .insert({
            name: 'Overnight Oats with Berries',
            description: 'Healthy and delicious overnight oats topped with fresh berries',
            meal_type: 'breakfast',
            calories: 350,
            protein: 12,
            carbs: 55,
            fat: 8,
            fiber: 8,
            prep_time: 10,
            cook_time: 0,
            servings: 1,
            difficulty: 'easy',
            ingredients: [
              { item: 'rolled oats', amount: '50', unit: 'g' },
              { item: 'almond milk', amount: '150', unit: 'ml' },
              { item: 'chia seeds', amount: '1', unit: 'tbsp' },
              { item: 'honey', amount: '1', unit: 'tbsp' },
              { item: 'mixed berries', amount: '100', unit: 'g' }
            ],
            instructions: [
              'Mix oats, almond milk, and chia seeds in a jar',
              'Add honey and stir well',
              'Cover and refrigerate overnight',
              'Top with fresh berries before serving'
            ],
            // dietary_tags: ['vegetarian', 'gluten-free'],
            // allergens: ['nuts'],
            source: 'ai_generated',
            status: 'active',
            upvotes: 0,
            downvotes: 0,
            times_used: 0
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating sample recipe:', error);
        } else {
          console.log('✅ Created sample recipe:', data.name);
        }
      }
      
      return;
    }
    
    console.log('⚠️  Recipes table does not exist.');
    console.log('Please create it manually in Supabase dashboard using the SQL from:');
    console.log('supabase/migrations/20250911_create_recipes_system.sql');
    console.log('');
    console.log('Steps:');
    console.log('1. Go to https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
    console.log('2. Copy the SQL from the migration file');
    console.log('3. Paste and run it in the SQL editor');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createRecipesTable();