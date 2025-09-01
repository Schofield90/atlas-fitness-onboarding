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

    // Get appointment types (simplified for current schema)
    let appointmentTypes = []
    if (bookingLink.appointment_type_ids?.length) {
      const { data: atData, error: atError } = await supabase
        .from('appointment_types')
        .select('*')
        .in('id', bookingLink.appointment_type_ids)
        .eq('is_active', true)

      if (!atError && atData) {
        appointmentTypes = atData.map(at => ({
          id: at.id,
          name: at.name,
          description: at.description,
          duration_minutes: at.duration_minutes,
          session_type: 'personal_training',
          max_capacity: 1,
          fitness_level: 'any',
          price_pennies: 0
        }))
      }
    }

    // If no appointment types found, create default one
    if (appointmentTypes.length === 0) {
      appointmentTypes = [{
        id: 'default',
        name: bookingLink.name || 'Consultation',
        description: bookingLink.description || 'Book a consultation call',
        duration_minutes: 30,
        session_type: 'personal_training',
        max_capacity: 1,
        fitness_level: 'any',
        price_pennies: 0
      }]
    }

    // Use default form fields for now
    const formFields = []

    // Get organization details for branding
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, logo_url, website, phone, address')
      .eq('id', bookingLink.organization_id)
      .single()

    if (orgError) {
      console.error('Error fetching organization:', orgError)
    }

    // Default equipment requirements
    const equipmentRequirements = []

    // Get assigned staff details - simplified to organization owner for now
    let assignedStaff = []
    if (bookingLink.user_id) {
      const { data: staff, error: staffError } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, title')
        .eq('id', bookingLink.user_id)
        .single()

      if (!staffError && staff) {
        assignedStaff = [{
          id: staff.id,
          full_name: staff.full_name || 'Staff Member',
          avatar_url: staff.avatar_url,
          title: staff.title || 'Trainer',
          specializations: []
        }]
      }
    }

    // If no staff found, create a default staff member
    if (assignedStaff.length === 0) {
      assignedStaff = [{
        id: 'default-staff',
        full_name: 'Atlas Fitness Trainer',
        avatar_url: null,
        title: 'Personal Trainer',
        specializations: []
      }]
    }

    return NextResponse.json({
      booking_link: {
        id: bookingLink.id,
        slug: bookingLink.slug,
        name: bookingLink.name,
        description: bookingLink.description,
        type: bookingLink.type,
        meeting_location: {
          type: 'video_call',
          details: 'Video call link will be provided',
          zoom_link: null
        },
        confirmation_settings: {
          auto_confirm: true,
          custom_message: 'Your booking has been confirmed!'
        },
        style_settings: {
          primary_color: '#f97316',
          background_color: '#ffffff',
          text_color: '#1f2937',
          logo_url: organization?.logo_url || null,
          custom_css: null
        },
        payment_settings: {
          enabled: false,
          amount: 0,
          currency: 'GBP',
          description: null
        },
        cancellation_policy: {
          allowed: true,
          hours_before: 24,
          policy_text: 'Cancellations must be made at least 24 hours in advance.'
        },
        form_configuration: {
          fields: [],
          consent_text: 'I agree to the terms and conditions and privacy policy.'
        },
        booking_limits: {
          max_per_day: null,
          max_per_week: null,
          max_per_month: null
        },
        timezone: 'Europe/London'
      },
      appointment_types: appointmentTypes || [],
      form_fields: formFields,
      organization: organization || { name: 'Atlas Fitness' },
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