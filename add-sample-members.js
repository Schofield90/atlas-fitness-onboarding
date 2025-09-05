require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addSampleMembers() {
  const orgId = '63589490-8f55-4157-bd3a-e141594b748e' // Atlas Fitness
  
  const sampleMembers = [
    {
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@example.com',
      phone: '+447700900001',
      org_id: orgId,
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane.doe@example.com',
      phone: '+447700900002',
      org_id: orgId,
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      first_name: 'Mike',
      last_name: 'Johnson',
      email: 'mike.johnson@example.com',
      phone: '+447700900003',
      org_id: orgId,
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      first_name: 'Sarah',
      last_name: 'Williams',
      email: 'sarah.williams@example.com',
      phone: '+447700900004',
      org_id: orgId,
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      first_name: 'Tom',
      last_name: 'Brown',
      email: 'tom.brown@example.com',
      phone: '+447700900005',
      org_id: orgId,
      status: 'active',
      created_at: new Date().toISOString()
    }
  ]
  
  console.log('Adding sample members...')
  
  for (const member of sampleMembers) {
    // Check if member already exists
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('email', member.email)
      .eq('org_id', orgId)
      .single()
    
    if (existing) {
      console.log(`✓ Member ${member.first_name} ${member.last_name} already exists`)
      continue
    }
    
    const { data, error } = await supabase
      .from('clients')
      .insert(member)
      .select()
      .single()
    
    if (error) {
      console.error(`✗ Error adding ${member.first_name} ${member.last_name}:`, error.message)
    } else {
      console.log(`✓ Added ${member.first_name} ${member.last_name}`)
    }
  }
  
  // Check total count
  const { count } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
  
  console.log(`\nTotal members for Atlas Fitness: ${count}`)
}

addSampleMembers().catch(console.error)