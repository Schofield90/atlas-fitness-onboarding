require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkBookingLinks() {
  const orgId = '63589490-8f55-4157-bd3a-e141594b748e' // Atlas Fitness
  
  // Check booking_links table
  const { data, error } = await supabase
    .from('booking_links')
    .select('*')
    .eq('organization_id', orgId)
    .limit(5)
  
  if (error) {
    console.error('Error accessing booking_links:', error.message)
    // Try with org_id
    const { data: dataAlt, error: errorAlt } = await supabase
      .from('booking_links')
      .select('*')
      .eq('org_id', orgId)
      .limit(5)
    
    if (errorAlt) {
      console.error('Error with org_id:', errorAlt.message)
      return
    }
    
    console.log('Booking links (using org_id):')
    console.log(JSON.stringify(dataAlt, null, 2))
    if (dataAlt && dataAlt.length > 0) {
      console.log('\nAvailable columns:', Object.keys(dataAlt[0]))
    }
  } else {
    console.log('Booking links:')
    console.log(JSON.stringify(data, null, 2))
    if (data && data.length > 0) {
      console.log('\nAvailable columns:', Object.keys(data[0]))
    } else {
      console.log('\nNo booking links found. Creating sample booking link...')
      await createSampleBookingLink(orgId)
    }
  }
}

async function createSampleBookingLink(orgId) {
  // Get appointment types
  const { data: appointmentTypes } = await supabase
    .from('appointment_types')
    .select('id, name')
    .eq('organization_id', orgId)
  
  if (!appointmentTypes || appointmentTypes.length === 0) {
    console.error('No appointment types found')
    return
  }
  
  const bookingLink = {
    organization_id: orgId,
    name: 'General Booking',
    slug: 'atlas-fitness',
    description: 'Book your fitness session with Atlas Fitness',
    is_active: true,
    appointment_type_ids: appointmentTypes.map(t => t.id),
    availability: {
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '18:00' },
      saturday: { enabled: true, start: '10:00', end: '16:00' },
      sunday: { enabled: false }
    }
  }
  
  const { data, error } = await supabase
    .from('booking_links')
    .insert(bookingLink)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating booking link:', error.message)
    // Try with org_id instead
    const altLink = { ...bookingLink, org_id: orgId }
    delete altLink.organization_id
    
    const { data: altData, error: altError } = await supabase
      .from('booking_links')
      .insert(altLink)
      .select()
      .single()
    
    if (altError) {
      console.error('Error with org_id:', altError.message)
    } else {
      console.log('✓ Created booking link:', altData.name)
    }
  } else {
    console.log('✓ Created booking link:', data.name)
  }
}

checkBookingLinks().catch(console.error)