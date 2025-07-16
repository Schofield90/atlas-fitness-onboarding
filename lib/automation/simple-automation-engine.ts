// Simple Automation Engine - Focus on Core Gym Needs
// No complex visual workflows, just proven automation templates

import { supabaseAdmin } from '@/lib/supabase';
import { twilioService } from '@/lib/sms/twilio-service';
import { 
  AutomationResult, 
  LeadFollowUpConfig,
  DormantMemberConfig
} from '@/lib/types/simple-automation';

export class SimpleAutomationEngine {
  
  // ========================================
  // MAIN ENTRY POINTS FOR AUTOMATION TRIGGERS
  // ========================================

  /**
   * Process new lead - THE MOST IMPORTANT automation for gyms
   * Must respond within 5 minutes to maximize conversion
   */
  static async processNewLead(leadId: string): Promise<AutomationResult> {
    const startTime = Date.now();
    const smsCount = 0;
    const emailCount = 0;
    const taskCount = 0;

    try {
      // Get lead details
      const { data: lead, error: leadError } = await supabaseAdmin
        .from('leads')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('id', leadId)
        .single();

      if (leadError || !lead) {
        throw new Error('Lead not found');
      }

      // Check if lead follow-up automation is active
      const { data: automation } = await supabaseAdmin
        .from('gym_automations')
        .select(`
          *,
          template:automation_templates(*)
        `)
        .eq('organization_id', lead.organization_id)
        .eq('template.template_key', 'lead_follow_up')
        .eq('is_active', true)
        .single();

      if (!automation) {
        console.log('Lead follow-up automation not active for this gym');
        return { success: true, actions_completed: 0, sms_sent: 0, emails_sent: 0, tasks_created: 0, execution_time_ms: Date.now() - startTime };
      }

      // Create execution record
      const { data: execution } = await supabaseAdmin
        .from('automation_executions')
        .insert({
          organization_id: lead.organization_id,
          automation_id: automation.id,
          template_key: 'lead_follow_up',
          lead_id: leadId,
          status: 'running',
          total_steps: 3,
          context: { lead, config: automation.config }
        })
        .select()
        .single();

      if (!execution) throw new Error('Failed to create execution record');

      const config = automation.config as LeadFollowUpConfig;

      // Step 1: Send immediate SMS (within 5 minutes)
      await this.scheduleAction({
        executionId: execution.id,
        action: 'sms',
        delayMinutes: config.sms_delay_minutes || 5,
        leadId,
        config: {
          message: this.personalizeMessage(config.sms_message, { lead, gym: lead.organization }),
          phone: lead.phone
        }
      });

      // Step 2: Follow-up email if no response
      await this.scheduleAction({
        executionId: execution.id,
        action: 'email',
        delayMinutes: (config.email_delay_hours || 2) * 60,
        leadId,
        config: {
          subject: this.personalizeMessage(config.email_subject, { lead, gym: lead.organization }),
          message: config.email_template || `Hi ${lead.first_name}, thanks for your interest in ${lead.organization.name}...`,
          email: lead.email
        }
      });

      // Step 3: Create staff task if no response
      await this.scheduleAction({
        executionId: execution.id,
        action: 'task',
        delayMinutes: (config.task_delay_hours || 24) * 60,
        leadId,
        config: {
          title: this.personalizeMessage(config.task_message, { lead, gym: lead.organization }),
          assigned_to: config.assigned_user_id,
          priority: 'high'
        }
      });

      // Create lead response tracking record
      await supabaseAdmin
        .from('lead_response_tracking')
        .insert({
          organization_id: lead.organization_id,
          lead_id: leadId,
          lead_created_at: lead.created_at,
          basic_score: this.calculateBasicLeadScore(lead)
        });

      // Update execution as completed
      await supabaseAdmin
        .from('automation_executions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          actions_completed: 3
        })
        .eq('id', execution.id);

      // Update automation stats
      await supabaseAdmin
        .from('gym_automations')
        .update({ 
          triggered_count: automation.triggered_count + 1,
          successful_count: automation.successful_count + 1,
          last_triggered: new Date().toISOString()
        })
        .eq('id', automation.id);

      return {
        success: true,
        actions_completed: 3,
        sms_sent: 1,
        emails_sent: 1,
        tasks_created: 1,
        execution_time_ms: Date.now() - startTime
      };

    } catch (error) {
      console.error('Error processing new lead automation:', error);
      return {
        success: false,
        actions_completed: 0,
        sms_sent: smsCount,
        emails_sent: emailCount,
        tasks_created: taskCount,
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Process dormant member re-engagement
   */
  static async processDormantMember(clientId: string): Promise<AutomationResult> {
    const startTime = Date.now();

    try {
      // Get client details
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select(`
          *,
          organization:organizations(*),
          memberships!inner(status, last_visit)
        `)
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        throw new Error('Client not found');
      }

      // Check if dormant member automation is active
      const { data: automation } = await supabaseAdmin
        .from('gym_automations')
        .select('*')
        .eq('organization_id', client.organization_id)
        .eq('template_key', 'dormant_member')
        .eq('is_active', true)
        .single();

      if (!automation) {
        return { success: true, actions_completed: 0, sms_sent: 0, emails_sent: 0, tasks_created: 0, execution_time_ms: Date.now() - startTime };
      }

      const config = automation.config as DormantMemberConfig;
      
      // Calculate days since last visit
      const lastVisit = client.memberships?.[0]?.last_visit;
      if (!lastVisit) return { success: true, actions_completed: 0, sms_sent: 0, emails_sent: 0, tasks_created: 0, execution_time_ms: Date.now() - startTime };

      const daysSinceVisit = Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24));

      // Schedule appropriate follow-up based on inactivity duration
      if (daysSinceVisit >= config.inactive_days && daysSinceVisit < config.offer_days) {
        // Send check-in SMS
        await this.sendSMS({
          phone: client.phone,
          message: this.personalizeMessage(config.checkin_sms, { member: client, gym: client.organization }),
          templateKey: 'dormant_member',
          clientId,
          organizationId: client.organization_id
        });
      } else if (daysSinceVisit >= config.offer_days && daysSinceVisit < config.final_days) {
        // Send offer SMS
        await this.sendSMS({
          phone: client.phone,
          message: this.personalizeMessage(config.offer_sms, { member: client, gym: client.organization }),
          templateKey: 'dormant_member',
          clientId,
          organizationId: client.organization_id
        });
      } else if (daysSinceVisit >= config.final_days) {
        // Final outreach
        await this.sendSMS({
          phone: client.phone,
          message: this.personalizeMessage(config.final_message, { member: client, gym: client.organization }),
          templateKey: 'dormant_member',
          clientId,
          organizationId: client.organization_id
        });
      }

      return {
        success: true,
        actions_completed: 1,
        sms_sent: 1,
        emails_sent: 0,
        tasks_created: 0,
        execution_time_ms: Date.now() - startTime
      };

    } catch (error) {
      console.error('Error processing dormant member automation:', error);
      return {
        success: false,
        actions_completed: 0,
        sms_sent: 0,
        emails_sent: 0,
        tasks_created: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: Date.now() - startTime
      };
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Schedule an automation action (SMS, email, task)
   */
  private static async scheduleAction(params: {
    executionId: string;
    action: 'sms' | 'email' | 'task';
    delayMinutes: number;
    leadId?: string;
    clientId?: string;
    config: Record<string, unknown>;
  }) {
    const scheduledFor = new Date(Date.now() + params.delayMinutes * 60 * 1000);

    await supabaseAdmin
      .from('automation_jobs')
      .insert({
        job_type: `${params.action}_${params.delayMinutes}min`,
        template_key: 'lead_follow_up',
        lead_id: params.leadId,
        client_id: params.clientId,
        scheduled_for: scheduledFor.toISOString(),
        job_data: {
          action: params.action,
          config: params.config,
          execution_id: params.executionId
        }
      });
  }

  /**
   * Send SMS immediately via Twilio
   */
  private static async sendSMS(params: {
    phone?: string;
    message: string;
    templateKey: string;
    leadId?: string;
    clientId?: string;
    organizationId?: string;
  }) {
    if (!params.phone) return;

    try {
      // Send SMS via Twilio
      const result = await twilioService.sendSMS({
        to: params.phone,
        message: params.message,
        organization_id: params.organizationId,
        lead_id: params.leadId,
        client_id: params.clientId,
        template_key: params.templateKey
      });

      // Log SMS delivery to database
      await supabaseAdmin
        .from('sms_deliveries')
        .insert({
          organization_id: params.organizationId,
          lead_id: params.leadId,
          client_id: params.clientId,
          phone_number: params.phone,
          message_content: params.message,
          template_key: params.templateKey,
          status: result.delivery_status || 'pending',
          provider_message_id: result.message_sid,
          sent_at: result.success ? new Date().toISOString() : null,
          cost_pence: result.cost_pence || 5,
          provider_response: result.success ? { 
            status: result.status,
            message_sid: result.message_sid 
          } : { 
            error: result.error 
          }
        });

      if (result.success) {
        console.log(`SMS sent successfully: ${result.message_sid} to ${params.phone}`);
      } else {
        console.error(`SMS failed: ${result.error}`);
      }

    } catch (error) {
      console.error('Error sending SMS:', error);
      
      // Log failed SMS attempt
      await supabaseAdmin
        .from('sms_deliveries')
        .insert({
          organization_id: params.organizationId,
          lead_id: params.leadId,
          client_id: params.clientId,
          phone_number: params.phone,
          message_content: params.message,
          template_key: params.templateKey,
          status: 'failed',
          cost_pence: 0,
          provider_response: { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        });
    }
  }

  /**
   * Personalize message templates with dynamic content
   */
  private static personalizeMessage(template: string, context: Record<string, unknown>): string {
    let message = template;

    // Replace placeholders like {{lead.first_name}}
    message = message.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, entity, field) => {
      const entityData = context[entity] as Record<string, unknown>;
      return entityData?.[field]?.toString() || match;
    });

    // Replace simple placeholders like {{gym_name}}
    message = message.replace(/\{\{(\w+)\}\}/g, (match, field) => {
      return context[field]?.toString() || match;
    });

    return message;
  }

