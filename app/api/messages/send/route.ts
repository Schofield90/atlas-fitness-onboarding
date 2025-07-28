import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { sendSMS, sendWhatsApp } from '@/app/lib/services/twilio'
import { sendEmail } from '@/app/lib/email/send-email'

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const { leadId, type, to, subject, body: messageBody } = body

    // Validate input
    if (!leadId || !type || !to || !messageBody) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['leadId', 'type', 'to', 'body']
      }, { status: 400 })
    }

    if (type === 'email' && !subject) {
      return NextResponse.json({
        error: 'Email subject is required'
      }, { status: 400 })
    }

    // Verify lead belongs to organization
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', userWithOrg.organizationId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Create message record
    const messageData = {
      organization_id: userWithOrg.organizationId,
      lead_id: leadId,
      user_id: userWithOrg.id,
      type,
      direction: 'outbound',
      status: 'pending',
      subject: type === 'email' ? subject : null,
      body: messageBody,
      from_email: type === 'email' ? userWithOrg.email : null,
      to_email: type === 'email' ? to : null,
      from_number: type !== 'email' ? process.env.TWILIO_SMS_FROM : null,
      to_number: type !== 'email' ? to : null,
    }

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message record:', messageError)
      return NextResponse.json({ error: 'Failed to create message record' }, { status: 500 })
    }

    // Send the message
    try {
      let result
      let externalId

      switch (type) {
        case 'sms':
          result = await sendSMS(to, messageBody)
          externalId = result.sid
          break

        case 'whatsapp':
          result = await sendWhatsApp(to, messageBody)
          externalId = result.sid
          break

        case 'email':
          result = await sendEmail({
            to,
            subject,
            text: messageBody,
            from: `Atlas Fitness <${process.env.RESEND_FROM_EMAIL || 'noreply@atlas-fitness.com'}>`,
            replyTo: userWithOrg.email
          })
          externalId = result.id
          break

        default:
          throw new Error(`Unsupported message type: ${type}`)
      }

      // Update message with success status
      await supabase
        .from('messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          twilio_sid: type !== 'email' ? externalId : null,
          resend_id: type === 'email' ? externalId : null,
        })
        .eq('id', message.id)

      return NextResponse.json({
        success: true,
        message: {
          id: message.id,
          type,
          status: 'sent',
          externalId
        }
      })

    } catch (sendError) {
      console.error('Error sending message:', sendError)
      
      // Update message with error status
      await supabase
        .from('messages')
        .update({
          status: 'failed',
          error_message: sendError instanceof Error ? sendError.message : 'Unknown error',
          error_code: (sendError as any)?.code || 'UNKNOWN'
        })
        .eq('id', message.id)

      return NextResponse.json({
        error: 'Failed to send message',
        details: sendError instanceof Error ? sendError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    return createErrorResponse(error)
  }
}