import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { Resend } from 'resend'
import { requireAuth, createOrgScopedClient } from '@/lib/auth-middleware'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: NextRequest) {
  // Authentication check
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  
  // Create organization-scoped Supabase client
  const supabase = createOrgScopedClient(auth.organizationId)
  
  try {
    const { email, customerId } = await request.json()
    
    if (!email && !customerId) {
      return NextResponse.json(
        { error: 'Email or customer ID required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    
    // Get customer details
    let customerEmail = email
    let customerName = ''
    
    if (customerId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('email, first_name, last_name')
        .eq('id', customerId)
        .single()
        
      if (customer) {
        customerEmail = customer.email
        customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      }
    } else if (email) {
      const { data: customer } = await supabase
        .from('customers')
        .select('first_name, last_name')
        .eq('email', email)
        .single()
        
      if (customer) {
        customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      }
    }
    
    if (!customerEmail) {
      return NextResponse.json(
        { error: 'Customer email not found' },
        { status: 404 }
      )
    }

    // Generate magic link using Supabase Auth
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: customerEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'}/booking`
      }
    })

    if (error || !data) {
      console.error('Error generating magic link:', error)
      return NextResponse.json(
        { error: 'Failed to generate magic link' },
        { status: 500 }
      )
    }

    // Try to send with Resend first
    try {
      if (!resend) {
        throw new Error('Email service not configured')
      }
      const { error: emailError } = await resend.emails.send({
        from: 'GymLeadHub <sam@gymleadhub.co.uk>',
        to: customerEmail,
        subject: 'Your Login Link - Atlas Fitness',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome${customerName ? ` ${customerName}` : ''}!</h2>
            <p>Click the link below to access your Atlas Fitness account:</p>
            <a href="${data.properties.action_link}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Log In to Your Account
            </a>
            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this link, you can safely ignore this email.</p>
          </div>
        `
      })

      if (emailError) {
        console.error('Resend error:', emailError)
        // Return the magic link directly if email fails
        return NextResponse.json({
          success: true,
          message: `Email service unavailable. Use this link to log in:`,
          email: customerEmail,
          customer: customerName,
          magicLink: data.properties.action_link,
          note: 'Copy this link and open it in your browser. It expires in 1 hour.'
        })
      }
    } catch (error) {
      console.error('Resend exception:', error)
      // Return the magic link directly if email fails
      return NextResponse.json({
        success: true,
        message: `Email service unavailable. Use this link to log in:`,
        email: customerEmail,
        customer: customerName,
        magicLink: data.properties.action_link,
        note: 'Copy this link and open it in your browser. It expires in 1 hour.'
      })
    }

    return NextResponse.json({
      success: true,
      message: `Login link sent to ${customerEmail}`,
      email: customerEmail,
      customer: customerName
    })

  } catch (error) {
    console.error('Error in send-login-link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}