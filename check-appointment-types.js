require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAppointmentTypes() {
  const orgId = '63589490-8f55-4157-bd3a-e141594b748e' // Atlas Fitness
  
  // Get all records to see the structure
  const { data, error } = await supabase
    .from('appointment_types')
    .select('*')
    .eq('organization_id', orgId)
    .limit(5)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('Appointment types data:')
  console.log(JSON.stringify(data, null, 2))
  
  if (data && data.length > 0) {
    console.log('\nAvailable columns:', Object.keys(data[0]))
  }
}

checkAppointmentTypes().catch(console.error)