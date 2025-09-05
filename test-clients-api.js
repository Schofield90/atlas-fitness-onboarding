require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Get these from your environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable')
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPA')))
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testClientsTable() {
  console.log('Testing clients table...')
  console.log('Supabase URL:', supabaseUrl)
  
  // Test 1: Check if table exists
  const { data: tableInfo, error: tableError } = await supabase
    .from('clients')
    .select('*')
    .limit(1)
  
  if (tableError) {
    console.error('Error accessing clients table:', tableError)
    return
  }
  
  console.log('✓ Clients table exists')
  
  // Test 2: Count records
  const { count, error: countError } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
  
  if (!countError) {
    console.log(`Total clients in database: ${count}`)
  }
  
  // Test 3: Check for organization_id column
  const { data: orgTest, error: orgError } = await supabase
    .from('clients')
    .select('organization_id')
    .limit(1)
  
  if (orgError && orgError.message.includes('column')) {
    console.warn('⚠ organization_id column might not exist:', orgError.message)
  } else {
    console.log('✓ organization_id column exists')
  }
  
  // Test 4: Check for org_id column (legacy)
  const { data: legacyTest, error: legacyError } = await supabase
    .from('clients')
    .select('org_id')
    .limit(1)
  
  if (legacyError && legacyError.message.includes('column')) {
    console.warn('⚠ org_id column might not exist:', legacyError.message)
  } else {
    console.log('✓ org_id column exists (legacy)')
  }
  
  // Test 5: Check organization data
  const orgId = '63589490-8f55-4157-bd3a-e141594b748e' // Atlas Fitness
  
  const { data: orgClients, error: orgClientsError } = await supabase
    .from('clients')
    .select('*')
    .or(`organization_id.eq.${orgId},org_id.eq.${orgId}`)
    .limit(5)
  
  if (!orgClientsError) {
    console.log(`\nClients for organization ${orgId}:`, orgClients?.length || 0)
    if (orgClients && orgClients.length > 0) {
      console.log('Sample client:', {
        id: orgClients[0].id,
        name: `${orgClients[0].first_name} ${orgClients[0].last_name}`,
        email: orgClients[0].email,
        organization_id: orgClients[0].organization_id,
        org_id: orgClients[0].org_id
      })
    }
  } else {
    console.error('Error fetching org clients:', orgClientsError)
  }
  
  // Test 6: Check for memberships table
  const { data: membershipTest, error: membershipError } = await supabase
    .from('memberships')
    .select('*')
    .limit(1)
  
  if (membershipError) {
    console.error('⚠ Error accessing memberships table:', membershipError.message)
  } else {
    console.log('✓ Memberships table exists')
  }
  
  // Test 7: Check for membership_plans table  
  const { data: plansTest, error: plansError } = await supabase
    .from('membership_plans')
    .select('*')
    .limit(1)
  
  if (plansError) {
    console.error('⚠ Error accessing membership_plans table:', plansError.message)
  } else {
    console.log('✓ Membership_plans table exists')
  }
}

testClientsTable().catch(console.error)