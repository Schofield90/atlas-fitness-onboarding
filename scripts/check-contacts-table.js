#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function checkContactsTable() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('🔍 Checking contacts table structure...\n')
  
  try {
    // Try to get table info via a query
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .limit(0)
    
    if (error) {
      console.error('❌ Error accessing contacts table:', error.message)
      console.error('Full error:', error)
      
      // Check if table exists
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_table_names', {})
        .catch(() => ({ data: null, error: 'RPC not available' }))
      
      if (tables) {
        console.log('\n📋 Available tables:', tables)
      }
    } else {
      console.log('✅ Contacts table is accessible')
      
      // Try minimal insert
      const { data: testInsert, error: insertError } = await supabase
        .from('contacts')
        .insert({
          organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
          email: `test${Date.now()}@example.com`
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('\n❌ Insert failed with minimal data:', insertError.message)
        console.error('Error code:', insertError.code)
        console.error('Error hint:', insertError.hint)
        console.error('Error details:', insertError.details)
      } else {
        console.log('\n✅ Insert successful with minimal data!')
        console.log('Created contact:', testInsert.id)
        
        // Clean up
        await supabase.from('contacts').delete().eq('id', testInsert.id)
        console.log('🧹 Test contact cleaned up')
      }
    }
    
    // Try to get actual column info
    console.log('\n📋 Attempting to get column information...')
    
    // Create a dummy insert to see what columns are expected
    const { error: dummyError } = await supabase
      .from('contacts')
      .insert({
        test_column_that_doesnt_exist: 'test'
      })
    
    if (dummyError && dummyError.message.includes('column')) {
      console.log('Error message reveals schema info:', dummyError.message)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkContactsTable()