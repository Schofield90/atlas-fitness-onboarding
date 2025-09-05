require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixBookingLink() {
  const orgId = '63589490-8f55-4157-bd3a-e141594b748e' // Atlas Fitness
  
  // Get appointment types
  const { data: appointmentTypes } = await supabase
    .from('appointment_types')
    .select('id, name')
    .eq('organization_id', orgId)
  
  console.log('Available appointment types:', appointmentTypes.map(t => t.name))
  
  // Update the existing booking link
  const { data: bookingLinks } = await supabase
    .from('booking_links')
    .select('*')
    .eq('organization_id', orgId)
  
  for (const link of bookingLinks || []) {
    console.log(`\nUpdating booking link: ${link.name}`)
    
    const { data, error } = await supabase
      .from('booking_links')
      .update({
        appointment_type_ids: appointmentTypes.map(t => t.id),
        description: 'Book your fitness session with Atlas Fitness'
      })
      .eq('id', link.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating:', error.message)
    } else {
      console.log(`✓ Updated with ${appointmentTypes.length} appointment types`)
    }
  }
}

fixBookingLink().catch(console.error)