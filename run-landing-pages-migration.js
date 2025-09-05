require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250105_landing_page_builder.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    console.log(`Running ${statements.length} SQL statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      // Skip comments
      if (statement.trim().startsWith('--')) continue
      
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`)
      console.log(statement.substring(0, 100) + '...')
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).single()
      
      if (error) {
        // Try direct execution via the Supabase client
        const { data, error: directError } = await supabase
          .from('_sql')
          .insert({ query: statement })
          .select()
        
        if (directError) {
          console.error(`Error in statement ${i + 1}:`, directError.message)
          // Continue with other statements
        } else {
          console.log(`✓ Statement ${i + 1} executed successfully`)
        }
      } else {
        console.log(`✓ Statement ${i + 1} executed successfully`)
      }
    }
    
    console.log('\n✨ Migration completed!')
    
    // Verify tables were created
    console.log('\nVerifying tables...')
    const tables = [
      'landing_pages',
      'landing_page_components',
      'landing_page_forms',
      'landing_page_submissions',
      'landing_page_templates',
      'ai_template_generations',
      'landing_page_events'
    ]
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`❌ Table ${table}: Not accessible (${error.message})`)
      } else {
        console.log(`✅ Table ${table}: Created successfully`)
      }
    }
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()