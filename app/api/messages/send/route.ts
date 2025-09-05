import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { leadId, type, to, subject, body: messageBody } = body

    if (!leadId || !type || !to || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get org id
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!userOrg?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Prepare insert payload based on type
    const insertPayload: any = {
      organization_id: userOrg.organization_id,
      lead_id: leadId,
      user_id: user.id,
      type,
      direction: 'outbound',
      status: 'pending',
      body: type === 'email' ? (messageBody as string) : (messageBody as string),
      created_at: new Date().toISOString()
    }

    if (type === 'email') {
      insertPayload.subject = subject || 'Message from Atlas Fitness'
      insertPayload.to_email = to
    } else {
      // sms or whatsapp
      insertPayload.to_number = to
    }

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: inserted?.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send message' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { sendSMS, sendWhatsAppMessage } from '@/app/lib/services/twilio'
import { Resend } from 'resend'

const resendKey = process.env.RESEND_API_KEY
const resend = resendKey ? new Resend(resendKey) : null

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const supabase = await createClient()
    const adminSupabase = createAdminClient() // Use admin client for logging
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

    // For now, skip creating message record since the tables don't exist
    // We'll send the message directly
    let message = { id: 'temp-' + Date.now() }
    let messageError = null

    // Message creation removed - using existing logging tables

    // Send the message
    try {
      let result
      let externalId

      switch (type) {
        case 'sms':
          result = await sendSMS({ to, body: messageBody })
          if (!result.success) {
            throw new Error(result.error || 'Failed to send SMS')
          }
          externalId = result.messageId
          break

        case 'whatsapp':
          result = await sendWhatsAppMessage({ to, body: messageBody })
          if (!result.success) {
            throw new Error(result.error || 'Failed to send WhatsApp message')
          }
          externalId = result.messageId
          break

        case 'email':
          if (!process.env.RESEND_API_KEY) {
            throw new Error('Email service not configured')
          }
          
          const fromEmail = process.env.RESEND_FROM_EMAIL || 'sam@atlas-gyms.co.uk'
          console.log('Sending email with Resend:', {
            from: `Atlas Fitness <${fromEmail}>`,
            to,
            subject,
            hasApiKey: !!process.env.RESEND_API_KEY
          })
          
          if (!resend) {
            throw new Error('Resend not configured')
          }
          
          result = await resend.emails.send({
            from: `Atlas Fitness <${fromEmail}>`,
            to,
            subject,
            text: messageBody,
            html: `<p>${messageBody.replace(/\n/g, '<br>')}</p>`,
            replyTo: userWithOrg.email
          })
          
          if ('error' in result && result.error) {
            throw new Error(result.error.message || 'Failed to send email')
          }
          
          externalId = result.data?.id
          break

        default:
          throw new Error(`Unsupported message type: ${type}`)
      }

      // Log to appropriate table based on type using admin client
      if (type === 'sms') {
        const { error: logError } = await adminSupabase
          .from('sms_logs')
          .insert({
            message_id: externalId,
            to,
            from_number: process.env.TWILIO_SMS_FROM,
            message: messageBody,
            status: 'sent',
          })
        
        if (logError) {
          console.error('Failed to log SMS:', logError)
        }
      } else if (type === 'whatsapp') {
        const { error: logError } = await adminSupabase
          .from('whatsapp_logs')
          .insert({
            message_id: externalId,
            to,
            from_number: process.env.TWILIO_WHATSAPP_FROM,
            message: messageBody,
            status: 'sent',
          })
        
        if (logError) {
          console.error('Failed to log WhatsApp:', logError)
        }
      } else if (type === 'email') {
        const emailLog = {
          message_id: externalId,
          to_email: to,
          from_email: process.env.RESEND_FROM_EMAIL || 'sam@atlas-gyms.co.uk',
          subject,
          message: messageBody,
          status: 'sent',
        }
        
        console.log('Inserting email log:', emailLog)
        console.log('Email external ID:', externalId)
        console.log('Email to:', to)
        console.log('Email subject:', subject)
        
        const { data: insertedLog, error: insertError } = await adminSupabase
          .from('email_logs')
          .insert(emailLog)
          .select()
          .single()
        
        if (insertError) {
          console.error('Failed to insert email log:', {
            error: insertError,
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint
          })
        } else {
          console.log('Email log inserted successfully:', insertedLog)
        }
      }

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
      
      // Log error to appropriate table
      const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error'
      const errorCode = (sendError as any)?.code || 'UNKNOWN'
      
      if (type === 'sms') {
        await adminSupabase
          .from('sms_logs')
          .insert({
            to,
            from_number: process.env.TWILIO_SMS_FROM,
            message: messageBody,
            status: 'failed',
            error: `${errorCode}: ${errorMessage}`,
          })
      } else if (type === 'whatsapp') {
        await adminSupabase
          .from('whatsapp_logs')
          .insert({
            to,
            from_number: process.env.TWILIO_WHATSAPP_FROM,
            message: messageBody,
            status: 'failed',
            error: `${errorCode}: ${errorMessage}`,
          })
      } else if (type === 'email') {
        await adminSupabase
          .from('email_logs')
          .insert({
            to_email: to,
            from_email: process.env.RESEND_FROM_EMAIL || 'sam@atlas-gyms.co.uk',
            subject,
            message: messageBody,
            status: 'failed',
            error: `${errorCode}: ${errorMessage}`,
          })
      }

      return NextResponse.json({
        error: 'Failed to send message',
        details: sendError instanceof Error ? sendError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    return createErrorResponse(error)
  }
}