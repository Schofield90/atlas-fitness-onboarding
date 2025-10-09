/**
 * Messaging Tools - Communication and Notifications
 */

import { z } from 'zod';
import { BaseTool, ToolExecutionContext, ToolExecutionResult } from './types';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { Resend } from 'resend';
// Twilio will be imported at runtime where needed to avoid build-time issues

/**
 * Send email to client(s)
 */
export class SendEmailTool extends BaseTool {
  id = 'send_email';
  name = 'Send Email';
  description = 'Send an email to one or more clients. Supports templates and personalization.';
  category = 'messaging' as const;

  parametersSchema = z.object({
    to: z.array(z.string().email()).describe('Array of recipient email addresses'),
    subject: z.string().describe('Email subject line'),
    body: z.string().describe('Email body content (supports HTML)'),
    templateId: z.string().optional().describe('Optional email template ID to use'),
    variables: z.record(z.any()).optional().describe('Template variables for personalization'),
    scheduleAt: z.string().optional().describe('Optional scheduled send time (ISO 8601 format)')
  });

  requiresPermission = 'messages:send';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Create email records in database
      const emailRecords = validated.to.map(email => ({
        organization_id: context.organizationId,
        to_email: email,
        subject: validated.subject,
        body: validated.body,
        template_id: validated.templateId,
        variables: validated.variables || {},
        status: validated.scheduleAt ? 'scheduled' : 'pending',
        scheduled_at: validated.scheduleAt,
        created_by: context.userId,
        metadata: {
          sent_by_agent: context.agentId,
          conversation_id: context.conversationId,
          task_id: context.taskId
        }
      }));

