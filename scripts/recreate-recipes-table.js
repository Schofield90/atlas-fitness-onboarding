const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

console.log('Connecting to Supabase...');
console.log('URL:', supabaseUrl);

// Create an admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function recreateRecipesTable() {
  try {
    console.log('\n🔧 Recreating recipes table with correct schema...');
    
    // First, try to drop existing tables
    console.log('Dropping existing recipe-related tables if they exist...');
    
    // We can't execute raw SQL directly via the JS client
    // So we'll use the Supabase REST API with fetch
    const fetch = require('node-fetch');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: `
          -- Drop existing tables
          DROP TABLE IF EXISTS recipe_usage_log CASCADE;
          DROP TABLE IF EXISTS recipe_favorites CASCADE;
          DROP TABLE IF EXISTS recipe_votes CASCADE;
          DROP TABLE IF EXISTS recipes CASCADE;
          
          -- Create recipes table
          CREATE TABLE recipes (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              description TEXT,
              meal_type VARCHAR(50) NOT NULL,
              calories INTEGER NOT NULL,
              protein DECIMAL(10,2) NOT NULL,
              carbs DECIMAL(10,2) NOT NULL,
              fat DECIMAL(10,2) NOT NULL,
              fiber DECIMAL(10,2),
              sugar DECIMAL(10,2),
              sodium DECIMAL(10,2),
              prep_time INTEGER,
              cook_time INTEGER,
              servings INTEGER DEFAULT 1,
              difficulty VARCHAR(20),
              cuisine VARCHAR(100),
              ingredients JSONB NOT NULL,
              instructions JSONB NOT NULL,
              equipment JSONB,
              dietary_tags TEXT[],
              allergens TEXT[],
              upvotes INTEGER DEFAULT 0,
              downvotes INTEGER DEFAULT 0,
              times_used INTEGER DEFAULT 0,
              source VARCHAR(50) DEFAULT 'ai_generated',
              created_by UUID REFERENCES auth.users(id),
              organization_id UUID REFERENCES organizations(id),
              image_url TEXT,
              thumbnail_url TEXT,
              status VARCHAR(20) DEFAULT 'active',
              is_featured BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to execute SQL via RPC:', error);
      console.log('\nTrying alternative approach...');
      
      // Alternative: Try to work with the existing table
      // Just insert a test recipe with minimal fields
      const { data, error: insertError } = await supabase
        .from('recipes')
        .insert({
          name: 'Test Recipe - Overnight Oats',
          description: 'Healthy breakfast option',
          meal_type: 'breakfast',
          calories: 350,
          protein: 12,
          carbs: 55,
          fat: 8,
          prep_time: 10,
          cook_time: 0,
          servings: 1,
          ingredients: JSON.stringify([
            { item: 'oats', amount: '50', unit: 'g' },
            { item: 'milk', amount: '150', unit: 'ml' }
          ]),
          instructions: JSON.stringify([
            'Mix oats and milk',
            'Refrigerate overnight',
            'Serve with toppings'
          ]),
          source: 'ai_generated',
          status: 'active'
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Could not insert test recipe:', insertError);
        console.log('\n⚠️  The recipes table needs to be recreated manually.');
        console.log('\nPlease follow these steps:');
        console.log('1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
        console.log('2. Run this SQL:');
        console.log('\n--- COPY FROM HERE ---');
        console.log('DROP TABLE IF EXISTS recipe_usage_log CASCADE;');
        console.log('DROP TABLE IF EXISTS recipe_favorites CASCADE;');
        console.log('DROP TABLE IF EXISTS recipe_votes CASCADE;');
        console.log('DROP TABLE IF EXISTS recipes CASCADE;');
        console.log('\n-- Then copy and paste the entire content of:');
        console.log('-- supabase/migrations/20250911_create_recipes_system.sql');
        console.log('--- END COPY ---\n');
      } else {
        console.log('✅ Successfully created test recipe:', data.name);
        console.log('Recipe ID:', data.id);
        return;
      }
    } else {
      console.log('✅ Successfully recreated recipes table via RPC');
      
      // Now create a test recipe
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          name: 'Overnight Oats with Berries',
          description: 'Healthy and delicious overnight oats',
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
          dietary_tags: ['vegetarian', 'gluten-free'],
          allergens: ['nuts'],
          source: 'ai_generated',
          status: 'active'
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating test recipe:', error);
      } else {
        console.log('✅ Created test recipe:', data.name);
        console.log('Recipe ID:', data.id);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    console.log('\n⚠️  Manual intervention required.');
    console.log('Please go to the Supabase SQL editor and run the migration manually.');
  }
}

recreateRecipesTable();