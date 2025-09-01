#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const ATLAS_FITNESS_ORG_ID = '63589490-8f55-4157-bd3a-e141594b748e'
const SAM_USER_ID = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1'

async function fixOrganization() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('🔧 Fixing organization association...')
  
  try {
    // First check if association already exists
    const { data: existing, error: checkError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', SAM_USER_ID)
      .single()
    
    if (existing) {
      console.log('✅ Association already exists:', existing)
      
      // Update it to ensure it's correct
      const { error: updateError } = await supabase
        .from('user_organizations')
        .update({
          organization_id: ATLAS_FITNESS_ORG_ID,
          role: 'owner'
        })
        .eq('user_id', SAM_USER_ID)
      
      if (updateError) {
        console.error('❌ Error updating association:', updateError.message)
      } else {
        console.log('✅ Updated existing association')
      }
    } else {
      // Create new association
      const { data: newAssoc, error: insertError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: SAM_USER_ID,
          organization_id: ATLAS_FITNESS_ORG_ID,
          role: 'owner'
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('❌ Error creating association:', insertError.message)
        
        // Try deleting and recreating
        console.log('🔄 Attempting to clean and recreate...')
        
        await supabase
          .from('user_organizations')
          .delete()
          .eq('user_id', SAM_USER_ID)
        
        const { data: retry, error: retryError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: SAM_USER_ID,
            organization_id: ATLAS_FITNESS_ORG_ID,
            role: 'owner'
          })
          .select()
          .single()
        
        if (retryError) {
          console.error('❌ Retry failed:', retryError.message)
        } else {
          console.log('✅ Created new association:', retry)
        }
      } else {
        console.log('✅ Created new association:', newAssoc)
      }
    }
    
    // Verify the fix
    const { data: verification } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', SAM_USER_ID)
      .single()
    
    if (verification) {
      console.log('✅ Verification successful! Organization ID:', verification.organization_id)
    } else {
      console.log('⚠️  No association found after fix attempt')
    }
    
    // Test data access
    console.log('\n📊 Testing data access...')
    
    const { count: leadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', ATLAS_FITNESS_ORG_ID)
    
    const { count: contactsCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', ATLAS_FITNESS_ORG_ID)
    
    const { count: clientsCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', ATLAS_FITNESS_ORG_ID)
    
    console.log(`✅ Found ${leadsCount || 0} leads`)
    console.log(`✅ Found ${contactsCount || 0} contacts`)
    console.log(`✅ Found ${clientsCount || 0} customers`)
    
    console.log('\n✨ Organization fix complete!')
    console.log('🔄 Please refresh your browser and try creating a contact again.')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

fixOrganization()