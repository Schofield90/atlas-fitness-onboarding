import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
  try {
    // Get all tables
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables_info')
      .single()

    if (tablesError) {
      console.log('Error fetching tables, trying alternate method...')
      
      // Try alternate method - query information schema
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE')

      if (schemaError) {
        console.error('Schema query error:', schemaError)
        
        // Try getting a sample of known tables
        const knownTables = [
          'users', 'organizations', 'leads', 'contacts', 'appointments',
          'tasks', 'forms', 'email_logs', 'sms_logs', 'whatsapp_logs',
          'facebook_integrations', 'facebook_pages', 'workflows', 'class_sessions',
          'bookings', 'programs', 'memberships'
        ]
        
        console.log('\nChecking known tables:')
        for (const table of knownTables) {
          try {
            const { count, error } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true })
            
            if (!error) {
              console.log(`✓ ${table}: ${count} records`)
            } else {
              console.log(`✗ ${table}: Not found or error`)
            }
          } catch (e) {
            console.log(`✗ ${table}: Error checking`)
          }
        }
      } else {
        console.log('Tables found:', schemaData)
      }
    } else {
      console.log('Database tables:', tables)
    }

    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1)

    if (!testError) {
      console.log('\n✅ Database connection successful!')
      console.log('Sample organization:', testData)
    } else {
      console.error('❌ Database connection error:', testError)
    }

  } catch (error) {
    console.error('Script error:', error)
  }
}

checkDatabase()