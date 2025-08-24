#!/usr/bin/env node

/**
 * Direct Migration Application Script
 * Applies the Facebook integration migration directly to Supabase
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const execAsync = promisify(exec);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_DB_URL = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runMigration() {
  console.log('🚀 Facebook Integration Migration - Direct Application');
  console.log('=' .repeat(60));
  
  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250823_fix_facebook_integration_critical.sql');
  const migrationSQL = await fs.readFile(migrationPath, 'utf8');
  
  if (!SUPABASE_DB_URL) {
    console.error('❌ Missing database connection URL');
    console.log('\n📝 Manual Steps Required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/settings/database');
    console.log('2. Copy the "Connection string" (URI)');
    console.log('3. Add to .env.local as DATABASE_URL=<connection_string>');
    console.log('4. Run this script again');
    
    console.log('\n🔄 Alternative: Apply manually in Supabase Dashboard:');
    console.log('1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
    console.log('2. Paste the migration SQL and run it');
    
    // Copy to clipboard for convenience
    try {
      await execAsync(`echo "${migrationSQL.replace(/"/g, '\\"').replace(/\$/g, '\\$')}" | pbcopy`);
      console.log('\n✅ Migration SQL copied to clipboard!');
    } catch (err) {
      console.log('\n📋 Copy the migration from:');
      console.log(`   ${migrationPath}`);
    }
    
    process.exit(1);
  }
  
  // Use psql if available
  try {
    console.log('\n🔍 Checking for psql...');
    const { stdout: psqlVersion } = await execAsync('psql --version');
    console.log(`✅ Found: ${psqlVersion.trim()}`);
    
    // Write migration to temp file to avoid escaping issues
    const tempFile = path.join(__dirname, '.temp-migration.sql');
    await fs.writeFile(tempFile, migrationSQL);
    
    console.log('\n📝 Applying migration via psql...');
    const { stdout, stderr } = await execAsync(
      `psql "${SUPABASE_DB_URL}" -f "${tempFile}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.error('⚠️  Warnings:', stderr);
    }
    
    console.log('✅ Migration applied successfully!');
    
    // Clean up temp file
    await fs.unlink(tempFile).catch(() => {});
    
    console.log('\n🎉 Next Steps:');
    console.log('1. Go to: https://atlas-fitness-onboarding.vercel.app/integrations/facebook');
    console.log('2. Click "Sync Pages from Facebook" button');
    console.log('3. Your 25 pages should now appear!');
    
  } catch (error) {
    if (error.message.includes('command not found')) {
      console.log('❌ psql not found. Installing via Homebrew...');
      
      try {
        await execAsync('brew install postgresql');
        console.log('✅ PostgreSQL installed. Please run this script again.');
      } catch (brewError) {
        console.error('❌ Failed to install PostgreSQL:', brewError.message);
        console.log('\n📝 Manual installation required:');
        console.log('1. Run: brew install postgresql');
        console.log('2. Then run this script again');
        
        console.log('\n🔄 Or apply manually in Supabase Dashboard:');
        console.log('1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
        console.log('2. Paste the migration SQL and run it');
        
        // Copy to clipboard
        try {
          await execAsync(`cat "${migrationPath}" | pbcopy`);
          console.log('\n✅ Migration SQL copied to clipboard!');
        } catch (err) {
          console.log('\n📋 Copy the migration from:');
          console.log(`   ${migrationPath}`);
        }
      }
    } else {
      console.error('❌ Migration failed:', error.message);
      
      // Copy to clipboard for manual application
      try {
        await execAsync(`cat "${migrationPath}" | pbcopy`);
        console.log('\n✅ Migration SQL copied to clipboard!');
        console.log('\n📝 Please apply manually:');
        console.log('1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
        console.log('2. Paste the SQL (already in clipboard) and run it');
      } catch (err) {
        console.log('\n📋 Copy the migration from:');
        console.log(`   ${migrationPath}`);
      }
    }
    
    process.exit(1);
  }
}

// Check if we have connection details
if (!SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

runMigration().catch(console.error);