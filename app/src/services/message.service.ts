import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { Resend } from "resend";
import { Twilio } from "twilio";

// Lazy load services to prevent initialization during build
function getResendClient() {
  return process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;
}

function getTwilioClient() {
  return process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;
}

// Message schemas
export const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  template_id: z.string().optional(),
  variables: z.record(z.any()).optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.string(),
        type: z.string(),
      }),
    )
    .optional(),
});

export const smsSchema = z.object({
  to: z.string(),
  body: z.string().max(160),
  mediaUrl: z.string().url().optional(),
});

export const templateSchema = z.object({
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  variables: z.array(z.string()).default([]),
  category: z.string().optional(),
});

export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  category?: string;
}

export interface MessageStatus {
  id: string;
  status: "pending" | "sent" | "delivered" | "failed" | "bounced";
  sentAt?: Date;
  error?: string;
}

class MessageService {
  // Send email
  async sendEmail(
    orgId: string,
    to: string,
    subject: string,
    body: string,
    templateId?: string,
  ): Promise<string> {
    const supabase = await createClient();

    // Get organization settings
    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", orgId)
      .single();

    const fromEmail = org?.settings?.email_from || "noreply@atlas-fitness.com";
    const fromName = org?.settings?.email_from_name || "Atlas Fitness";

    // If template is provided, load it
    let finalSubject = subject;
    let finalBody = body;

    if (templateId) {
      const template = await this.getTemplate(orgId, templateId);
      if (template) {
        finalSubject = template.subject;
        finalBody = template.body;
      }
    }

    // Save to database first
    const { data: message, error: dbError } = await supabase
      .from("messages")
      .insert({
        org_id: orgId,
        recipient: to,
        channel: "email",
        template_id: templateId,
        subject: finalSubject,
        body: finalBody,
        status: "pending",
      })
      .select("id")
      .single();

    if (dbError) throw dbError;

    // Send via Resend
    const resend = getResendClient();
    if (resend) {
      try {
        const { data, error } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [to],
          subject: finalSubject,
          html: this.convertToHtml(finalBody),
        });

        if (error) throw error;

        // Update status
        await supabase
          .from("messages")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            metadata: { resend_id: data?.id },
          })
          .eq("id", message.id);
      } catch (error) {
        // Update status to failed
        await supabase
          .from("messages")
          .update({
            status: "failed",
            metadata: {
              error: error instanceof Error ? error.message : "Unknown error",
            },
          })
          .eq("id", message.id);

        throw error;
      }
    }

    return message.id;
  }

  // Send SMS
  async sendSMS(
    orgId: string,
    to: string,
    body: string,
    mediaUrl?: string,
  ): Promise<string> {
    const supabase = await createClient();

    // Normalize phone number
    const normalizedPhone = this.normalizePhoneNumber(to);

    // Save to database first
    const { data: message, error: dbError } = await supabase
      .from("messages")
      .insert({
        org_id: orgId,
        recipient: normalizedPhone,
        channel: "sms",
        body,
        status: "pending",
        metadata: { media_url: mediaUrl },
      })
      .select("id")
      .single();

    if (dbError) throw dbError;

    // Send via Twilio
    const twilio = getTwilioClient();
    if (twilio) {
      try {
        const messageData: any = {
          body,
          to: normalizedPhone,
          from: process.env.TWILIO_SMS_FROM,
        };

        if (mediaUrl) {
          messageData.mediaUrl = [mediaUrl];
        }

        const twilioMessage = await twilio.messages.create(messageData);

        // Update status
        await supabase
          .from("messages")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            metadata: { twilio_sid: twilioMessage.sid },
          })
          .eq("id", message.id);
      } catch (error) {
        // Update status to failed
        await supabase
          .from("messages")
          .update({
            status: "failed",
            metadata: {
              error: error instanceof Error ? error.message : "Unknown error",
            },
          })
          .eq("id", message.id);

        throw error;
      }
    }

    return message.id;
  }

  // Send WhatsApp
  async sendWhatsApp(
    orgId: string,
    to: string,
    body: string,
    mediaUrl?: string,
  ): Promise<string> {
    const supabase = await createClient();

    // Normalize phone number
    const normalizedPhone = this.normalizePhoneNumber(to);

    // Save to database first
    const { data: message, error: dbError } = await supabase
      .from("messages")
      .insert({
        org_id: orgId,
        recipient: normalizedPhone,
        channel: "whatsapp",
        body,
        status: "pending",
        metadata: { media_url: mediaUrl },
      })
      .select("id")
      .single();

    if (dbError) throw dbError;

    // Send via Twilio WhatsApp
    const twilio = getTwilioClient();
    if (twilio) {
      try {
        const messageData: any = {
          body,
          to: `whatsapp:${normalizedPhone}`,
          from: process.env.TWILIO_WHATSAPP_FROM,
        };

        if (mediaUrl) {
          messageData.mediaUrl = [mediaUrl];
        }

        const twilioMessage = await twilio.messages.create(messageData);

        // Update status
        await supabase
          .from("messages")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            metadata: { twilio_sid: twilioMessage.sid },
          })
          .eq("id", message.id);
      } catch (error) {
        // Update status to failed
        await supabase
          .from("messages")
          .update({
            status: "failed",
            metadata: {
              error: error instanceof Error ? error.message : "Unknown error",
            },
          })
          .eq("id", message.id);

        throw error;
      }
    }

    return message.id;
  }

  // Create email template
  async createTemplate(
    orgId: string,
    data: z.infer<typeof templateSchema>,
  ): Promise<string> {
    const supabase = await createClient();

    const validated = templateSchema.parse(data);

    // Extract variables from template
    const variables = this.extractTemplateVariables(validated.body);

    const { data: template, error } = await supabase
      .from("email_templates")
      .insert({
        org_id: orgId,
        ...validated,
        variables,
      })
      .select("id")
      .single();

    if (error) throw error;

    return template.id;
  }

  // Get template
  async getTemplate(
    orgId: string,
    templateId: string,
  ): Promise<MessageTemplate | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", templateId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      subject: data.subject,
      body: data.body,
      variables: data.variables || [],
      category: data.category,
    };
  }

  // Get all templates
  async getTemplates(orgId: string, category?: string) {
    const supabase = await createClient();

    let query = supabase
      .from("email_templates")
      .select("*")
      .eq("org_id", orgId)
      .eq("is_active", true);

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query.order("name");

    if (error) throw error;

    return (
      data?.map((t) => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        body: t.body,
        variables: t.variables || [],
        category: t.category,
      })) || []
    );
  }

  // Get message status
  async getMessageStatus(messageId: string): Promise<MessageStatus> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("messages")
      .select("id, status, sent_at")
      .eq("id", messageId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      status: data.status,
      sentAt: data.sent_at ? new Date(data.sent_at) : undefined,
    };
  }

  // Get message history
  async getMessageHistory(
    orgId: string,
    filter?: {
      recipient?: string;
      channel?: "email" | "sms" | "whatsapp";
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    page = 1,
    limit = 50,
  ) {
    const supabase = await createClient();

    let query = supabase
      .from("messages")
      .select("*", { count: "exact" })
      .eq("org_id", orgId);

    if (filter?.recipient) {
      query = query.eq("recipient", filter.recipient);
    }

    if (filter?.channel) {
      query = query.eq("channel", filter.channel);
    }

    if (filter?.status) {
      query = query.eq("status", filter.status);
    }

    if (filter?.dateFrom) {
      query = query.gte("created_at", filter.dateFrom.toISOString());
    }

    if (filter?.dateTo) {
      query = query.lte("created_at", filter.dateTo.toISOString());
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  // Render template with variables
  renderTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = variables[key.trim()];
      return value !== undefined ? String(value) : match;
    });
  }

  // Extract template variables
  private extractTemplateVariables(template: string): string[] {
    const matches = template.match(/\{\{([^}]+)\}\}/g) || [];
    const variables = matches.map((m) => m.replace(/\{\{|\}\}/g, "").trim());
    return [...new Set(variables)];
  }

  // Convert markdown-style text to HTML
  private convertToHtml(text: string): string {
    // Basic conversion for email formatting
    return text
      .split("\n\n")
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
      .join("\n");
  }

  // Normalize phone numbers to E.164 format
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, "");

    // Handle UK numbers
    if (cleaned.startsWith("44")) {
      cleaned = "+" + cleaned;
    } else if (cleaned.startsWith("07")) {
      cleaned = "+44" + cleaned.substring(1);
    } else if (!cleaned.startsWith("+")) {
      // Assume UK if no country code
      if (cleaned.startsWith("7") && cleaned.length === 10) {
        cleaned = "+44" + cleaned;
      } else {
        cleaned = "+" + cleaned;
      }
    }

    return cleaned;
  }

  // Bulk send messages
  async bulkSend(
    orgId: string,
    recipients: string[],
    channel: "email" | "sms" | "whatsapp",
    subject: string,
    body: string,
    templateId?: string,
  ): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const promises = batch.map(async (recipient) => {
        try {
          if (channel === "email") {
            await this.sendEmail(orgId, recipient, subject, body, templateId);
          } else if (channel === "sms") {
            await this.sendSMS(orgId, recipient, body);
          } else if (channel === "whatsapp") {
            await this.sendWhatsApp(orgId, recipient, body);
          }
          results.success++;
        } catch (error) {
          results.failed++;
          console.error(`Failed to send ${channel} to ${recipient}:`, error);
        }
      });

      await Promise.allSettled(promises);

      // Rate limit between batches
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // Get delivery stats
  async getDeliveryStats(orgId: string, days = 30) {
    const supabase = await createClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from("messages")
      .select("channel, status, created_at")
      .eq("org_id", orgId)
      .gte("created_at", startDate.toISOString());

    const stats = {
      total: data?.length || 0,
      byChannel: {
        email: { sent: 0, delivered: 0, failed: 0, bounced: 0 },
        sms: { sent: 0, delivered: 0, failed: 0 },
        whatsapp: { sent: 0, delivered: 0, failed: 0 },
      },
      byDay: {} as Record<string, number>,
    };

    data?.forEach((message) => {
      const channel = message.channel as keyof typeof stats.byChannel;
      const status = message.status;

      if (stats.byChannel[channel] && status in stats.byChannel[channel]) {
        (stats.byChannel[channel] as any)[status]++;
      }

      // Group by day
      const day = message.created_at.split("T")[0];
      stats.byDay[day] = (stats.byDay[day] || 0) + 1;
    });

    return stats;
  }
}

export const messageService = new MessageService();
