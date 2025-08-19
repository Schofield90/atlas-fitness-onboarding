import { NextRequest, NextResponse } from 'next/server'
import { bookingLinkService } from '@/app/lib/services/booking-link'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // This endpoint is public to allow embedding booking widgets
    
    const bookingLink = await bookingLinkService.getBookingLink(params.slug)
    if (!bookingLink) {
      return NextResponse.json({ error: 'Booking link not found' }, { status: 404 })
    }

    if (!bookingLink.is_active || !bookingLink.is_public) {
      return NextResponse.json({ error: 'Booking link is not available' }, { status: 403 })
    }

    // Get appointment types
    const { data: appointmentTypes, error: atError } = await bookingLinkService['supabase']
      .from('appointment_types')
      .select('*')
      .in('id', bookingLink.appointment_type_ids)
      .eq('is_active', true)

    if (atError) {
      console.error('Error fetching appointment types:', atError)
    }

    // Get form fields
    const formFields = await bookingLinkService.getFormFields(bookingLink.id)

    // Get organization details for branding
    const { data: organization, error: orgError } = await bookingLinkService['supabase']
      .from('organizations')
      .select('name, logo_url, website, phone, address')
      .eq('id', bookingLink.organization_id)
      .single()

    if (orgError) {
      console.error('Error fetching organization:', orgError)
    }

    // Get equipment requirements for gym bookings
    const equipmentRequirements = await bookingLinkService.getEquipmentRequirements(bookingLink.id)

    // Get assigned staff details
    let assignedStaff = []
    if (bookingLink.assigned_staff_ids?.length) {
      const { data: staff, error: staffError } = await bookingLinkService['supabase']
        .from('users')
        .select('id, full_name, avatar_url, title')
        .in('id', bookingLink.assigned_staff_ids)

      if (!staffError && staff) {
        // Get specializations for each staff member
        for (const staffMember of staff) {
          const specializations = await bookingLinkService.getTrainerSpecializations(staffMember.id)
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
    console.error('Error fetching booking link details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking link details' },
      { status: 500 }
    )
  }
}