import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAuthUsers() {
  console.log('🔍 Checking Auth Users\n')
  
  // List all users
  const { data: authUsers, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(`Found ${authUsers.users.length} users:\n`)
  
  authUsers.users.forEach(user => {
    console.log(`User: ${user.email}`)
    console.log(`  ID: ${user.id}`)
    console.log(`  Created: ${user.created_at}`)
    console.log(`  Last Sign In: ${user.last_sign_in_at}`)
    console.log('')
  })
  
  // Check for sam@gymleadhub.co.uk
  const sam = authUsers.users.find(u => u.email === 'sam@gymleadhub.co.uk')
  if (sam) {
    console.log('✅ Found sam@gymleadhub.co.uk')
    console.log(`   User ID: ${sam.id}`)
    
    // Check if this matches the Facebook integration
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('user_id', sam.id)
      .single()
    
    if (integration) {
      console.log('✅ Has Facebook integration!')
      console.log(`   FB User: ${integration.facebook_user_name}`)
      console.log(`   Active: ${integration.is_active}`)
    } else {
      console.log('❌ No Facebook integration for this user ID')
      
      // Check if there's an integration with different user ID
      const { data: anyIntegration } = await supabase
        .from('facebook_integrations')
        .select('*')
        .single()
      
      if (anyIntegration) {
        console.log(`\n⚠️  Integration exists but with different user ID:`)
        console.log(`   Integration user_id: ${anyIntegration.user_id}`)
        console.log(`   Current user_id: ${sam.id}`)
        console.log(`\n   MISMATCH DETECTED! This is why connection doesn't show.`)
        
        // Fix it
        console.log('\n🔧 Fixing user_id mismatch...')
        const { error: updateError } = await supabase
          .from('facebook_integrations')
          .update({ user_id: sam.id })
          .eq('id', anyIntegration.id)
        
        if (updateError) {
          console.error('❌ Failed to fix:', updateError.message)
        } else {
          console.log('✅ Fixed! Facebook integration now linked to correct user.')
        }
      }
    }
  }
}

checkAuthUsers()