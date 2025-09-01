#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const ATLAS_FITNESS_ORG_ID = '63589490-8f55-4157-bd3a-e141594b748e'

async function testContactCreation() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('🧪 Testing contact creation...\n')
  
  try {
    // Test 1: Create a contact
    console.log('1️⃣ Testing contacts table...')
    const timestamp = Date.now()
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        organization_id: ATLAS_FITNESS_ORG_ID,
        first_name: 'Test',
        last_name: `Contact-${timestamp}`,
        email: `test${timestamp}@example.com`,
        phone: '+447000000000',
        source: 'manual',
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (contactError) {
      console.error('❌ Contact creation failed:', contactError.message)
      console.error('Details:', contactError)
    } else {
      console.log('✅ Contact created successfully:', contact.id)
      
      // Clean up
      await supabase.from('contacts').delete().eq('id', contact.id)
      console.log('🧹 Test contact cleaned up')
    }
    
    // Test 2: Create a lead with first_name and last_name
    console.log('\n2️⃣ Testing leads table with first_name/last_name...')
    const { data: lead1, error: leadError1 } = await supabase
      .from('leads')
      .insert({
        organization_id: ATLAS_FITNESS_ORG_ID,
        first_name: 'Test',
        last_name: `Lead-${timestamp}`,
        email: `testlead${timestamp}@example.com`,
        phone: '+447000000001',
        source: 'manual',
        status: 'new',
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (leadError1) {
      console.error('❌ Lead creation with first_name/last_name failed:', leadError1.message)
      
      // Try with just name field
      console.log('\n3️⃣ Testing leads table with name field...')
      const { data: lead2, error: leadError2 } = await supabase
        .from('leads')
        .insert({
          organization_id: ATLAS_FITNESS_ORG_ID,
          name: `Test Lead ${timestamp}`,
          email: `testlead${timestamp}@example.com`,
          phone: '+447000000001',
          source: 'manual',
          status: 'new',
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (leadError2) {
        console.error('❌ Lead creation with name field also failed:', leadError2.message)
      } else {
        console.log('✅ Lead created with name field:', lead2.id)
        await supabase.from('leads').delete().eq('id', lead2.id)
        console.log('🧹 Test lead cleaned up')
      }
    } else {
      console.log('✅ Lead created with first_name/last_name:', lead1.id)
      await supabase.from('leads').delete().eq('id', lead1.id)
      console.log('🧹 Test lead cleaned up')
    }
    
    // Test 3: Check table columns
    console.log('\n4️⃣ Checking table structures...')
    
    // Get a sample lead to see its structure
    const { data: sampleLead } = await supabase
      .from('leads')
      .select('*')
      .limit(1)
      .single()
    
    if (sampleLead) {
      console.log('\n📋 Lead table columns:')
      console.log(Object.keys(sampleLead).join(', '))
    }
    
    // Get a sample contact to see its structure
    const { data: sampleContact } = await supabase
      .from('contacts')
      .select('*')
      .limit(1)
      .single()
    
    if (sampleContact) {
      console.log('\n📋 Contact table columns:')
      console.log(Object.keys(sampleContact).join(', '))
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testContactCreation()