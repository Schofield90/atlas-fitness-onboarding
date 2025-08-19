import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { sendEmail } from '@/app/lib/services/email'
import { sendSMS } from '@/app/lib/services/twilio'
import { sendWhatsAppMessage } from '@/app/lib/services/twilio'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      organizationId, 
      recipient, 
      channels, 
      subject, 
      message, 
      notificationType 
    } = await request.json()

    if (!recipient || !channels || channels.length === 0 || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const results = []

    // Send via selected channels
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            if (recipient.email) {
              const emailResult = await sendEmail({
                to: recipient.email,
                from: 'Atlas Fitness <notifications@atlasfitness.com>',
                subject: subject || `${notificationType.toUpperCase()}: Staff Notification`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                      <h2 style="margin: 0;">Staff Notification</h2>
                      <p style="margin: 5px 0 0 0; opacity: 0.9;">Type: ${notificationType}</p>
                    </div>
                    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                      <p style="color: #374151; line-height: 1.6;">${message}</p>
                      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                      <p style="color: #6b7280; font-size: 12px;">
                        This is an automated notification from your Atlas Fitness CRM system.
                      </p>
                    </div>
                  </div>
                `,
                organizationId
              })
              results.push({ channel: 'email', success: emailResult.success })
            }
            break

          case 'sms':
            if (recipient.phone) {
              const smsResult = await sendSMS({
                to: recipient.phone,
                message: `[${notificationType.toUpperCase()}] ${message}`,
                organizationId
              })
              results.push({ channel: 'sms', success: smsResult.success })
            }
            break

          case 'whatsapp':
            if (recipient.phone) {
              const whatsappResult = await sendWhatsAppMessage({
                to: recipient.phone,
                message: `*${notificationType.toUpperCase()}*\n\n${message}`,
                organizationId
              })
              results.push({ channel: 'whatsapp', success: whatsappResult.success })
            }
            break

          case 'telegram':
            // Telegram integration would go here
            // For now, we'll skip it as it requires additional setup
            results.push({ channel: 'telegram', success: false, message: 'Telegram not yet configured' })
            break
        }
      } catch (channelError) {
        console.error(`Error sending via ${channel}:`, channelError)
        results.push({ channel, success: false })
      }
    }

    const allSuccessful = results.every(r => r.success)

    if (allSuccessful) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test notification sent successfully',
        results
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Some notifications failed to send',
        results
      })
    }
  } catch (error: any) {
    console.error('Error sending test internal message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send test notification' },
      { status: 500 }
    )
  }
}