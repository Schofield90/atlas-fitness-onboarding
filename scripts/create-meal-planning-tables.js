#!/usr/bin/env node

const { Client } = require('pg');

// Database connection
const connectionString = 'postgresql://postgres:${DB_PASSWORD}@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres';

async function createMealPlanningTables() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Creating meal planning tables...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Create ingredients table
    console.log('📄 Creating ingredients table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        category TEXT,
        calories_per_100g DECIMAL(10,2),
        protein_per_100g DECIMAL(10,2),
        carbs_per_100g DECIMAL(10,2),
        fat_per_100g DECIMAL(10,2),
        fiber_per_100g DECIMAL(10,2),
        unit TEXT DEFAULT 'grams',
        allergens TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created ingredients table');

    // Create recipes table
    console.log('📄 Creating recipes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        prep_time_minutes INTEGER,
        cook_time_minutes INTEGER,
        servings INTEGER DEFAULT 1,
        calories_per_serving DECIMAL(10,2),
        protein_per_serving DECIMAL(10,2),
        carbs_per_serving DECIMAL(10,2),
        fat_per_serving DECIMAL(10,2),
        fiber_per_serving DECIMAL(10,2),
        instructions TEXT[],
        dietary_tags TEXT[],
        difficulty TEXT DEFAULT 'medium',
        image_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created recipes table');

    // Create recipe_ingredients junction table
    console.log('📄 Creating recipe_ingredients table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
        ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        unit TEXT DEFAULT 'grams',
        notes TEXT,
        UNIQUE(recipe_id, ingredient_id)
      );
    `);
    console.log('✅ Created recipe_ingredients table');

    // Create meals table
    console.log('📄 Creating meals table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS meals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        meal_plan_day_id UUID,
        recipe_id UUID REFERENCES recipes(id),
        meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        meal_order INTEGER DEFAULT 1,
        serving_size DECIMAL(10,2) DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created meals table');

    // Create meal_plan_days table
    console.log('📄 Creating meal_plan_days table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS meal_plan_days (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
        day_number INTEGER NOT NULL,
        date DATE,
        total_calories DECIMAL(10,2),
        total_protein DECIMAL(10,2),
        total_carbs DECIMAL(10,2),
        total_fat DECIMAL(10,2),
        total_fiber DECIMAL(10,2),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created meal_plan_days table');

    // Add foreign key to meals table now that meal_plan_days exists
    console.log('📄 Adding foreign key to meals table...');
    await client.query(`
      ALTER TABLE meals 
      ADD CONSTRAINT meals_meal_plan_day_id_fkey 
      FOREIGN KEY (meal_plan_day_id) 
      REFERENCES meal_plan_days(id) 
      ON DELETE CASCADE;
    `);
    console.log('✅ Added foreign key to meals table');

    // Create nutrition_goals table
    console.log('📄 Creating nutrition_goals table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS nutrition_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nutrition_profile_id UUID REFERENCES nutrition_profiles(id) ON DELETE CASCADE,
        goal_type TEXT NOT NULL,
        target_value DECIMAL(10,2),
        current_value DECIMAL(10,2),
        start_date DATE DEFAULT CURRENT_DATE,
        end_date DATE,
        achieved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created nutrition_goals table');

    // Create macro_tracking table
    console.log('📄 Creating macro_tracking table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS macro_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nutrition_profile_id UUID REFERENCES nutrition_profiles(id) ON DELETE CASCADE,
        date DATE DEFAULT CURRENT_DATE,
        calories_consumed DECIMAL(10,2) DEFAULT 0,
        protein_consumed DECIMAL(10,2) DEFAULT 0,
        carbs_consumed DECIMAL(10,2) DEFAULT 0,
        fat_consumed DECIMAL(10,2) DEFAULT 0,
        fiber_consumed DECIMAL(10,2) DEFAULT 0,
        water_ml INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(nutrition_profile_id, date)
      );
    `);
    console.log('✅ Created macro_tracking table');

    // Create customers table if it doesn't exist
    console.log('📄 Creating customers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        email TEXT,
        name TEXT,
        phone TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created customers table');

    // Create indexes for performance
    console.log('📄 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_recipes_organization ON recipes(organization_id);
      CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes(meal_type);
      CREATE INDEX IF NOT EXISTS idx_meal_plan_days_plan ON meal_plan_days(meal_plan_id);
      CREATE INDEX IF NOT EXISTS idx_meals_day ON meals(meal_plan_day_id);
      CREATE INDEX IF NOT EXISTS idx_nutrition_goals_profile ON nutrition_goals(nutrition_profile_id);
      CREATE INDEX IF NOT EXISTS idx_macro_tracking_profile_date ON macro_tracking(nutrition_profile_id, date);
    `);
    console.log('✅ Created indexes');

    // Enable RLS on new tables
    console.log('🔒 Enabling Row Level Security...');
    const tables = ['ingredients', 'recipes', 'recipe_ingredients', 'meals', 'meal_plan_days', 'nutrition_goals', 'macro_tracking'];
    for (const table of tables) {
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }
    console.log('✅ Enabled RLS on all tables');

    // Create basic RLS policies
    console.log('🔒 Creating RLS policies...');
    
    // Allow authenticated users to read ingredients (public data)
    await client.query(`
      CREATE POLICY "Allow authenticated read ingredients" ON ingredients
      FOR SELECT USING (true);
    `);
    
    // Allow users to manage their own nutrition data
    await client.query(`
      CREATE POLICY "Users can manage own nutrition goals" ON nutrition_goals
      FOR ALL USING (
        nutrition_profile_id IN (
          SELECT id FROM nutrition_profiles 
          WHERE client_id IN (
            SELECT id FROM clients WHERE user_id = auth.uid()
          )
        )
      );
    `);
    
    await client.query(`
      CREATE POLICY "Users can manage own macro tracking" ON macro_tracking
      FOR ALL USING (
        nutrition_profile_id IN (
          SELECT id FROM nutrition_profiles 
          WHERE client_id IN (
            SELECT id FROM clients WHERE user_id = auth.uid()
          )
        )
      );
    `);
    
    console.log('✅ Created RLS policies');

    console.log('\n🎉 All meal planning tables created successfully!');
    console.log('The nutrition coach can now generate and store meal plans.');
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
createMealPlanningTables();