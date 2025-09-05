require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addBookingTypes() {
  const orgId = '63589490-8f55-4157-bd3a-e141594b748e' // Atlas Fitness
  
  // First check if appointment_types table exists
  const { data: typeTest, error: typeError } = await supabase
    .from('appointment_types')
    .select('*')
    .limit(1)
  
  if (typeError) {
    console.log('appointment_types table issue:', typeError.message)
    
    // Try booking_types as alternative
    const { data: bookingTypeTest, error: bookingTypeError } = await supabase
      .from('booking_types')
      .select('*')
      .limit(1)
    
    if (bookingTypeError) {
      console.log('booking_types table issue:', bookingTypeError.message)
      console.log('Neither appointment_types nor booking_types table exists or is accessible')
      return
    } else {
      console.log('Using booking_types table')
      await addToBookingTypes(orgId)
    }
  } else {
    console.log('Using appointment_types table')
    await addToAppointmentTypes(orgId)
  }
}

async function addToAppointmentTypes(orgId) {
  const appointmentTypes = [
    {
      name: 'Personal Training Session',
      duration: 60,
      description: 'One-on-one personal training session',
      organization_id: orgId,
      is_active: true
    },
    {
      name: 'Fitness Assessment',
      duration: 45,
      description: 'Initial fitness assessment and goal setting',
      organization_id: orgId,
      is_active: true
    },
    {
      name: 'Nutrition Consultation',
      duration: 30,
      description: 'Nutrition planning and dietary advice',
      organization_id: orgId,
      is_active: true
    },
    {
      name: 'Group Class',
      duration: 60,
      description: 'Group fitness class',
      organization_id: orgId,
      is_active: true
    }
  ]
  
  console.log('Adding appointment types...')
  
  for (const type of appointmentTypes) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('appointment_types')
      .select('id')
      .eq('name', type.name)
      .eq('organization_id', orgId)
      .single()
    
    if (existing) {
      console.log(`✓ Appointment type "${type.name}" already exists`)
      continue
    }
    
    const { data, error } = await supabase
      .from('appointment_types')
      .insert(type)
      .select()
      .single()
    
    if (error) {
      console.error(`✗ Error adding "${type.name}":`, error.message)
    } else {
      console.log(`✓ Added appointment type "${type.name}"`)
    }
  }
  
  // Check total count
  const { count } = await supabase
    .from('appointment_types')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
  
  console.log(`\nTotal appointment types for Atlas Fitness: ${count}`)
}

async function addToBookingTypes(orgId) {
  const bookingTypes = [
    {
      name: 'Personal Training Session',
      duration: 60,
      description: 'One-on-one personal training session',
      org_id: orgId,
      is_active: true
    },
    {
      name: 'Fitness Assessment',
      duration: 45,
      description: 'Initial fitness assessment and goal setting',
      org_id: orgId,
      is_active: true
    },
    {
      name: 'Nutrition Consultation',
      duration: 30,
      description: 'Nutrition planning and dietary advice',
      org_id: orgId,
      is_active: true
    },
    {
      name: 'Group Class',
      duration: 60,
      description: 'Group fitness class',
      org_id: orgId,
      is_active: true
    }
  ]
  
  console.log('Adding booking types...')
  
  for (const type of bookingTypes) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('booking_types')
      .select('id')
      .eq('name', type.name)
      .eq('org_id', orgId)
      .single()
    
    if (existing) {
      console.log(`✓ Booking type "${type.name}" already exists`)
      continue
    }
    
    const { data, error } = await supabase
      .from('booking_types')
      .insert(type)
      .select()
      .single()
    
    if (error) {
      console.error(`✗ Error adding "${type.name}":`, error.message)
    } else {
      console.log(`✓ Added booking type "${type.name}"`)
    }
  }
  
  // Check total count
  const { count } = await supabase
    .from('booking_types')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
  
  console.log(`\nTotal booking types for Atlas Fitness: ${count}`)
}

addBookingTypes().catch(console.error)