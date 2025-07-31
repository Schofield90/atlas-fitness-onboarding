import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { EmailService } from '@/app/lib/services/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      organizationId,
      to,
      subject,
      html,
      text,
      templateId,
      variables = {},
      tags = [],
      metadata = {}
    } = body

    // Validate required fields
    if (!organizationId || !to || !subject || (!html && !templateId)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Initialize email service
    const emailService = new EmailService(organizationId)

    // Send email
    const success = await emailService.sendEmail({
      to,
      subject,
      html,
      text,
      templateId,
      variables,
      tags,
      metadata
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in email send API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get email configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      )
    }

    const emailService = new EmailService(organizationId)
    const config = await emailService.getEmailConfiguration()

    if (!config) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 404 }
      )
    }

    // Return safe configuration (no API keys)
    const safeConfig = {
      id: config.id,
      service_type: config.service_type,
      subdomain: config.subdomain,
      custom_domain: config.custom_domain,
      dns_verified: config.dns_verified,
      from_name: config.from_name,
      from_email: config.from_email,
      reply_to_email: config.reply_to_email,
      daily_limit: config.daily_limit,
      is_active: config.is_active,
      setup_completed: config.setup_completed
    }

    return NextResponse.json({ config: safeConfig })

  } catch (error) {
    console.error('Error in email config API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}