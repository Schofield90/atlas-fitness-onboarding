#!/usr/bin/env node

// This script fixes the organization association for Sam's user account
// Run with: node scripts/fix-sam-organization.js

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const ATLAS_FITNESS_ORG_ID = '63589490-8f55-4157-bd3a-e141594b748e'
const SAM_USER_ID = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1'

async function fixOrganization() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  console.log('🔧 Fixing organization for Sam...')
  
  try {
    // Fix user_organizations table
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .upsert({
        user_id: SAM_USER_ID,
        organization_id: ATLAS_FITNESS_ORG_ID,
        role: 'owner'
      }, {
        onConflict: 'user_id'
      })
      .select()

    if (userOrgError) {
      console.error('❌ Error fixing user_organizations:', userOrgError.message)
    } else {
      console.log('✅ Fixed user_organizations table')
    }

    // Also fix organization_members table for compatibility
    const { data: orgMember, error: orgMemberError } = await supabase
      .from('organization_members')
      .upsert({
        user_id: SAM_USER_ID,
        organization_id: ATLAS_FITNESS_ORG_ID,
        role: 'owner',
        is_active: true
      }, {
        onConflict: 'user_id,organization_id'
      })
      .select()

    if (orgMemberError) {
      console.error('⚠️  Error fixing organization_members:', orgMemberError.message)
    } else {
      console.log('✅ Fixed organization_members table')
    }

    // Verify the fix
    const { data: verification } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', SAM_USER_ID)
      .single()

    if (verification) {
      console.log('✅ Verification successful! Organization ID:', verification.organization_id)
    }

    // Check for leads
    const { data: leads, count: leadsCount } = await supabase
      .from('leads')
      .select('id, name, email, source', { count: 'exact' })
      .eq('organization_id', ATLAS_FITNESS_ORG_ID)
      .limit(3)

    console.log(`\n📊 Found ${leadsCount || 0} leads in the database`)
    if (leads && leads.length > 0) {
      console.log('Sample leads:')
      leads.forEach(lead => {
        console.log(`  - ${lead.name || 'No name'} (${lead.email || 'No email'}) - Source: ${lead.source}`)
      })
    }

    // Check for contacts
    const { data: contacts, count: contactsCount } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email', { count: 'exact' })
      .eq('organization_id', ATLAS_FITNESS_ORG_ID)
      .limit(3)

    console.log(`\n📊 Found ${contactsCount || 0} contacts in the database`)
    if (contacts && contacts.length > 0) {
      console.log('Sample contacts:')
      contacts.forEach(contact => {
        console.log(`  - ${contact.first_name} ${contact.last_name} (${contact.email || 'No email'})`)
      })
    }

    // Check for clients (customers)
    const { data: clients, count: clientsCount } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email', { count: 'exact' })
      .eq('org_id', ATLAS_FITNESS_ORG_ID)
      .limit(3)

    console.log(`\n📊 Found ${clientsCount || 0} customers in the database`)
    if (clients && clients.length > 0) {
      console.log('Sample customers:')
      clients.forEach(client => {
        console.log(`  - ${client.first_name} ${client.last_name} (${client.email || 'No email'})`)
      })
    }

    console.log('\n✨ Organization fix complete! You should now be able to access your data.')
    console.log('🔄 Please refresh your browser and try accessing the contacts/customers pages again.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

fixOrganization()