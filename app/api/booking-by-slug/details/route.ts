import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/lib/supabase/database.types'

export async function GET(request: NextRequest) {
  try {
    // This endpoint is public to allow embedding booking widgets
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }
    
    // Create a direct Supabase client with service role key for public access
    // This bypasses RLS and authentication requirements
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json({ 
        error: 'Service configuration error',
        message: 'Database connection not properly configured' 
      }, { status: 500 })
    }
    
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Get booking link details
    const { data: bookingLink, error: linkError } = await supabase
      .from('booking_links')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    
    if (linkError || !bookingLink) {
      return NextResponse.json({ error: 'Booking link not found' }, { status: 404 })
    }

    if (!bookingLink.is_active || !bookingLink.is_public) {
      return NextResponse.json({ error: 'Booking link is not available' }, { status: 403 })
    }

    // Get appointment types
    const { data: appointmentTypes, error: atError } = await supabase
      .from('appointment_types')
      .select('*')
      .in('id', bookingLink.appointment_type_ids)
      .eq('is_active', true)

    if (atError) {
      console.error('Error fetching appointment types:', atError)
    }

    // Get form fields
    const { data: formFieldsData, error: ffError } = await supabase
      .from('booking_form_fields')
      .select('*')
      .eq('booking_link_id', bookingLink.id)
      .eq('is_active', true)
      .order('display_order')

    if (ffError) {
      console.error('Error fetching form fields:', ffError)
    }
    
    const formFields = (formFieldsData || []).map(field => ({
      id: field.id,
      name: field.name,
      label: field.label,
      type: field.type,
      options: field.options,
      required: field.required,
      placeholder: field.placeholder,
      validation_rules: field.validation_rules,
      display_order: field.display_order
    }))

    // Get organization details for branding
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, logo_url, website, phone, address')
      .eq('id', bookingLink.organization_id)
      .single()

    if (orgError) {
      console.error('Error fetching organization:', orgError)
    }

    // Get equipment requirements for gym bookings
    const { data: equipmentData, error: eqError } = await supabase
      .from('booking_equipment_requirements')
      .select('*')
      .eq('booking_link_id', bookingLink.id)

    if (eqError) {
      console.error('Error fetching equipment requirements:', eqError)
    }
    
    const equipmentRequirements = (equipmentData || []).map(eq => ({
      name: eq.name,
      type: eq.type,
      required: eq.required,
      alternatives: eq.alternatives || []
    }))

    // Get assigned staff details
    let assignedStaff = []
    if (bookingLink.assigned_staff_ids?.length) {
      const { data: staff, error: staffError } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, title')
        .in('id', bookingLink.assigned_staff_ids)

      if (!staffError && staff) {
        // Get specializations for each staff member
        for (const staffMember of staff) {
          const { data: specData, error: specError } = await supabase
            .from('trainer_specializations')
            .select('*')
            .eq('staff_id', staffMember.id)
            .eq('is_active', true)
          
          if (specError) {
            console.error('Error fetching trainer specializations:', specError)
          }
          
          const specializations = (specData || []).map(s => ({
            type: s.type,
            certification: s.certification,
            active: s.active
          }))
          
          assignedStaff.push({
            ...staffMember,
            specializations
          })
        }
      }
    }

    return NextResponse.json({
      booking_link: {
        id: bookingLink.id,
        slug: bookingLink.slug,
        name: bookingLink.name,
        description: bookingLink.description,
        type: bookingLink.type,
        meeting_location: bookingLink.meeting_location,
        confirmation_settings: bookingLink.confirmation_settings,
        style_settings: bookingLink.style_settings,
        payment_settings: bookingLink.payment_settings,
        cancellation_policy: bookingLink.cancellation_policy,
        booking_limits: bookingLink.booking_limits,
        timezone: bookingLink.timezone
      },
      appointment_types: appointmentTypes || [],
      form_fields: formFields,
      organization: organization || {},
      equipment_requirements: equipmentRequirements,
      assigned_staff: assignedStaff
    })

  } catch (error) {
    // Log the actual error for debugging
    console.error('Error in /api/booking-by-slug/details:', error)
    
    // Always return JSON response even on error
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch booking link details',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}