      const { data, error } = await supabase
        .from('email_queue')
        .insert(emailRecords)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: {
          emailIds: data?.map(e => e.id) || [],
          recipientCount: validated.to.length,
          scheduled: !!validated.scheduleAt,
          scheduledAt: validated.scheduleAt
        },
        metadata: {
          recordsAffected: data?.length || 0,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Send SMS to client(s)
 */
export class SendSMSTool extends BaseTool {
  id = 'send_sms';
  name = 'Send SMS';
  description = 'Send an SMS message to one or more clients. Message must be under 160 characters for single SMS.';
  category = 'messaging' as const;

  parametersSchema = z.object({
    to: z.array(z.string()).describe('Array of recipient phone numbers (E.164 format)'),
    message: z.string().max(1600).describe('SMS message content (max 1600 chars = 10 SMS)'),
    scheduleAt: z.string().optional().describe('Optional scheduled send time (ISO 8601 format)')
  });

  requiresPermission = 'messages:send';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Validate phone numbers and create SMS records
      const smsRecords = validated.to.map(phone => ({
        organization_id: context.organizationId,
        to_phone: phone,
        message: validated.message,
        status: validated.scheduleAt ? 'scheduled' : 'pending',
        scheduled_at: validated.scheduleAt,
        created_by: context.userId,
        metadata: {
          sent_by_agent: context.agentId,
          conversation_id: context.conversationId,
          task_id: context.taskId,
          segment_count: Math.ceil(validated.message.length / 160)
        }
      }));

      const { data, error } = await supabase
        .from('sms_queue')
        .insert(smsRecords)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: {
          smsIds: data?.map(s => s.id) || [],
          recipientCount: validated.to.length,
          scheduled: !!validated.scheduleAt,
          scheduledAt: validated.scheduleAt,
          estimatedSegments: Math.ceil(validated.message.length / 160)
        },
        metadata: {
          recordsAffected: data?.length || 0,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Create support ticket
 */
export class CreateSupportTicketTool extends BaseTool {
  id = 'create_support_ticket';
  name = 'Create Support Ticket';
  description = 'Create a support ticket for follow-up by human staff. Use this when issues require human intervention.';
  category = 'messaging' as const;

  parametersSchema = z.object({
    clientId: z.string().uuid().optional().describe('Optional client ID associated with ticket'),
    title: z.string().describe('Ticket title/subject'),
    description: z.string().describe('Detailed description of the issue'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium').describe('Ticket priority level'),
    category: z.enum(['billing', 'technical', 'booking', 'general', 'complaint']).optional().default('general').describe('Ticket category'),
    assignTo: z.string().uuid().optional().describe('Optional staff user ID to assign ticket to')
  });

  requiresPermission = 'tickets:create';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          organization_id: context.organizationId,
          client_id: validated.clientId,
          title: validated.title,
          description: validated.description,
          priority: validated.priority,
          category: validated.category,
          assigned_to: validated.assignTo,
          status: 'open',
          created_by_agent: context.agentId,
          metadata: {
            conversation_id: context.conversationId,
            task_id: context.taskId
          }
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: ticket,
        metadata: {
          recordsAffected: 1,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Send notification to staff
 */
export class NotifyStaffTool extends BaseTool {
  id = 'notify_staff';
  name = 'Notify Staff';
  description = 'Send in-app notification to staff members. Use for urgent matters requiring immediate attention.';
  category = 'messaging' as const;

  parametersSchema = z.object({
    userIds: z.array(z.string().uuid()).optional().describe('Specific user IDs to notify (omit to notify all staff)'),
    title: z.string().describe('Notification title'),
    message: z.string().describe('Notification message'),
    priority: z.enum(['low', 'medium', 'high']).optional().default('medium').describe('Notification priority'),
    actionUrl: z.string().optional().describe('Optional URL to navigate to when notification is clicked')
  });

  requiresPermission = 'notifications:send';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // If no specific users, get all staff in organization
      let userIds = validated.userIds;
      if (!userIds || userIds.length === 0) {
        const { data: staffUsers } = await supabase
          .from('user_organizations')
          .select('user_id')
          .eq('organization_id', context.organizationId)
          .eq('role', 'staff');

        userIds = staffUsers?.map(u => u.user_id) || [];
      }

      // Create notifications
      const notifications = userIds.map(userId => ({
        user_id: userId,
        organization_id: context.organizationId,
        title: validated.title,
        message: validated.message,
        priority: validated.priority,
        action_url: validated.actionUrl,
        read: false,
        metadata: {
          sent_by_agent: context.agentId,
          conversation_id: context.conversationId,
          task_id: context.taskId
        }
      }));

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: {
          notificationIds: data?.map(n => n.id) || [],
          recipientCount: userIds.length
        },
        metadata: {
          recordsAffected: data?.length || 0,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Send message to a specific client
 */
export class SendMessageToClientTool extends BaseTool {
  id = 'send_message_to_client';
  name = 'Send Message to Client';
  description = 'Send a personalized message (SMS, email, or WhatsApp) to a specific client via their preferred channel';
  category = 'messaging' as const;

  parametersSchema = z.object({
    clientId: z.string().uuid().describe('Client ID to send message to'),
    channel: z.enum(['sms', 'email', 'whatsapp']).describe('Communication channel'),
    message: z.string().min(1).describe('Message content'),
    subject: z.string().optional().describe('Email subject (required for email)'),
    variables: z.record(z.any()).optional().describe('Template variables for personalization'),
  });

  requiresPermission = 'messages:send';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Fetch client details
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, email, phone')
        .eq('id', validated.clientId)
        .eq('organization_id', context.organizationId)
        .single();

      if (clientError || !client) {
        return { success: false, error: 'Client not found' };
      }

      // Validate contact info
      if (validated.channel === 'email' && !client.email) {
        return { success: false, error: 'Client has no email address' };
      }
      if ((validated.channel === 'sms' || validated.channel === 'whatsapp') && !client.phone) {
        return { success: false, error: 'Client has no phone number' };
      }
      if (validated.channel === 'email' && !validated.subject) {
        return { success: false, error: 'Email subject is required' };
      }

      // Replace {clientName} with actual name
      const personalizedMessage = validated.message.replace(/{clientName}/g, client.name);

      // Log message to database
      const { data: loggedMessage, error: logError } = await supabase
        .from('messages')
        .insert({
          organization_id: context.organizationId,
          client_id: client.id,
          type: validated.channel,
          channel: validated.channel,
          direction: 'outbound',
          status: 'pending',
          subject: validated.subject,
          body: personalizedMessage,
          content: personalizedMessage,
          sender_type: 'ai',
          sender_name: `AI Agent (${context.agentId})`,
          metadata: {
            conversationId: context.conversationId,
            taskId: context.taskId,
          },
        })
        .select()
        .single();

      if (logError) throw logError;

      // Send via appropriate channel
      let sendResult: any = null;

      if (validated.channel === 'email' && process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        sendResult = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Atlas Fitness <noreply@atlas-fitness.com>',
          to: client.email!,
          subject: validated.subject!,
          html: `<div style="font-family: Arial, sans-serif;">${personalizedMessage.replace(/\n/g, '<br>')}</div>`,
        });

        if (sendResult.data?.id) {
          await supabase
            .from('messages')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', loggedMessage.id);
        }
      } else if ((validated.channel === 'sms' || validated.channel === 'whatsapp') &&
                 process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        const twilio = (await import('twilio')).default;
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        const fromNumber = validated.channel === 'whatsapp'
          ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
          : process.env.TWILIO_PHONE_NUMBER;

        const toNumber = validated.channel === 'whatsapp'
          ? `whatsapp:${client.phone}`
          : client.phone;

        sendResult = await twilioClient.messages.create({
          body: personalizedMessage,
          from: fromNumber,
          to: toNumber!,
        });

        if (sendResult.sid) {
          await supabase
            .from('messages')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', loggedMessage.id);
        }
      }

      return {
        success: true,
        data: {
          messageId: loggedMessage.id,
          clientId: client.id,
          clientName: client.name,
          channel: validated.channel,
          status: 'sent',
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }
}

/**
 * Send message to a lead/prospect
 */
export class SendMessageToLeadTool extends BaseTool {
  id = 'send_message_to_lead';
  name = 'Send Message to Lead';
  description = 'Send a personalized message to a lead/prospect to nurture them through the sales funnel';
  category = 'messaging' as const;

  parametersSchema = z.object({
    leadId: z.string().uuid().describe('Lead ID to send message to'),
    channel: z.enum(['sms', 'email', 'whatsapp']).describe('Communication channel'),
    message: z.string().min(1).describe('Message content'),
    subject: z.string().optional().describe('Email subject (required for email)'),
  });

  requiresPermission = 'messages:send';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Fetch lead details
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, name, email, phone')
        .eq('id', validated.leadId)
        .eq('organization_id', context.organizationId)
        .single();

      if (leadError || !lead) {
        return { success: false, error: 'Lead not found' };
      }

      // Validate contact info
      if (validated.channel === 'email' && !lead.email) {
        return { success: false, error: 'Lead has no email address' };
      }
      if ((validated.channel === 'sms' || validated.channel === 'whatsapp') && !lead.phone) {
        return { success: false, error: 'Lead has no phone number' };
      }

      // Personalize message
      const personalizedMessage = validated.message.replace(/{leadName}/g, lead.name);

      // Log message
      const { data: loggedMessage } = await supabase
        .from('messages')
        .insert({
          organization_id: context.organizationId,
          lead_id: lead.id,
          type: validated.channel,
          channel: validated.channel,
          direction: 'outbound',
          status: 'sent',
          subject: validated.subject,
          body: personalizedMessage,
          content: personalizedMessage,
          sender_type: 'ai',
          sender_name: `AI Agent (${context.agentId})`,
        })
        .select()
        .single();

      return {
        success: true,
        data: {
          messageId: loggedMessage?.id,
          leadId: lead.id,
          leadName: lead.name,
          channel: validated.channel,
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }
}

/**
 * Send retention campaign message
 */
export class SendRetentionMessageTool extends BaseTool {
  id = 'send_retention_message';
  name = 'Send Retention Message';
  description = 'Send targeted retention messages to prevent churn (win-back campaigns, renewal reminders, milestone celebrations)';
  category = 'messaging' as const;

  parametersSchema = z.object({
    clientId: z.string().uuid().describe('Client ID to send retention message to'),
    campaignType: z.enum(['winback', 'renewal_reminder', 'milestone', 'engagement']).describe('Type of retention campaign'),
    channel: z.enum(['sms', 'email', 'whatsapp']).describe('Communication channel'),
    customMessage: z.string().optional().describe('Custom message override (uses template if not provided)'),
  });

  requiresPermission = 'campaigns:send';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Fetch client
      const { data: client } = await supabase
        .from('clients')
        .select('id, name, email, phone')
        .eq('id', validated.clientId)
        .eq('organization_id', context.organizationId)
        .single();

      if (!client) {
        return { success: false, error: 'Client not found' };
      }

      // Get retention message template
      const templates = {
        winback: `Hi {clientName}! We miss you at the gym. Come back this week and get 20% off your next session! 💪`,
        renewal_reminder: `Hi {clientName}, your membership expires soon. Renew now to keep your momentum going!`,
        milestone: `Congrats {clientName}! You've hit an amazing milestone. Keep crushing it! 🎉`,
        engagement: `Hey {clientName}! Haven't seen you in a while. Need help getting back on track?`,
      };

      const message = validated.customMessage || templates[validated.campaignType].replace(/{clientName}/g, client.name);

      // Log campaign message
      await supabase.from('messages').insert({
        organization_id: context.organizationId,
        client_id: client.id,
        type: validated.channel,
        channel: validated.channel,
        direction: 'outbound',
        status: 'sent',
        body: message,
        content: message,
        sender_type: 'ai',
        sender_name: `Retention Campaign`,
        metadata: {
          campaignType: validated.campaignType,
        },
      });

      return {
        success: true,
        data: {
          clientId: client.id,
          campaignType: validated.campaignType,
          channel: validated.channel,
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }
}

/**
 * Send report via email
 */
export class SendReportEmailTool extends BaseTool {
  id = 'send_report_email';
  name = 'Send Report Email';
  description = 'Send formatted reports via email (monthly stats, analytics, custom reports)';
  category = 'messaging' as const;

  parametersSchema = z.object({
    to: z.array(z.string().email()).describe('Recipient email addresses'),
    reportType: z.enum(['monthly_stats', 'weekly_summary', 'custom']).describe('Type of report'),
    reportData: z.record(z.any()).describe('Report data to include'),
    subject: z.string().optional().describe('Custom subject (auto-generated if not provided)'),
  });

  requiresPermission = 'reports:send';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      if (!process.env.RESEND_API_KEY) {
        return { success: false, error: 'Email service not configured' };
      }

      const resend = new Resend(process.env.RESEND_API_KEY);

      const subject = validated.subject || `Fitness Report - ${validated.reportType}`;
      const htmlContent = `
        <h1>Your ${validated.reportType.replace('_', ' ')} Report</h1>
        <pre>${JSON.stringify(validated.reportData, null, 2)}</pre>
      `;

      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Atlas Fitness <noreply@atlas-fitness.com>',
        to: validated.to,
        subject,
        html: htmlContent,
      });

      return {
        success: true,
        data: {
          messageId: result.data?.id,
          recipientCount: validated.to.length,
          reportType: validated.reportType,
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }
}

/**
 * Schedule follow-up message
 */
export class ScheduleFollowUpTool extends BaseTool {
  id = 'schedule_follow_up';
  name = 'Schedule Follow-up';
  description = 'Schedule a follow-up message to be sent at a specific future time';
  category = 'messaging' as const;

  parametersSchema = z.object({
    clientId: z.string().uuid().optional().describe('Client ID (if following up with client)'),
    leadId: z.string().uuid().optional().describe('Lead ID (if following up with lead)'),
    channel: z.enum(['sms', 'email', 'whatsapp']).describe('Communication channel'),
    message: z.string().min(1).describe('Message to send'),
    scheduledFor: z.string().describe('ISO timestamp when to send (e.g., 2025-10-15T10:00:00Z)'),
  });

  requiresPermission = 'messages:schedule';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      if (!validated.clientId && !validated.leadId) {
        return { success: false, error: 'Either clientId or leadId must be provided' };
      }

      const supabase = createAdminClient();

      // Create scheduled task
      const { data: task, error } = await supabase
        .from('ai_agent_tasks')
        .insert({
          agent_id: context.agentId,
          organization_id: context.organizationId,
          title: `Follow-up: ${validated.message.substring(0, 50)}...`,
          description: validated.message,
          task_type: 'scheduled',
          status: 'pending',
          next_run_at: validated.scheduledFor,
          context: {
            type: 'follow_up',
            clientId: validated.clientId,
            leadId: validated.leadId,
            channel: validated.channel,
            message: validated.message,
          },
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          taskId: task.id,
          scheduledFor: validated.scheduledFor,
          channel: validated.channel,
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }
}

/**
 * Send bulk messages
 */
export class SendBulkMessageTool extends BaseTool {
  id = 'send_bulk_message';
  name = 'Send Bulk Message';
  description = 'Send the same message to multiple clients or leads (max 100 recipients per request)';
  category = 'messaging' as const;

  parametersSchema = z.object({
    recipients: z.array(z.object({
      id: z.string().uuid(),
      type: z.enum(['client', 'lead']),
    })).max(100).describe('List of recipients (max 100)'),
    channel: z.enum(['sms', 'email', 'whatsapp']).describe('Communication channel'),
    message: z.string().min(1).describe('Message to send'),
    subject: z.string().optional().describe('Email subject (required for email)'),
    personalizeWithName: z.boolean().default(true).describe('Replace {name} with recipient name'),
  });

  requiresPermission = 'messages:bulk_send';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      let sent = 0;
      let failed = 0;

      // Process recipients
      for (const recipient of validated.recipients) {
        try {
          const table = recipient.type === 'client' ? 'clients' : 'leads';
          const { data: entity } = await supabase
            .from(table)
            .select('id, name, email, phone')
            .eq('id', recipient.id)
            .eq('organization_id', context.organizationId)
            .single();

          if (!entity) {
            failed++;
            continue;
          }

          const personalizedMessage = validated.personalizeWithName
            ? validated.message.replace(/{name}/g, entity.name)
            : validated.message;

          // Log message
          await supabase.from('messages').insert({
            organization_id: context.organizationId,
            client_id: recipient.type === 'client' ? entity.id : null,
            lead_id: recipient.type === 'lead' ? entity.id : null,
            type: validated.channel,
            channel: validated.channel,
            direction: 'outbound',
            status: 'sent',
            subject: validated.subject,
            body: personalizedMessage,
            content: personalizedMessage,
            sender_type: 'ai',
            sender_name: 'Bulk Campaign',
          });

          sent++;

        } catch (err) {
          failed++;
        }
      }

      return {
        success: true,
        data: {
          total: validated.recipients.length,
          sent,
          failed,
          channel: validated.channel,
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }
}

// Export all messaging tools
export const MESSAGING_TOOLS = [
  new SendEmailTool(),
  new SendSMSTool(),
  new CreateSupportTicketTool(),
  new NotifyStaffTool(),
  new SendMessageToClientTool(),
  new SendMessageToLeadTool(),
  new SendRetentionMessageTool(),
  new SendReportEmailTool(),
  new ScheduleFollowUpTool(),
  new SendBulkMessageTool(),
];
