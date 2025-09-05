require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testLandingPages() {
  console.log('Testing landing pages tables...\n')
  
  const tables = [
    'landing_pages',
    'landing_page_components',
    'landing_page_forms',
    'landing_page_submissions',
    'landing_page_templates',
    'ai_template_generations',
    'landing_page_events'
  ]
  
  let allExist = true
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1)
    
    if (error) {
      console.log(`❌ Table ${table}: Does not exist or not accessible`)
      console.log(`   Error: ${error.message}\n`)
      allExist = false
    } else {
      console.log(`✅ Table ${table}: Exists and accessible`)
      console.log(`   Records: ${data?.length || 0}\n`)
    }
  }
  
  if (!allExist) {
    console.log('\n📝 Some tables are missing. You need to run the migration.')
    console.log('\nTo create the tables:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy the content from: supabase/migrations/20250105_landing_page_builder.sql')
    console.log('4. Paste and run it in the SQL editor')
  } else {
    console.log('\n✨ All tables exist and are accessible!')
  }
}

testLandingPages().catch(console.error)