import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/app/lib/services/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, testEmail } = body

    if (!organizationId || !testEmail) {
      return NextResponse.json(
        { error: 'Organization ID and test email required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const emailService = new EmailService(organizationId)
    
    // Check if email service is configured
    const config = await emailService.getEmailConfiguration()
    if (!config || !config.setup_completed) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 400 }
      )
    }

    // Send test email
    const success = await emailService.sendEmail({
      to: testEmail,
      subject: `Test Email from ${config.from_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Service Test</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">Configuration Details:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Service Type:</strong> ${config.service_type === 'shared' ? 'Shared Server' : 'Dedicated Server'}</li>
              <li><strong>From Email:</strong> ${config.from_email}</li>
              ${config.service_type === 'shared' 
                ? `<li><strong>Domain:</strong> ${config.subdomain}.${config.shared_domain}</li>`
                : `<li><strong>Custom Domain:</strong> ${config.custom_domain}</li>`
              }
              <li><strong>Daily Limit:</strong> ${config.daily_limit} emails</li>
            </ul>
          </div>
          
          <p>If you received this email, your email service is configured correctly and ready to use!</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This test email was sent from your GymLeadHub CRM system.<br>
            Time: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
      text: `
Email Service Test

This is a test email to verify your email configuration is working correctly.

Configuration Details:
- Service Type: ${config.service_type === 'shared' ? 'Shared Server' : 'Dedicated Server'}
- From Email: ${config.from_email}
${config.service_type === 'shared' 
  ? `- Domain: ${config.subdomain}.${config.shared_domain}`
  : `- Custom Domain: ${config.custom_domain}`
}
- Daily Limit: ${config.daily_limit} emails

If you received this email, your email service is configured correctly and ready to use!

This test email was sent from your GymLeadHub CRM system.
Time: ${new Date().toLocaleString()}
      `,
      tags: ['test'],
      metadata: {
        test_email: true,
        sent_at: new Date().toISOString()
      }
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send test email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully' 
    })

  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}