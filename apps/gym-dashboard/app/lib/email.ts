import { Resend } from "resend";
import { createAdminClient } from "./supabase/admin";

// Lazy load Resend to prevent initialization during build
function getResendClient() {
  return process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

export async function sendEmail(options: SendEmailOptions) {
  try {
    const { to, subject, html, organizationId } = options;

    // Check if Resend is configured
    const resend = getResendClient();
    if (!resend) {
      console.warn("Resend API key not configured, skipping email send");
      return { success: false, error: "Email service not configured" };
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: "GymLeadHub <sam@gymleadhub.co.uk>",
      to,
      subject,
      html,
    });

    if (error) {
      throw error;
    }

    // Log email to database
    if (organizationId) {
      const supabase = await createAdminClient();
      await supabase.from("email_logs").insert({
        to_email: to,
        subject,
        body: html,
        status: "sent",
        organization_id: organizationId,
        message_id: data?.id,
      });
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
}
