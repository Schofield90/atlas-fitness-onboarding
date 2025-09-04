import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import nodemailer from 'nodemailer'

// Create reusable transporter
const createTransporter = () => {
  // Check for different email providers
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Generic SMTP
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    // Gmail
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    })
  } else if (process.env.SENDGRID_API_KEY) {
    // SendGrid
    return nodemailer.createTransporter({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    })
  } else if (process.env.MAILGUN_SMTP_PASSWORD) {
    // Mailgun
    return nodemailer.createTransporter({
      host: process.env.MAILGUN_SMTP_HOST || 'smtp.mailgun.org',
      port: 587,
      auth: {
        user: process.env.MAILGUN_SMTP_USER || 'postmaster@your-domain.com',
        pass: process.env.MAILGUN_SMTP_PASSWORD
      }
    })
  }
  
  return null
}

// Try Resend API first
async function sendWithResend(to: string, subject: string, body: string) {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'Resend not configured' }
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'GymLeadHub <sam@gymleadhub.co.uk>',
        to: [to],
        subject: subject,
        html: body.replace(/\n/g, '<br/>')
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.message || 'Resend API error' }
    }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const body = await request.json()
    const { to, subject, body: emailBody, preheader } = body
    
    if (!to || !subject || !emailBody) {
      return NextResponse.json({ 
        error: 'Missing required fields: to, subject, and body are required' 
      }, { status: 400 })
    }
    
    // Format the email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f97316; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        ${preheader ? `<div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
        <div class="container">
          <div class="header">
            <h1>Atlas Fitness</h1>
          </div>
          <div class="content">
            ${emailBody.replace(/\n/g, '<br/>')}
          </div>
          <div class="footer">
            <p>© 2025 Atlas Fitness. All rights reserved.</p>
            <p>This is a test email from your Atlas Fitness CRM</p>
          </div>
        </div>
      </body>
      </html>
    `
    
    // Try Resend first
    const resendResult = await sendWithResend(to, subject, htmlContent)
    if (resendResult.success) {
      // Log the email send
      await supabase
        .from('email_logs')
        .insert({
          to_email: to,
          from_email: process.env.RESEND_FROM || 'test@atlas-fitness.com',
          subject: subject,
          body: emailBody,
          status: 'sent',
          provider: 'resend',
          sent_at: new Date().toISOString()
        })
        .catch(err => console.log('Failed to log email:', err))
      
      return NextResponse.json({ 
        success: true, 
        message: 'Test email sent successfully via Resend' 
      })
    }
    
    // Try SMTP if Resend fails
    const transporter = createTransporter()
    
    if (!transporter) {
      return NextResponse.json({ 
        error: 'No email service configured. Please set up SMTP, Gmail, SendGrid, Mailgun, or Resend in environment variables.' 
      }, { status: 500 })
    }
    
    // Send email via SMTP
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.GMAIL_USER || 'GymLeadHub <sam@gymleadhub.co.uk>',
      to: to,
      subject: subject,
      html: htmlContent
    })
    
    // Log the email send
    await supabase
      .from('email_logs')
      .insert({
        to_email: to,
        from_email: process.env.SMTP_FROM || process.env.GMAIL_USER || 'noreply@atlas-fitness.com',
        subject: subject,
        body: emailBody,
        status: 'sent',
        provider: 'smtp',
        sent_at: new Date().toISOString()
      })
      .catch(err => console.log('Failed to log email:', err))
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully',
      messageId: info.messageId 
    })
    
  } catch (error: any) {
    console.error('Send test email error:', error)
    
    // Provide helpful error messages
    if (error.message?.includes('EAUTH')) {
      return NextResponse.json({ 
        error: 'Email authentication failed. Please check your email credentials in environment variables.' 
      }, { status: 500 })
    }
    
    if (error.message?.includes('ENOTFOUND')) {
      return NextResponse.json({ 
        error: 'Email server not found. Please check your SMTP host settings.' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to send test email', 
      details: error.message 
    }, { status: 500 })
  }
}