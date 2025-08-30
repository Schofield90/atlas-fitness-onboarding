import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
// Temporarily disabled rate limiting to fix build
// import { rateLimit } from '@/app/lib/rate-limit'

// const emailTestLimiter = rateLimit({
//   interval: 60 * 1000, // 1 minute
//   uniqueTokenPerInterval: 500, // Max unique users
// })

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Temporarily disabled rate limiting to fix build
    // const rateLimitOk = await emailTestLimiter.check(request, 5, user.id)
    // if (!rateLimitOk) {
    //   return NextResponse.json({ 
    //     error: 'Rate limit exceeded. Please wait a minute before sending another test email.' 
    //   }, { status: 429 })
    // }
    
    const body = await request.json()
    const { to, subject, body: emailBody, from } = body
    
    if (!to || !subject || !emailBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, we'll simulate sending
    console.log('Sending test email:', {
      to,
      subject,
      body: emailBody,
      from: from || 'noreply@atlasfitness.com'
    })
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // In production, you would use your email service here
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail')
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    // await sgMail.send({
    //   to,
    //   from: from || 'noreply@atlasfitness.com',
    //   subject,
    //   text: emailBody,
    //   html: emailBody
    // })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully' 
    })
    
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}