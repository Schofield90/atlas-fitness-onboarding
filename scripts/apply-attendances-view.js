const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Applying all_attendances view migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250918_all_attendances_view.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct approach
      console.log('Direct RPC failed, attempting alternative approach...');

      // Alternative: Create the view using Supabase Admin API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: migrationSQL })
      });

      if (!response.ok) {
        throw new Error(`Migration failed: ${response.statusText}`);
      }
    }

    console.log('✅ Migration applied successfully');

    // Test the view
    console.log('Testing view with sample query...');
    const { data, error: queryError } = await supabase
      .from('all_attendances')
      .select('*', { count: 'exact', head: true });

    if (queryError) {
      console.error('❌ View test failed:', queryError.message);
    } else {
      console.log('✅ View is working correctly');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();