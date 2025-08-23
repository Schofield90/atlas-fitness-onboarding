import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkDatabase() {
  console.log('🔍 Direct Database Check\n')
  console.log('=' .repeat(50))
  
  // 1. Check if table exists and get row count
  console.log('\n1️⃣ Checking facebook_integrations table...')
  const { data: integrations, error: intError, count } = await supabase
    .from('facebook_integrations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
  
  if (intError) {
    console.error('❌ Error querying table:', intError.message)
    if (intError.message.includes('does not exist')) {
      console.log('\n⚠️  TABLE DOES NOT EXIST!')
      console.log('Run this SQL in Supabase dashboard:')
      console.log('CREATE TABLE facebook_integrations ...')
      return
    }
  } else {
    console.log(`✅ Table exists with ${count || 0} total rows`)
    
    if (integrations && integrations.length > 0) {
      console.log('\nRecent integrations:')
      integrations.slice(0, 5).forEach((int, i) => {
        console.log(`\n  ${i + 1}. Integration ${int.id}`)
        console.log(`     User ID: ${int.user_id}`)
        console.log(`     Org ID: ${int.organization_id}`)
        console.log(`     FB User: ${int.facebook_user_name} (${int.facebook_user_id})`)
        console.log(`     Active: ${int.is_active}`)
        console.log(`     Created: ${int.created_at}`)
        console.log(`     Token Expires: ${int.token_expires_at}`)
      })
    } else {
      console.log('⚠️  No integrations found in database')
    }
  }
  
  // 2. Check for sam@gymleadhub.co.uk
  console.log('\n2️⃣ Checking for sam@gymleadhub.co.uk...')
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'sam@gymleadhub.co.uk')
  
  if (userError) {
    // Try auth.users table
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (!authError && authUsers?.users) {
      const sam = authUsers.users.find(u => u.email === 'sam@gymleadhub.co.uk')
      if (sam) {
        console.log(`✅ Found user in auth.users: ${sam.id}`)
        
        // Check their integrations
        if (integrations) {
          const samIntegrations = integrations.filter(i => i.user_id === sam.id)
          if (samIntegrations.length > 0) {
            console.log(`   Has ${samIntegrations.length} Facebook integration(s)`)
          } else {
            console.log('   ❌ No Facebook integrations for this user')
          }
        }
      } else {
        console.log('❌ User not found')
      }
    }
  } else if (users && users.length > 0) {
    const user = users[0]
    console.log(`✅ Found user: ${user.email} (${user.id})`)
    
    if (integrations) {
      const userIntegrations = integrations.filter(i => i.user_id === user.id)
      if (userIntegrations.length > 0) {
        console.log(`   Has ${userIntegrations.length} Facebook integration(s)`)
      } else {
        console.log('   ❌ No Facebook integrations for this user')
      }
    }
  }
  
  // 3. Check organization
  console.log('\n3️⃣ Checking organizations...')
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', '63589490-8f55-4157-bd3a-e141594b748e')
  
  if (!orgError && orgs && orgs.length > 0) {
    console.log(`✅ Default org exists: ${orgs[0].name}`)
  } else {
    console.log('⚠️  Default organization not found')
  }
  
  // 4. Test creating an integration
  console.log('\n4️⃣ Testing integration creation (with service role)...')
  const testIntegration = {
    organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
    user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
    facebook_user_id: 'test_' + Date.now(),
    facebook_user_name: 'Test User',
    facebook_user_email: 'test@example.com',
    access_token: 'test_token',
    is_active: false
  }
  
  const { data: testData, error: testError } = await supabase
    .from('facebook_integrations')
    .insert(testIntegration)
    .select()
    .single()
  
  if (testError) {
    console.error('❌ Failed to insert test:', testError.message)
    if (testError.message.includes('violates foreign key')) {
      console.log('   Issue: User ID must exist in auth.users')
    }
  } else {
    console.log('✅ Test insert successful')
    
    // Clean up
    if (testData) {
      await supabase
        .from('facebook_integrations')
        .delete()
        .eq('id', testData.id)
      console.log('   Cleaned up test record')
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('Check complete!')
}

checkDatabase()