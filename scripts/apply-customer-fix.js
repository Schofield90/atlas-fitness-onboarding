#!/usr/bin/env node

/**
 * Script to apply the customer creation fix migration
 * This resolves the organization_id vs org_id column mismatch
 * and ensures users have organizations assigned
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('🔧 Applying customer creation fix migration...')
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250830_fix_clients_organization_column.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      // If exec_sql doesn't exist, try direct execution (this won't work with service role but worth trying)
      console.log('⚠️  exec_sql function not available, migration must be applied via Supabase dashboard')
      console.log('\n📋 Please run the following migration in your Supabase SQL editor:')
      console.log('----------------------------------------')
      console.log(migrationSQL)
      console.log('----------------------------------------')
      return false
    }
    
    console.log('✅ Migration applied successfully!')
    return true
  } catch (error) {
    console.error('❌ Error applying migration:', error.message)
    return false
  }
}

async function verifyFix() {
  console.log('\n🔍 Verifying the fix...')
  
  try {
    // Check if organization_id column exists in clients table
    const { data: columns, error } = await supabase
      .rpc('get_table_columns', { table_name: 'clients' })
    
    if (error || !columns) {
      console.log('⚠️  Cannot verify columns automatically')
      return
    }
    
    const hasOrgId = columns.some(col => col.column_name === 'org_id')
    const hasOrganizationId = columns.some(col => col.column_name === 'organization_id')
    
    console.log(`  org_id column: ${hasOrgId ? '✅' : '❌'}`)
    console.log(`  organization_id column: ${hasOrganizationId ? '✅' : '❌'}`)
    
    if (hasOrgId && hasOrganizationId) {
      console.log('\n✅ Both columns exist - compatibility ensured!')
    }
  } catch (error) {
    console.log('⚠️  Manual verification needed')
  }
}

async function main() {
  console.log('🚀 Atlas Fitness Customer Creation Fix')
  console.log('=====================================\n')
  
  const migrationApplied = await applyMigration()
  
  if (migrationApplied) {
    await verifyFix()
  }
  
  console.log('\n📝 Next steps:')
  console.log('1. If the migration was not automatically applied, copy the SQL above and run it in Supabase')
  console.log('2. Test customer creation at /customers/new')
  console.log('3. The system will now handle both org_id and organization_id columns')
  console.log('\n✨ The customer creation page has been updated to handle all scenarios gracefully')
}

main().catch(console.error)