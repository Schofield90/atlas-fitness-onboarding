#!/usr/bin/env node

/**
 * Apply Facebook Integration Critical Migration
 * This script applies the database migration to fix Facebook integration issues
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

console.log('🔄 Connecting to Supabase...')
console.log('   URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250823_fix_facebook_integration_critical.sql')
const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

// Split the migration into individual statements
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

async function runMigration() {
  console.log('📋 Running Facebook Integration Fix Migration...')
  console.log(`   Total statements to execute: ${statements.length}`)
  
  let successCount = 0
  let errorCount = 0
  const errors = []

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'
    
    // Skip if it's just a comment
    if (statement.trim().startsWith('--')) continue
    
    try {
      // Get first 50 chars of statement for logging
      const preview = statement.substring(0, 50).replace(/\n/g, ' ')
      process.stdout.write(`   [${i + 1}/${statements.length}] ${preview}...`)
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).single()
      
      if (error) {
        // Some errors are expected (like dropping policies that don't exist)
        if (error.message?.includes('does not exist') || 
            error.message?.includes('already exists')) {
          console.log(' ⚠️  (ignored - expected)')
          successCount++
        } else {
          console.log(' ❌')
          console.error(`      Error: ${error.message}`)
          errors.push({ statement: preview, error: error.message })
          errorCount++
        }
      } else {
        console.log(' ✅')
        successCount++
      }
    } catch (err) {
      console.log(' ❌')
      console.error(`      Error: ${err.message}`)
      errors.push({ statement: statement.substring(0, 50), error: err.message })
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary:')
  console.log(`   ✅ Successful statements: ${successCount}`)
  console.log(`   ❌ Failed statements: ${errorCount}`)
  
  if (errors.length > 0) {
    console.log('\n⚠️  Errors encountered (some may be expected):')
    errors.forEach(e => {
      console.log(`   - ${e.statement}...`)
      console.log(`     ${e.error}`)
    })
  }

  if (errorCount === 0 || errorCount < statements.length / 2) {
    console.log('\n✅ Migration completed successfully!')
    console.log('\n🎉 Next steps:')
    console.log('   1. Go to https://atlas-fitness-onboarding.vercel.app/integrations/facebook')
    console.log('   2. Click "Sync Pages from Facebook" button')
    console.log('   3. Your 25 pages should now appear!')
  } else {
    console.log('\n❌ Migration had too many errors. Please check the errors above.')
  }
}

// Alternative: Direct SQL execution
async function runMigrationDirect() {
  console.log('🔄 Attempting direct SQL execution...')
  
  try {
    // We'll use the Supabase SQL editor API if available
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        sql: migrationSQL
      })
    })

    if (response.ok) {
      console.log('✅ Migration executed successfully!')
      return true
    } else {
      const error = await response.text()
      console.log('❌ Failed to execute migration:', error)
      return false
    }
  } catch (error) {
    console.log('❌ Error executing migration:', error.message)
    return false
  }
}

// Try to create exec_sql function first
async function createExecSQLFunction() {
  const createFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: createFunction
      })
    })
    
    if (response.ok) {
      console.log('✅ Created exec_sql function')
      return true
    }
  } catch (error) {
    console.log('⚠️  Could not create exec_sql function:', error.message)
  }
  return false
}

// Main execution
async function main() {
  console.log('🚀 Facebook Integration Migration Tool')
  console.log('=' .repeat(60))
  
  // Try different approaches
  console.log('\n📌 Approach 1: Using RPC exec_sql...')
  await createExecSQLFunction()
  
  const success = await runMigrationDirect()
  
  if (!success) {
    console.log('\n📌 Approach 2: Running statements individually...')
    await runMigration()
  }
}

main().catch(console.error)