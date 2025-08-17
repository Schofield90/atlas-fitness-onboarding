import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { generateToken } from '@/app/lib/token'
import { Resend } from 'resend'
import { createTwilioClient } from '@/app/lib/twilio'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: NextRequest) {
  try {
    const { email, name, clientId, sendEmail, sendSMS } = await request.json()
    
    if (!email || !clientId) {
      return NextResponse.json({ error: 'Email and client ID are required' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    
    // Get client details including phone number
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*, organization_id')
      .eq('id', clientId)
      .single()
      
    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    
    // Generate magic link token
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour expiry
    
    // Store the token
    const { error: tokenError } = await supabase
      .from('magic_links')
      .insert({
        token,
        client_id: clientId,
        organization_id: client.organization_id,
        expires_at: expiresAt.toISOString(),
        used: false
      })
      
    if (tokenError) {
      console.error('Token storage error:', tokenError)
      return NextResponse.json({ error: 'Failed to create magic link' }, { status: 500 })
    }
    
    // Create the magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'
    const magicLink = `${baseUrl}/auth/magic-link?token=${token}`
    
    const results = {
      email: false,
      sms: false,
      errors: [] as string[]
    }
    
    // Send email if requested
    if (sendEmail) {
      try {
        await resend.emails.send({
          from: 'Atlas Fitness <noreply@atlas-gyms.co.uk>',
          to: email,
          subject: 'Your Login Link - Atlas Fitness',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hi ${name || 'there'},</h2>
              <p>Click the link below to access your Atlas Fitness account and book classes:</p>
              <a href="${magicLink}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Access Your Account
              </a>
              <p>Or copy and paste this link:</p>
              <p style="color: #666; word-break: break-all;">${magicLink}</p>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                This link will expire in 24 hours. If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          `
        })
        results.email = true
      } catch (emailError: any) {
        console.error('Email send error:', emailError)
        results.errors.push(`Email: ${emailError.message}`)
      }
    }
    
    // Send SMS if requested and phone number exists
    if (sendSMS && client.phone) {
      try {
        const twilio = createTwilioClient()
        
        // Normalize phone number (add +44 if needed)
        let phoneNumber = client.phone
        if (phoneNumber.startsWith('07')) {
          phoneNumber = '+44' + phoneNumber.substring(1)
        } else if (phoneNumber.startsWith('7')) {
          phoneNumber = '+44' + phoneNumber
        } else if (!phoneNumber.startsWith('+')) {
          phoneNumber = '+44' + phoneNumber
        }
        
        await twilio.messages.create({
          body: `Hi ${name || 'there'}, here's your Atlas Fitness login link: ${magicLink}`,
          from: process.env.TWILIO_SMS_FROM,
          to: phoneNumber
        })
        
        results.sms = true
      } catch (smsError: any) {
        console.error('SMS send error:', smsError)
        results.errors.push(`SMS: ${smsError.message}`)
      }
    }
    
    // Return success if at least one method succeeded
    if (results.email || results.sms) {
      return NextResponse.json({
        success: true,
        sent: {
          email: results.email,
          sms: results.sms
        },
        errors: results.errors.length > 0 ? results.errors : undefined
      })
    } else {
      return NextResponse.json({
        error: 'Failed to send login link',
        details: results.errors
      }, { status: 500 })
    }
    
  } catch (error: unknown) {
    console.error('Send magic link error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" || 'Internal error' }, { status: 500 })
  }
}