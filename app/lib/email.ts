import { Resend } from 'resend';
import { createAdminClient } from './supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  organizationId?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  try {
    const { to, subject, html, organizationId } = options;
    
    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'Atlas Fitness <noreply@atlasfitness.com>',
      to,
      subject,
      html
    });

    if (error) {
      throw error;
    }

    // Log email to database
    if (organizationId) {
      const supabase = await createAdminClient();
      await supabase.from('email_logs').insert({
        to_email: to,
        subject,
        body: html,
        status: 'sent',
        organization_id: organizationId,
        message_id: data?.id
      });
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}