  /**
   * Calculate basic lead score (no AI, just simple rules)
   */
  private static calculateBasicLeadScore(lead: Record<string, unknown>): number {
    let score = 50; // Base score

    // Source quality (Facebook leads typically convert better)
    if (lead.source === 'facebook') score += 20;
    else if (lead.source === 'google') score += 15;
    else if (lead.source === 'website') score += 25;
    else if (lead.source === 'referral') score += 30;

    // Contact info completeness
    if (lead.phone) score += 15;
    if (lead.email) score += 10;

    // Time of day (leads during gym hours are more likely to convert)
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 10) score += 10; // Morning workout crowd
    else if (hour >= 17 && hour <= 21) score += 15; // Evening workout crowd

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Process scheduled automation jobs
   */
  static async processScheduledJobs(): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Get pending jobs that are due
      const { data: jobs, error } = await supabaseAdmin
        .from('automation_jobs')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', now)
        .limit(10);

      if (error) throw error;

      for (const job of jobs || []) {
        try {
          // Mark as processing
          await supabaseAdmin
            .from('automation_jobs')
            .update({ status: 'processing' })
            .eq('id', job.id);

          const jobData = job.job_data as { action: string; config: Record<string, unknown> };

          // Execute the action
          if (jobData.action === 'sms') {
            await this.sendSMS({
              phone: jobData.config.phone as string,
              message: jobData.config.message as string,
              templateKey: job.template_key,
              leadId: job.lead_id,
              clientId: job.client_id,
              organizationId: job.organization_id
            });
          } else if (jobData.action === 'email') {
            // TODO: Implement email sending
            console.log('Email action scheduled for:', jobData.config);
          } else if (jobData.action === 'task') {
            // TODO: Implement task creation
            console.log('Task action scheduled for:', jobData.config);
          }

          // Mark as completed
          await supabaseAdmin
            .from('automation_jobs')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);

        } catch (jobError) {
          console.error(`Error processing job ${job.id}:`, jobError);
          
          // Mark as failed
          await supabaseAdmin
            .from('automation_jobs')
            .update({ 
              status: 'failed',
              error_message: jobError instanceof Error ? jobError.message : 'Unknown error',
              attempts: job.attempts + 1
            })
            .eq('id', job.id);
        }
      }
    } catch (error) {
      console.error('Error processing scheduled jobs:', error);
    }
  }

  /**
   * Update lead response time when first contact is made
   */
  static async updateLeadResponseTime(leadId: string, contactType: 'sms' | 'email' | 'human'): Promise<void> {
    try {
      const contactField = `first_${contactType}_sent_at`;
      const timeField = `${contactType}_response_time_minutes`;

      // Get current tracking record
      const { data: tracking } = await supabaseAdmin
        .from('lead_response_tracking')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      if (tracking && !tracking[contactField]) {
        const responseTime = Math.floor(
          (Date.now() - new Date(tracking.lead_created_at).getTime()) / (1000 * 60)
        );

        await supabaseAdmin
          .from('lead_response_tracking')
          .update({
            [contactField]: new Date().toISOString(),
            [timeField]: responseTime
          })
          .eq('lead_id', leadId);
      }
    } catch (error) {
      console.error('Error updating lead response time:', error);
    }
  }
}

export default SimpleAutomationEngine;