import { ActionConfig, ExecutionContext, NodeExecutionResult } from '../types';
import { sendSMS, sendWhatsApp } from '@/app/lib/services/twilio/messaging';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function sendSMSAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  const supabase = createAdminClient();
  
  if (!parameters.to || !parameters.message) {
    throw new Error('Missing required SMS parameters: to, message');
  }
  
  try {
    const to = interpolateValue(parameters.to, context);
    const message = interpolateValue(parameters.message, context);
    
    // Format phone number
    const formattedPhone = formatPhoneNumber(to);
    
    // Send SMS
    const result = await sendSMS({
      to: formattedPhone,
      body: message,
      organizationId: context.organizationId,
      metadata: {
        workflowId: context.workflowId,
        executionId: context.executionId
      }
    });
    
    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: context.organizationId,
        entity_type: 'workflow',
        entity_id: context.workflowId,
        action: 'sms_sent',
        details: {
          to: formattedPhone,
          messageLength: message.length,
          sid: result.sid,
          status: result.status
        },
        user_id: 'system'
      });
    
    return {
      success: true,
      output: {
        sid: result.sid,
        status: result.status,
        to: formattedPhone,
        sentAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('SMS action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

export async function sendWhatsAppAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  const supabase = createAdminClient();
  
  if (!parameters.to || !parameters.message) {
    throw new Error('Missing required WhatsApp parameters: to, message');
  }
  
  try {
    const to = interpolateValue(parameters.to, context);
    const message = interpolateValue(parameters.message, context);
    const templateId = parameters.templateId;
    const mediaUrl = parameters.mediaUrl ? interpolateValue(parameters.mediaUrl, context) : undefined;
    
    // Format phone number
    const formattedPhone = formatPhoneNumber(to);
    
    // Send WhatsApp message
    const result = await sendWhatsApp({
      to: formattedPhone,
      body: message,
      templateId,
      mediaUrl,
      organizationId: context.organizationId,
      metadata: {
        workflowId: context.workflowId,
        executionId: context.executionId
      }
    });
    
    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: context.organizationId,
        entity_type: 'workflow',
        entity_id: context.workflowId,
        action: 'whatsapp_sent',
        details: {
          to: formattedPhone,
          hasMedia: !!mediaUrl,
          templateUsed: !!templateId,
          sid: result.sid,
          status: result.status
        },
        user_id: 'system'
      });
    
    return {
      success: true,
      output: {
        sid: result.sid,
        status: result.status,
        to: formattedPhone,
        sentAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('WhatsApp action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

function interpolateValue(template: string | any, context: ExecutionContext): any {
  if (typeof template !== 'string') return template;
  
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

function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present
  if (cleaned.length === 10) {
    return `+1${cleaned}`; // Assume US number
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('44')) {
    return `+${cleaned}`; // UK number
  }
  
  // Return as is if already formatted
  return phone.startsWith('+') ? phone : `+${cleaned}`;
}