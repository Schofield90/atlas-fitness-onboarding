#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function fixClientsTable() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('🔧 Fixing clients table org_id issue...')
  
  try {
    // First, test if we can access the clients table
    console.log('📋 Testing clients table access...')
    const { data: testData, error: testError } = await supabase
      .from('clients')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.error('❌ Error accessing clients table:', testError.message)
      
      if (testError.message.includes('org_id')) {
        console.log('\n⚠️  The org_id column is missing from the clients table.')
        console.log('📝 This needs to be fixed in the Supabase dashboard.')
        console.log('\nTo fix this issue:')
        console.log('1. Go to https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/editor')
        console.log('2. Click on "SQL Editor" in the left sidebar')
        console.log('3. Run this SQL command:')
        console.log('\n--- SQL TO RUN ---')
        console.log('ALTER TABLE clients RENAME COLUMN organization_id TO org_id;')
        console.log('\n--- OR IF THAT FAILS ---')
        console.log('ALTER TABLE clients ADD COLUMN IF NOT EXISTS org_id UUID;')
        console.log('UPDATE clients SET org_id = organization_id WHERE org_id IS NULL;')
        console.log('ALTER TABLE clients DROP COLUMN IF EXISTS organization_id;')
        console.log('\n--- END SQL ---')
      }
    } else {
      console.log('✅ Clients table is accessible')
      console.log('📊 Table structure looks good')
      
      // Try to insert a test client
      const ATLAS_FITNESS_ORG_ID = '63589490-8f55-4157-bd3a-e141594b748e'
      console.log('\n🧪 Testing client creation...')
      
      const { data: newClient, error: insertError } = await supabase
        .from('clients')
        .insert({
          first_name: 'Test',
          last_name: 'Client',
          email: `test-${Date.now()}@example.com`,
          phone: '+447000000000',
          org_id: ATLAS_FITNESS_ORG_ID,
          status: 'active'
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('❌ Failed to create test client:', insertError.message)
        if (insertError.message.includes('org_id')) {
          console.log('⚠️  The org_id column issue still exists. Please run the SQL commands above.')
        }
      } else {
        console.log('✅ Test client created successfully!')
        console.log('Client ID:', newClient.id)
        
        // Clean up test client
        await supabase
          .from('clients')
          .delete()
          .eq('id', newClient.id)
        
        console.log('🧹 Test client cleaned up')
        console.log('\n✨ Clients table is working correctly!')
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

fixClientsTable()