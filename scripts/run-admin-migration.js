const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read environment variables
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'

async function runMigration() {
  console.log('🚀 Running Admin HQ migration...')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250821_admin_hq_foundation.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  
  try {
    // Split the migration into individual statements
    // Remove comments and empty lines
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'))
      .map(s => s + ';')
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip if empty
      if (!statement.trim() || statement.trim() === ';') continue
      
      // Get first 50 chars of statement for logging
      const preview = statement.substring(0, 50).replace(/\n/g, ' ')
      
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        }).single()
        
        if (error) {
          // Try direct execution as fallback
          const { data, error: directError } = await supabase
            .from('_sql')
            .insert({ query: statement })
            .select()
          
          if (directError) {
            throw directError
          }
        }
        
        successCount++
        console.log(`✅ Statement ${i + 1}: ${preview}...`)
      } catch (error) {
        errorCount++
        console.error(`❌ Statement ${i + 1} failed: ${preview}...`)
        console.error(`   Error: ${error.message}`)
        
        // Continue with other statements
        continue
      }
    }
    
    console.log('\n📊 Migration Summary:')
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ❌ Failed: ${errorCount}`)
    
    if (errorCount === 0) {
      console.log('\n🎉 Admin HQ migration completed successfully!')
      console.log('   sam@gymleadhub.co.uk has been set as platform owner')
    } else {
      console.log('\n⚠️  Migration completed with some errors.')
      console.log('   Please review the errors above.')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
runMigration().catch(console.error)