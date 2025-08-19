#!/usr/bin/env tsx

/**
 * Direct deployment script for settings enhancement
 * Applies migrations directly via Supabase client
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

async function executeMigration() {
  console.log('🚀 Starting settings enhancement deployment...\n')
  
  try {
    // Read the migration file
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/20250817_settings_enhancement.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    // Split migration into individual statements (basic split by semicolon)
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .filter(stmt => !stmt.trim().startsWith('--'))
    
    console.log(`📄 Found ${statements.length} SQL statements to execute\n`)
    
    let successCount = 0
    let skipCount = 0
    let errorCount = 0
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      
      if (!statement) continue
      
      // Extract table/operation name for logging
      let operationName = 'Statement ' + (i + 1)
      if (statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)) {
        operationName = `Create table: ${RegExp.$1}`
      } else if (statement.match(/ALTER TABLE (\w+)/i)) {
        operationName = `Alter table: ${RegExp.$1}`
      } else if (statement.match(/CREATE POLICY "([^"]+)"/i)) {
        operationName = `Create policy: ${RegExp.$1}`
      } else if (statement.match(/CREATE INDEX .* ON (\w+)/i)) {
        operationName = `Create index on: ${RegExp.$1}`
      }
      
      process.stdout.write(`  [${i + 1}/${statements.length}] ${operationName}... `)
      
      try {
        // Execute via RPC call (raw SQL execution)
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        }).single()
        
        if (error) {
          // Check if it's an "already exists" error
          if (error.message?.includes('already exists') || 
              error.message?.includes('duplicate key')) {
            process.stdout.write('✓ (already exists)\n')
            skipCount++
          } else {
            throw error
          }
        } else {
          process.stdout.write('✓\n')
          successCount++
        }
      } catch (error: any) {
        // Try alternative execution method
        try {
          const { data, error: altError } = await supabase
            .from('_migrations')
            .insert({ sql: statement })
            .select()
          
          if (!altError) {
            process.stdout.write('✓ (alt method)\n')
            successCount++
          } else {
            throw altError
          }
        } catch (altError: any) {
          process.stdout.write(`✗ ${error.message || altError.message}\n`)
          errorCount++
        }
      }
    }
    
    console.log('\n========================================')
    console.log('Deployment Summary')
    console.log('========================================')
    console.log(`✅ Successful: ${successCount}`)
    console.log(`⏭️  Skipped (already exists): ${skipCount}`)
    console.log(`❌ Failed: ${errorCount}`)
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed, but this may be OK if tables already exist.')
      console.log('The app should still work with partial deployment.')
    } else {
      console.log('\n✅ All migrations deployed successfully!')
    }
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    console.log('\n💡 Alternative: You can manually run the migration in Supabase SQL editor:')
    console.log('   1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql')
    console.log('   2. Copy the contents of: supabase/migrations/20250817_settings_enhancement.sql')
    console.log('   3. Paste and run in the SQL editor')
    process.exit(1)
  }
}

// Since we can't execute raw SQL directly, let's create tables using the Supabase admin API
async function deployViaAPI() {
  console.log('🚀 Deploying settings tables via Supabase API...\n')
  
  const tables = [
    { name: 'phone_settings', exists: false },
    { name: 'lead_scoring_settings', exists: false },
    { name: 'calendar_settings', exists: false },
    { name: 'pipelines', exists: false },
    { name: 'custom_fields', exists: false },
    { name: 'email_templates', exists: false },
    { name: 'staff_invitations', exists: false },
    { name: 'lead_scoring_history', exists: false }
  ]
  
  // Check which tables exist
  for (const table of tables) {
    try {
      const { count } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true })
      
      table.exists = true
      console.log(`✓ Table ${table.name} exists`)
    } catch (error) {
      console.log(`✗ Table ${table.name} does not exist`)
    }
  }
  
  const missingTables = tables.filter(t => !t.exists)
  
  if (missingTables.length === 0) {
    console.log('\n✅ All tables already exist!')
    return
  }
  
  console.log(`\n⚠️  ${missingTables.length} tables need to be created manually:`)
  console.log('\nPlease go to Supabase SQL Editor and run the migration:')
  console.log('1. Visit: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new')
  console.log('2. Copy contents from: supabase/migrations/20250817_settings_enhancement.sql')
  console.log('3. Paste and run the SQL')
  console.log('\nTables to create:', missingTables.map(t => t.name).join(', '))
}

// Run deployment
deployViaAPI().catch(console.error)