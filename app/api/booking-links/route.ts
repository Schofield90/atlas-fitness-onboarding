import { NextRequest, NextResponse } from 'next/server'
import { bookingLinkService } from '@/app/lib/services/booking-link'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const bookingLinks = await bookingLinkService.listBookingLinks(orgMember.org_id)
    return NextResponse.json({ booking_links: bookingLinks })

  } catch (error) {
    console.error('Error fetching booking links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking links' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    
    // Validate the configuration
    const validation = await bookingLinkService.validateBookingLinkConfig({
      ...body,
      organization_id: orgMember.org_id,
      user_id: user.id
    })

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid configuration', details: validation.errors },
        { status: 400 }
      )
    }

    // Create the booking link
    const bookingLink = await bookingLinkService.createBookingLink({
      ...body,
      organization_id: orgMember.org_id,
      user_id: user.id,
      // Set default values
      meeting_title_template: body.meeting_title_template || '{{contact.name}} - {{service}}',
      meeting_location: body.meeting_location || { type: 'in_person', details: '' },
      availability_rules: body.availability_rules || {},
      form_configuration: body.form_configuration || {
        fields: [],
        consent_text: 'I agree to receive communications about my booking.'
      },
      confirmation_settings: body.confirmation_settings || {
        auto_confirm: true,
        redirect_url: '',
        custom_message: ''
      },
      notification_settings: body.notification_settings || {
        email_enabled: true,
        sms_enabled: false,
        reminder_schedules: ['1 day', '1 hour'],
        cancellation_notifications: true
      },
      style_settings: body.style_settings || {
        primary_color: '#3b82f6',
        background_color: '#ffffff',
        text_color: '#1f2937'
      },
      payment_settings: body.payment_settings || {
        enabled: false,
        amount: 0,
        currency: 'GBP',
        description: ''
      },
      cancellation_policy: body.cancellation_policy || {
        allowed: true,
        hours_before: 24,
        policy_text: 'Cancellations allowed up to 24 hours before appointment.'
      },
      booking_limits: body.booking_limits || {},
      buffer_settings: body.buffer_settings || {
        before_minutes: 0,
        after_minutes: 15
      }
    })

    return NextResponse.json({ booking_link: bookingLink }, { status: 201 })

  } catch (error) {
    console.error('Error creating booking link:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create booking link' },
      { status: 500 }
    )
  }
}