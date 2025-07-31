import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/client'
import { EmailService } from '@/app/lib/services/email'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const category = searchParams.get('category')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      )
    }

    const emailService = new EmailService(organizationId)
    const templates = await emailService.getEmailTemplates(category || undefined)

    return NextResponse.json({ templates })

  } catch (error) {
    console.error('Error fetching email templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      organizationId,
      name,
      description,
      category = 'general',
      subject,
      html_content,
      text_content,
      variables = [],
      is_active = true
    } = body

    if (!organizationId || !name || !subject || !html_content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const emailService = new EmailService(organizationId)
    const success = await emailService.saveEmailTemplate({
      name,
      description,
      category,
      subject,
      html_content,
      text_content,
      variables,
      is_active
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error saving email template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      organizationId,
      name,
      description,
      category,
      subject,
      html_content,
      text_content,
      variables,
      is_active
    } = body

    if (!id || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const emailService = new EmailService(organizationId)
    const success = await emailService.saveEmailTemplate({
      id,
      name,
      description,
      category,
      subject,
      html_content,
      text_content,
      variables,
      is_active
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating email template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')
    const organizationId = searchParams.get('organizationId')

    if (!templateId || !organizationId) {
      return NextResponse.json(
        { error: 'Template ID and Organization ID required' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', templateId)
      .eq('organization_id', organizationId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting email template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}