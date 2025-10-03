import { ActionConfig, ExecutionContext, NodeExecutionResult } from '../types';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { sendEmail } from '@/app/lib/services/email/send-email';

export async function sendEmailAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  const supabase = createAdminClient();
  
  // Validate required parameters
  if (!parameters.to || !parameters.subject || !parameters.content) {
    throw new Error('Missing required email parameters: to, subject, content');
  }
  
  try {
    // Interpolate variables in email content
    const to = interpolateValue(parameters.to, context);
    const subject = interpolateValue(parameters.subject, context);
    const content = interpolateValue(parameters.content, context);
    const cc = parameters.cc ? interpolateValue(parameters.cc, context) : undefined;
    const bcc = parameters.bcc ? interpolateValue(parameters.bcc, context) : undefined;
    
    // Get organization email settings
    const { data: orgSettings } = await supabase
      .from('organization_settings')
      .select('email_provider, email_from_address, email_from_name')
      .eq('organization_id', context.organizationId)
      .single();
    
    const fromAddress = orgSettings?.email_from_address || 'noreply@atlasfitness.com';
    const fromName = orgSettings?.email_from_name || 'Atlas Fitness';
    
    // Send email
    const result = await sendEmail({
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      from: `${fromName} <${fromAddress}>`,
      subject,
      html: content,
      text: stripHtml(content),
      organizationId: context.organizationId,
      metadata: {
        workflowId: context.workflowId,
        executionId: context.executionId,
        nodeId: parameters.nodeId
      }
    });
    
    // Track email in activity log
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: context.organizationId,
        entity_type: 'workflow',
        entity_id: context.workflowId,
        action: 'email_sent',
        details: {
          to,
          subject,
          emailId: result.id,
          provider: result.provider
        },
        user_id: context.userId || 'system'
      });
    
    return {
      success: true,
      output: {
        emailId: result.id,
        provider: result.provider,
        sentAt: new Date().toISOString(),
        recipients: to
      }
    };
    
  } catch (error) {
    console.error('Email action failed:', error);
    return {
      success: false,
      error: error.message,
      output: {
        error: error.message,
        parameters
      }
    };
  }
}

function interpolateValue(template: string | any, context: ExecutionContext): any {
  if (typeof template !== 'string') return template;
  
  // Replace {{variable}} patterns with actual values
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let value = context;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    
    return value !== undefined ? String(value) : match;
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}