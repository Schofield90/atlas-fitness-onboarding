import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { sendEmail } from '@/app/lib/services/email'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { to, fromName, fromEmail, subject, html, organizationId } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get organization email settings
    const { data: orgSettings } = await supabase
      .from('organizations')
      .select('email_from_name, email_from_address')
      .eq('id', organizationId)
      .single()

    const finalFromName = fromName || orgSettings?.email_from_name || 'Atlas Fitness'
    const finalFromEmail = fromEmail || orgSettings?.email_from_address || 'noreply@atlasfitness.com'

    // Send test email
    const result = await sendEmail({
      to,
      from: `${finalFromName} <${finalFromEmail}>`,
      subject,
      html,
      organizationId
    })

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test email sent successfully' 
      })
    } else {
      throw new Error(result.error || 'Failed to send email')
    }
  } catch (error: any) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    )
  }
}