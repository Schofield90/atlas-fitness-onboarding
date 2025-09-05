import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Initialize Resend with a fallback for build time
const resendApiKey = process.env.RESEND_API_KEY || 'placeholder-key';
const resend = new Resend(resendApiKey);

export async function POST(request: NextRequest) {
  try {
    // Check if we have a valid API key at runtime
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'placeholder-key') {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, html, text } = await request.json();

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and either html or text' },
        { status: 400 }
      );
    }

    // Get user's organization for from email
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const { data: organization } = await supabase
      .from('organizations')
      .select('name, email')
      .eq('id', profile.organization_id)
      .single();

    const fromEmail = organization?.email || 'noreply@atlasfitness.co.uk';
    const fromName = organization?.name || 'Atlas Fitness';

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log email in database
    await supabase.from('email_logs').insert({
      organization_id: profile.organization_id,
      to_email: to,
      from_email: fromEmail,
      subject,
      body: html || text,
      status: 'sent',
      message_id: data?.id,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}