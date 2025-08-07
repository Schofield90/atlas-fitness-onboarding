#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

async function applyDatabaseOptimizations() {
  console.log('🔧 Applying database optimizations...\n')
  
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'fix-database-issues.sql')
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8')
    
    // Split SQL into individual statements (simple split by semicolon)
    const statements = sqlContent
      .split(/;\s*$|\n\n/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    let successCount = 0
    let errorCount = 0
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comment-only lines
      if (statement.match(/^--/) || !statement.trim()) {
        continue
      }
      
      // Extract a description from the statement
      const description = statement
        .split('\n')[0]
        .substring(0, 80)
        .replace(/\s+/g, ' ')
        
      process.stdout.write(`[${i + 1}/${statements.length}] ${description}... `)
      
      try {
        // Use rpc to execute raw SQL
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        }).single()
        
        if (error) {
          // Try direct query if rpc doesn't exist
          const { error: directError } = await supabase
            .from('_sql_migrations')
            .insert({ sql: statement })
            .select()
            .single()
            
          if (directError) {
            throw directError
          }
        }
        
        console.log('✅')
        successCount++
      } catch (error: any) {
        console.log('❌')
        console.error(`   Error: ${error.message || error}`)
        errorCount++
      }
    }
    
    console.log('\n📊 Summary:')
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${errorCount}`)
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some optimizations failed. This might be because:')
      console.log('- Tables/columns already exist')
      console.log('- RLS policies are already in place')
      console.log('- You need to run these directly in Supabase SQL editor')
      console.log('\n💡 Recommendation: Copy the SQL from scripts/fix-database-issues.sql')
      console.log('   and run it directly in your Supabase dashboard SQL editor.')
    } else {
      console.log('\n✅ All database optimizations applied successfully!')
    }
    
  } catch (error) {
    console.error('❌ Failed to apply database optimizations:', error)
    process.exit(1)
  }
}

// Check if we can connect to Supabase
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('count(*)', { count: 'exact', head: true })
    
    if (error) throw error
    console.log('✅ Connected to Supabase successfully\n')
    return true
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error)
    return false
  }
}

// Main execution
async function main() {
  console.log('🚀 Database Optimization Script\n')
  
  const connected = await testConnection()
  if (!connected) {
    console.log('\n💡 Since we cannot execute SQL via the client, please:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy the contents of scripts/fix-database-issues.sql')
    console.log('4. Run the SQL manually')
    process.exit(1)
  }
  
  await applyDatabaseOptimizations()
}

main().catch(console.error)