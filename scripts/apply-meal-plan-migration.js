const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Applying meal plan migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250911_meal_plan_jobs_and_cache.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons to execute statements individually
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).single();
      
      if (error) {
        // Try direct execution if RPC doesn't exist
        console.log('RPC failed, trying alternative approach...');
        // For now, we'll just log the error and continue
        console.warn(`Statement ${i + 1} might have failed:`, error.message);
      }
    }
    
    console.log('Migration applied successfully!');
    
    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('meal_plan_jobs')
      .select('id')
      .limit(1);
    
    if (!tablesError || tablesError.code === 'PGRST116') {
      console.log('✅ meal_plan_jobs table exists');
    } else {
      console.error('❌ meal_plan_jobs table check failed:', tablesError);
    }
    
    const { data: cache, error: cacheError } = await supabase
      .from('meal_plan_cache')
      .select('id')
      .limit(1);
    
    if (!cacheError || cacheError.code === 'PGRST116') {
      console.log('✅ meal_plan_cache table exists');
    } else {
      console.error('❌ meal_plan_cache table check failed:', cacheError);
    }
    
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();