const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Please provide a migration file path');
    console.log('Usage: node scripts/run-migration.js path/to/migration.sql');
    process.exit(1);
  }

  try {
    // Read the migration file
    const migrationPath = path.resolve(migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`Running migration: ${migrationFile}`);
    console.log('This may take a few minutes...\n');

    // Split by semicolons but be careful with functions/triggers
    const statements = sql
      .split(/;\s*$/gm)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.trim().startsWith('--') || statement.trim().length === 0) {
        continue;
      }

      try {
        // Extract a description from the statement
        const firstLine = statement.split('\n')[0];
        const description = firstLine.substring(0, 80) + (firstLine.length > 80 ? '...' : '');
        
        process.stdout.write(`[${i + 1}/${statements.length}] ${description} `);
        
        // Execute the statement
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution as fallback
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ sql: statement })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
        }
        
        console.log('✅');
        successCount++;
      } catch (error) {
        console.log('❌');
        console.error(`Error: ${error.message}\n`);
        errorCount++;
        
        // Ask if should continue
        if (i < statements.length - 1) {
          console.log('Continue with remaining statements? (y/n)');
          // For non-interactive environment, continue by default
          console.log('Continuing...\n');
        }
      }
    }

    console.log('\nMigration complete!');
    console.log(`✅ Success: ${successCount} statements`);
    console.log(`❌ Failed: ${errorCount} statements`);

  } catch (error) {
    console.error('Failed to run migration:', error);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function runMigrationDirect() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Please provide a migration file path');
    console.log('Usage: node scripts/run-migration.js path/to/migration.sql');
    process.exit(1);
  }

  try {
    // Read the migration file
    const migrationPath = path.resolve(migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`Running migration: ${migrationFile}`);
    console.log('Attempting direct SQL execution...\n');

    // Use the SQL editor endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: sql
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to execute migration: ${error}`);
    }

    console.log('✅ Migration executed successfully!');

  } catch (error) {
    console.error('Failed to run migration:', error);
    
    // Provide manual instructions as fallback
    console.log('\n📋 Manual Migration Instructions:');
    console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Create a new query');
    console.log(`4. Copy and paste the contents of: ${migrationFile}`);
    console.log('5. Click "Run" to execute the migration');
    console.log('\nNote: You may need to run the migration in smaller chunks if it\'s too large.');
  }
}

// Check if we can use RPC
async function checkRPCAvailable() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    return !error;
  } catch {
    return false;
  }
}

// Main execution
(async () => {
  const hasRPC = await checkRPCAvailable();
  
  if (hasRPC) {
    console.log('Using RPC method for migration...');
    await runMigration();
  } else {
    console.log('RPC not available, using direct method...');
    await runMigrationDirect();
  }
})();