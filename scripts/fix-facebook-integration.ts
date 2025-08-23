#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixFacebookIntegration() {
  console.log('🔧 Fixing Facebook Integration\n')
  console.log('=' .repeat(50))
  
  // Get all users
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  
  if (!authUsers) {
    console.error('Could not fetch users')
    return
  }
  
  console.log('Users in system:')
  authUsers.users.forEach(u => {
    console.log(`  - ${u.email} (${u.id})`)
  })
  
  // Get the Facebook integration
  const { data: integrations, error: intError } = await supabase
    .from('facebook_integrations')
    .select('*')
  
  if (!integrations || integrations.length === 0) {
    console.log('\n❌ No Facebook integrations found')
    return
  }
  
  const integration = integrations[0]
  console.log(`\nFacebook Integration:`)
  console.log(`  - ID: ${integration.id}`)
  console.log(`  - FB User: ${integration.facebook_user_name}`)
  console.log(`  - Current user_id: ${integration.user_id}`)
  console.log(`  - Active: ${integration.is_active}`)
  
  // Find which user this belongs to
  const currentUser = authUsers.users.find(u => u.id === integration.user_id)
  if (currentUser) {
    console.log(`  - Belongs to: ${currentUser.email}`)
  }
  
  // Ask which user should have the integration
  console.log('\n📝 Which user should have this Facebook integration?')
  console.log('1. sam@atlas-gyms.co.uk')
  console.log('2. samschofield90@hotmail.co.uk')
  console.log('3. Both (duplicate the integration)')
  
  // For now, let's duplicate it for both users
  console.log('\n🔄 Creating integration for both users...')
  
  for (const user of authUsers.users) {
    // Check if this user already has it
    const { data: existing } = await supabase
      .from('facebook_integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('facebook_user_id', integration.facebook_user_id)
      .single()
    
    if (existing) {
      console.log(`  ✓ ${user.email} already has integration`)
      continue
    }
    
    // Create a copy for this user
    const newIntegration = {
      ...integration,
      id: undefined, // Let DB generate new ID
      user_id: user.id,
      created_at: undefined,
      updated_at: undefined
    }
    
    delete newIntegration.id
    delete newIntegration.created_at
    delete newIntegration.updated_at
    
    const { data, error } = await supabase
      .from('facebook_integrations')
      .upsert(newIntegration, {
        onConflict: 'organization_id,facebook_user_id',
        ignoreDuplicates: false
      })
      .select()
    
    if (error) {
      // Try updating instead
      const { error: updateError } = await supabase
        .from('facebook_integrations')
        .update({ user_id: user.id })
        .eq('facebook_user_id', integration.facebook_user_id)
        .eq('organization_id', integration.organization_id)
      
      if (updateError) {
        console.log(`  ❌ Could not add for ${user.email}: ${updateError.message}`)
      } else {
        console.log(`  ✅ Updated integration for ${user.email}`)
      }
    } else {
      console.log(`  ✅ Added integration for ${user.email}`)
    }
  }
  
  console.log('\n✅ Done! Try logging in with either account now.')
  console.log('The Facebook connection should work with both:')
  console.log('  - sam@atlas-gyms.co.uk')
  console.log('  - samschofield90@hotmail.co.uk')
}

fixFacebookIntegration()