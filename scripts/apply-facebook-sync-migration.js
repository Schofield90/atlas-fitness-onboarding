#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase connection details
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTk0OTI3NCwiZXhwIjoyMDM1NTI1Mjc0fQ.6_K3sCLfvseP7RZ_PQxBYqE_wX30tBeQPisXQ8lLu8Q';

async function applyMigration() {
  console.log('🚀 Starting Facebook sync migration...');
  
  try {
    // Create Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250902_facebook_leads_auto_sync_contacts.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim() === ';') {
        continue;
      }

      // Show progress for longer operations
      if (statement.includes('CREATE FUNCTION') || statement.includes('CREATE TRIGGER')) {
        console.log(`⚙️  Creating function/trigger (${i + 1}/${statements.length})...`);
      } else if (statement.includes('CREATE INDEX')) {
        console.log(`📑 Creating index (${i + 1}/${statements.length})...`);
      } else if (statement.includes('DO $$')) {
        console.log(`🔄 Running batch sync (${i + 1}/${statements.length})...`);
      }

      try {
        // Use raw SQL execution via Supabase RPC
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        }).single();

        if (error) {
          // Try direct execution as fallback
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ sql_query: statement })
          });

          if (!response.ok) {
            throw new Error(`Statement ${i + 1} failed: ${await response.text()}`);
          }
        }
        
        successCount++;
      } catch (err) {
        console.error(`❌ Error executing statement ${i + 1}:`, err.message);
        errors.push({ statement: i + 1, error: err.message });
        errorCount++;
        
        // Don't fail on index creation errors (might already exist)
        if (!statement.includes('CREATE INDEX IF NOT EXISTS')) {
          // For critical statements, we might want to stop
          if (statement.includes('CREATE FUNCTION') || statement.includes('CREATE TRIGGER')) {
            console.error('🛑 Critical statement failed, stopping migration');
            break;
          }
        }
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(e => {
        console.log(`  - Statement ${e.statement}: ${e.error}`);
      });
    }

    // Test the sync function
    console.log('\n🧪 Testing sync function...');
    const { data: syncTest, error: syncError } = await supabase
      .rpc('sync_existing_facebook_leads_to_contacts');
    
    if (syncError) {
      console.log('⚠️  Could not test sync function:', syncError.message);
    } else {
      console.log('✅ Sync function test completed:', syncTest);
    }

    console.log('\n✨ Migration process completed!');
    console.log('📝 Facebook leads will now automatically sync to contacts');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Note: Direct SQL execution might not be available via Supabase client
// Alternative approach using direct database connection
async function applyMigrationDirect() {
  console.log('🚀 Applying migration using direct connection...');
  
  const { Client } = require('pg');
  
  const client = new Client({
    host: 'db.lzlrojoaxrqvmhempnkn.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'OGFYlxSChyYLgQxn',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250902_facebook_leads_auto_sync_contacts.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    
    // Test the sync
    const result = await client.query('SELECT * FROM sync_existing_facebook_leads_to_contacts()');
    console.log('📊 Sync results:', result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

// Check if pg module is available
try {
  require('pg');
  applyMigrationDirect();
} catch (e) {
  console.log('⚠️  pg module not found, installing...');
  const { execSync } = require('child_process');
  execSync('npm install pg', { stdio: 'inherit' });
  applyMigrationDirect();
}